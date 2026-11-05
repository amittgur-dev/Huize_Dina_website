#!/bin/sh
# Server-side updater: pull the latest image, restart the container if it
# changed, and remove old untagged versions of this image only.
# Run from cron, e.g.: */5 * * * * /opt/huize-dina/update.sh
set -eu

cd "$(dirname "$0")"

IMAGE=ghcr.io/amittgur-dev/huize_dina_website

docker compose pull -q
docker compose up -d

docker images "$IMAGE" --format '{{.ID}} {{.Tag}}' \
  | awk '$2=="<none>"{print $1}' \
  | xargs -r docker rmi
