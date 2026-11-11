#!/bin/sh
# Server-side updater: pull the latest images and, for each service whose image
# changed, do a zero-downtime rolling swap: start the new container next to the
# old one, wait until it is healthy, then remove the old one. Finally remove old
# untagged versions of these images only.
# Run from cron, e.g.: */5 * * * * /opt/huize-dina/update.sh
set -eu

cd "$(dirname "$0")"

SERVICES="web oauth"
IMAGES="ghcr.io/amittgur-dev/huize_dina_website ghcr.io/amittgur-dev/huize_dina_oauth"
HEALTH_TIMEOUT=60   # seconds to wait for a new container to become healthy
DNS_GRACE=7         # > the parent nginx's `resolver ... valid=5s`

docker compose pull -q

roll() {
  SERVICE=$1
  OLD=$(docker compose ps -q "$SERVICE")

  # Not running yet: nothing to keep up, just start it.
  if [ -z "$OLD" ]; then
    docker compose up -d --no-deps "$SERVICE"
    return
  fi

  # Skip if every running container already uses the freshly pulled image.
  REF=$(docker inspect -f '{{.Config.Image}}' $(echo "$OLD" | head -n1))
  WANT=$(docker image inspect -f '{{.Id}}' "$REF")
  STALE=0
  for C in $OLD; do
    [ "$(docker inspect -f '{{.Image}}' "$C")" = "$WANT" ] || STALE=1
  done
  [ "$STALE" -eq 1 ] || return 0

  echo "$(date '+%F %T') rolling $SERVICE to $WANT"

  # Start one extra container with the new image next to the old one(s).
  COUNT=$(echo "$OLD" | wc -l | tr -d ' ')
  docker compose up -d --no-deps --no-recreate --scale "$SERVICE=$((COUNT + 1))" "$SERVICE"
  NEW=$(docker compose ps -q "$SERVICE" | grep -vxF "$OLD" || true)
  if [ -z "$NEW" ]; then
    echo "$(date '+%F %T') $SERVICE: failed to start new container" >&2
    return 1
  fi

  i=0
  until [ "$(docker inspect -f '{{.State.Health.Status}}' "$NEW")" = healthy ]; do
    i=$((i + 1))
    if [ "$i" -ge "$HEALTH_TIMEOUT" ]; then
      echo "$(date '+%F %T') $SERVICE: new container not healthy, keeping old one" >&2
      docker rm -f "$NEW" >/dev/null
      return 1
    fi
    sleep 1
  done

  # Let the parent nginx re-resolve the alias so it knows the new IP before
  # the old container goes away.
  sleep "$DNS_GRACE"

  # Graceful stop (nginx drains in-flight requests on SIGQUIT), then remove.
  docker stop $OLD >/dev/null
  docker rm $OLD >/dev/null
}

FAILED=0
for SERVICE in $SERVICES; do
  roll "$SERVICE" || FAILED=1
done

# Apply any compose-file changes (no-op when nothing differs).
[ "$FAILED" -eq 1 ] || docker compose up -d

for IMAGE in $IMAGES; do
  docker images "$IMAGE" --format '{{.ID}} {{.Tag}}' \
    | awk '$2=="<none>"{print $1}' \
    | xargs -r docker rmi 2>/dev/null || true
done

exit "$FAILED"
