// Copies the built decap-cms-app bundle out of node_modules into
// public/admin/decap/ so the CMS at /admin works without depending on a
// third-party CDN at runtime. Runs on `npm install` (postinstall) and
// before `npm run build`; the copied files are gitignored and rebuilt
// from the pinned npm dependency, not committed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Note: the `decap-cms-app` package's standalone bundle throws
// (`Cannot read properties of undefined (reading
// '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE')`)
// on load in current Chromium — an upstream packaging bug in that build.
// The `decap-cms` package (a superset that also includes the widget
// registry) loads and runs fine, so vendor that one instead.
const src = path.join(root, 'node_modules/decap-cms/dist');
const dest = path.join(root, 'public/admin/decap');

if (!fs.existsSync(src)) {
  console.warn('[vendor-decap-cms] node_modules/decap-cms not found, skipping (run npm install first)');
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
  if (entry.name.endsWith('.map')) continue; // skip sourcemaps, not needed to run the app
  const from = path.join(src, entry.name);
  const to = path.join(dest, entry.name);
  if (entry.isDirectory()) {
    fs.cpSync(from, to, { recursive: true, filter: (f) => !f.endsWith('.map') });
  } else {
    fs.copyFileSync(from, to);
  }
}

console.log('[vendor-decap-cms] copied decap-cms into public/admin/decap/');
