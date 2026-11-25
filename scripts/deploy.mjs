#!/usr/bin/env node
// Uploads dist/ to donya.dev on REG.RU shared hosting over FTP with TLS (the host has no SSH).
//
//   npm run deploy               build, then upload
//   node scripts/deploy.mjs      upload the current dist/ as it is
//     --dry-run                  only print what would be uploaded and removed
//     --ls[=path]                list a remote directory (to find the site's folder) and exit
//
// The login comes from ~/.netrc, which only the owner writes (chmod 600):
//   machine server282.hosting.reg.ru
//   login u3742203
//   password ...
// FTP_HOST and FTP_DIR override the host and the site's folder.
//
// Order: new and changed files first, index.html last (a visitor never gets a page whose scripts are not there yet),
// then the files the build no longer has are removed. `.well-known/` (Let's Encrypt's checks) is never touched.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const HOST = process.env.FTP_HOST ?? 'server282.hosting.reg.ru';
const DIR = process.env.FTP_DIR ?? 'www/donya.dev';
const SITE = 'https://donya.dev/';
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const LS = args.find((a) => a.startsWith('--ls'));
/** remote paths the deploy never removes */
const KEEP = [/^\.well-known(\/|$)/, /^cgi-bin(\/|$)/];
/** files whose names do not change with their content: always uploaded */
const ALWAYS = /(^|\/)(index\.html|room\.json|\.htaccess|robots\.txt)$/;

/** The login for a host from ~/.netrc. */
function netrc(host) {
  let text;
  try {
    text = readFileSync(join(homedir(), '.netrc'), 'utf8');
  } catch {
    throw new Error(`no ~/.netrc: add "machine ${host} login ... password ..." to it (chmod 600)`);
  }
  const t = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== 'machine' || t[i + 1] !== host) continue;
    const entry = {};
    for (let j = i + 2; j < t.length && t[j] !== 'machine' && t[j] !== 'default'; j += 2) entry[t[j]] = t[j + 1];
    if (entry.login && entry.password) return { user: entry.login, password: entry.password };
  }
  throw new Error(`~/.netrc has no login and password for ${host}`);
}

/** Every file under dir, as posix paths relative to it, with sizes. */
function localFiles(dir) {
  const out = new Map();
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      if (name === '.DS_Store') continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else out.set(relative(dir, p).split(sep).join('/'), st.size);
    }
  };
  walk(dir);
  return out;
}

/** Every file under the remote dir (relative posix paths, with sizes); `.well-known` and the like are left out. */
async function remoteFiles(client, dir) {
  const out = new Map();
  const walk = async (rel) => {
    for (const f of await client.list(rel ? posix.join(dir, rel) : dir)) {
      if (f.name === '.' || f.name === '..') continue;
      const p = rel ? `${rel}/${f.name}` : f.name;
      if (KEEP.some((re) => re.test(p))) continue;
      if (f.isDirectory) await walk(p);
      else out.set(p, f.size);
    }
  };
  await walk('');
  return out;
}

const client = new Client(30_000);
try {
  const { user, password } = netrc(HOST);
  await client.access({ host: HOST, user, password, secure: true, secureOptions: { servername: HOST } });
  console.log(`connected to ${HOST} as ${user} (TLS)`);
  const home = await client.pwd(); // FTP_DIR is relative to the login's own folder

  if (LS) {
    const path = LS.includes('=') ? LS.slice(LS.indexOf('=') + 1) : '';
    console.log(`${await client.pwd()} ${path}`);
    for (const f of await client.list(path || undefined))
      console.log(`${f.isDirectory ? 'd' : '-'} ${f.size}\t${f.name}`);
    process.exit(0);
  }

  if (!DIR || DIR === '/' || DIR === '.') throw new Error('refusing to deploy into the FTP root: set FTP_DIR');
  const local = localFiles(DIST);
  if (!local.has('index.html')) throw new Error('dist/index.html is missing: run npm run build');
  const remote = await remoteFiles(client, DIR);

  const upload = [...local.keys()]
    .filter((p) => ALWAYS.test(p) || remote.get(p) !== local.get(p))
    .sort((a, b) => (a === 'index.html' ? 1 : b === 'index.html' ? -1 : a.localeCompare(b)));
  const remove = [...remote.keys()].filter((p) => !local.has(p)).sort();
  console.log(`${String(local.size)} files in dist/, ${String(remote.size)} on the host in ${DIR}/`);
  console.log(`upload ${String(upload.length)}, remove ${String(remove.length)}${DRY ? ' (dry run)' : ''}`);
  for (const p of upload) console.log(`  + ${p}`);
  for (const p of remove) console.log(`  - ${p}`);
  if (DRY) process.exit(0);

  for (const p of upload) {
    await client.ensureDir(posix.join(DIR, posix.dirname(p)));
    await client.cd(home); // ensureDir leaves the client inside the new folder
    await client.uploadFrom(join(DIST, ...p.split('/')), posix.join(DIR, p));
  }
  for (const p of remove) await client.remove(posix.join(DIR, p), true);
  console.log('uploaded');

  // the page as visitors get it
  try {
    const html = await fetch(SITE, { cache: 'no-store' }).then((r) => r.text());
    const want = readFileSync(join(DIST, 'index.html'), 'utf8').match(/assets\/index-[\w-]+\.js/)?.[0];
    console.log(
      want && html.includes(want)
        ? `live: ${SITE} serves this build`
        : `check ${SITE}: it does not serve this build yet`,
    );
  } catch (e) {
    console.log(`could not open ${SITE} to check (${e.cause?.code ?? e.message}); the files are uploaded`);
  }
} catch (e) {
  console.error(String(e.message ?? e));
  process.exitCode = 1;
} finally {
  client.close();
}
