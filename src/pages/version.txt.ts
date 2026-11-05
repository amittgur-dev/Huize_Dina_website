// Build stamp, served at /version.txt. The site is statically built, so this
// runs once per build — the timestamp tells you (or anyone debugging a stale
// deployment) exactly when the copy a server is handing out was built.
export function GET() {
  return new Response(`built ${new Date().toISOString()}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
