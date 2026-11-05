// Minimal GitHub OAuth provider for Decap CMS's `github` backend.
// Decap opens /oauth/auth in a popup; we send the editor to GitHub, then
// /oauth/callback exchanges the code for a token and hands it back to the
// CMS window via postMessage. No dependencies.
import http from 'node:http';
import crypto from 'node:crypto';

const {
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  SITE_ORIGIN = 'https://huizedina.nl',
  OAUTH_SCOPE = 'public_repo',
  PORT = '3000',
} = process.env;

if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
  console.error('OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET are required');
  process.exit(1);
}

const page = (status, payload) => `<!doctype html><html><body><script>
(function () {
  var msg = ${JSON.stringify(`authorization:github:${status}:${JSON.stringify(payload)}`)};
  function receive(e) {
    if (e.origin !== ${JSON.stringify(SITE_ORIGIN)}) return;
    window.opener.postMessage(msg, e.origin);
    window.removeEventListener('message', receive, false);
  }
  window.addEventListener('message', receive, false);
  window.opener.postMessage('authorizing:github', ${JSON.stringify(SITE_ORIGIN)});
})();
</script></body></html>`;

const send = (res, code, body, headers = {}) => {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/oauth/auth') {
      const state = crypto.randomBytes(16).toString('hex');
      const gh = new URL('https://github.com/login/oauth/authorize');
      gh.search = new URLSearchParams({
        client_id: OAUTH_CLIENT_ID,
        scope: OAUTH_SCOPE,
        state,
      });
      return send(res, 302, '', {
        Location: gh.toString(),
        'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/oauth; Max-Age=600`,
      });
    }

    if (url.pathname === '/oauth/callback') {
      const cookie = /(?:^|;\s*)oauth_state=([a-f0-9]+)/.exec(req.headers.cookie || '');
      const code = url.searchParams.get('code');
      if (!code || !cookie || cookie[1] !== url.searchParams.get('state')) {
        return send(res, 400, page('error', { message: 'Invalid OAuth state' }));
      }
      try {
        const r = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            client_id: OAUTH_CLIENT_ID,
            client_secret: OAUTH_CLIENT_SECRET,
            code,
          }),
        });
        const data = await r.json();
        if (!data.access_token) {
          return send(res, 401, page('error', { message: data.error_description || 'No token' }));
        }
        return send(res, 200, page('success', { token: data.access_token, provider: 'github' }));
      } catch (err) {
        console.error(err);
        return send(res, 502, page('error', { message: 'GitHub request failed' }));
      }
    }

    send(res, 404, 'Not found');
  })
  .listen(Number(PORT), () => console.log(`oauth listening on ${PORT}`));
