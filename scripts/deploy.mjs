#!/usr/bin/env node
// @ts-check
// Uploads dist/ to donya.dev on REG.RU shared hosting over FTP with TLS (the host has no SSH).
//
// The account is not in the repo. The login and password come from ~/.netrc, which only the owner reads (chmod 600):
//   machine <server>.hosting.reg.ru
//   login <login>
//   password <password>
// The host is $FTP_HOST, else the only machine in ~/.netrc that ends with .hosting.reg.ru.
//
// What gets uploaded is decided by content: the site's folder keeps .deploy-manifest.json with the sha256 of every
// file of the last deploy, and a file goes up when its hash differs from the one there (or it is missing on the host,
// or its size there is wrong).
//
// Order: new and changed files, then the pages (the route copies, <route>/index.html, then index.html itself: a visitor
// never gets a page whose scripts are not there yet), then the manifest, then the removals. The previous deploy's files stay for one more deploy: a tab opened before it still
// has the old index.html and loads its desktop-*.js lazily. Only files that are in neither this build nor the previous
// manifest are removed. `.well-known/` (Let's Encrypt's checks) and `cgi-bin/` are never touched.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { Client, FTPError } from 'basic-ftp';

const USAGE = `usage: node scripts/deploy.mjs [--dry-run] [--ls[=path]] [--help]

  (no flags)    upload dist/ as it is (npm run deploy checks and builds first)
  --dry-run     connect and print what would be uploaded and removed, change nothing
  --ls[=path]   list a remote directory (to find the site's folder) and exit
  --help        this text

  FTP_HOST      the FTP host; default: the only *.hosting.reg.ru machine in ~/.netrc
  FTP_DIR       the site's folder, relative to the login's home; default: www/donya.dev`;

/** @typedef {{ machine: string, login?: string, password?: string }} NetrcEntry */
/** @typedef {{ size: number, sha256: string }} LocalFile */
/** @typedef {{ version: 1, deployedAt: string, files: Record<string, string> }} Manifest */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const DIR = process.env.FTP_DIR ?? 'www/donya.dev';
const SITE = 'https://donya.dev/';
const HOST_SUFFIX = '.hosting.reg.ru';
const MANIFEST = '.deploy-manifest.json';
/** remote paths the deploy never lists, uploads to or removes */
const KEEP = [/^\.well-known(\/|$)/, /^cgi-bin(\/|$)/];

/**
 * The machines of a .netrc file.
 * @param {string} text
 * @returns {NetrcEntry[]}
 */
export function parseNetrc(text) {
  const t = text.split(/\s+/).filter(Boolean);
  /** @type {NetrcEntry[]} */
  const entries = [];
  for (let i = 0; i < t.length; i++) {
    const machine = t[i + 1];
    if (t[i] !== 'machine' || machine === undefined) continue;
    /** @type {NetrcEntry} */
    const entry = { machine };
    for (let j = i + 2; j + 1 < t.length && t[j] !== 'machine' && t[j] !== 'default'; j += 2) {
      if (t[j] === 'login') entry.login = t[j + 1];
      if (t[j] === 'password') entry.password = t[j + 1];
    }
    entries.push(entry);
  }
  return entries;
}

/** @returns {NetrcEntry[]} */
function readNetrc() {
  try {
    return parseNetrc(readFileSync(join(homedir(), '.netrc'), 'utf8'));
  } catch {
    throw new Error(`no ~/.netrc: add "machine <server>${HOST_SUFFIX} login <login> password <password>" (chmod 600)`);
  }
}

/**
 * The host and its login: $FTP_HOST, else the single REG.RU hosting machine of ~/.netrc.
 * @param {NetrcEntry[]} entries
 * @param {string | undefined} fromEnv
 * @returns {{ host: string, user: string, password: string }}
 */
export function account(entries, fromEnv) {
  let host = fromEnv;
  if (!host) {
    const found = [...new Set(entries.map((e) => e.machine).filter((m) => m.endsWith(HOST_SUFFIX)))];
    if (found.length > 1)
      throw new Error(`~/.netrc has ${String(found.length)} machines ending with ${HOST_SUFFIX}: set FTP_HOST to one`);
    host = found[0];
    if (!host) throw new Error(`~/.netrc has no machine ending with ${HOST_SUFFIX}: add one, or set FTP_HOST`);
  }
  const entry = entries.find((e) => e.machine === host && e.login && e.password);
  if (!entry?.login || !entry.password) throw new Error(`~/.netrc has no login and password for ${host}`);
  return { host, user: entry.login, password: entry.password };
}

/**
 * Every file under dir, keyed by its posix path relative to it.
 * @param {string} dir
 * @returns {Map<string, LocalFile>}
 */
function localFiles(dir) {
  /** @type {Map<string, LocalFile>} */
  const out = new Map();
  /** @param {string} d */
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      if (name === '.DS_Store') continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) {
        walk(p);
        continue;
      }
      const data = readFileSync(p);
      out.set(relative(dir, p).split(sep).join('/'), {
        size: data.length,
        sha256: createHash('sha256').update(data).digest('hex'),
      });
    }
  };
  walk(dir);
  return out;
}

/**
 * Every file under the remote dir (relative posix paths, with sizes); the KEEP folders and the manifest are left out.
 * @param {Client} client
 * @param {string} dir
 * @returns {Promise<Map<string, number>>}
 */
async function remoteFiles(client, dir) {
  /** @type {Map<string, number>} */
  const out = new Map();
  /** @param {string} rel */
  const walk = async (rel) => {
    for (const f of await client.list(rel ? posix.join(dir, rel) : dir)) {
      if (f.name === '.' || f.name === '..') continue;
      const p = rel ? `${rel}/${f.name}` : f.name;
      if (p === MANIFEST || KEEP.some((re) => re.test(p))) continue;
      if (f.isDirectory) await walk(p);
      else out.set(p, f.size);
    }
  };
  await walk('');
  return out;
}

/**
 * The manifest text as the last deploy wrote it; null when it is not a manifest.
 * @param {string} text
 * @returns {Manifest | null}
 */
export function parseManifest(text) {
  /** @type {unknown} */
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null || !('files' in data)) return null;
  const { files } = data;
  if (typeof files !== 'object' || files === null) return null;
  /** @type {Record<string, string>} */
  const hashes = {};
  for (const [path, hash] of Object.entries(files)) if (typeof hash === 'string') hashes[path] = hash;
  const deployedAt = 'deployedAt' in data && typeof data.deployedAt === 'string' ? data.deployedAt : '';
  return { version: 1, deployedAt, files: hashes };
}

/**
 * The manifest the last deploy left in the site's folder; null when there is none (or it is unreadable).
 * @param {Client} client
 * @param {string} dir
 * @returns {Promise<Manifest | null>}
 */
async function remoteManifest(client, dir) {
  /** @type {Buffer[]} */
  const chunks = [];
  const sink = new Writable({
    write(chunk, _encoding, done) {
      chunks.push(/** @type {Buffer} */ (chunk));
      done();
    },
  });
  try {
    await client.downloadTo(sink, posix.join(dir, MANIFEST));
  } catch (e) {
    if (e instanceof FTPError && e.code === 550) return null; // no such file: the first deploy with a manifest
    throw e;
  }
  return parseManifest(Buffer.concat(chunks).toString('utf8'));
}

/**
 * When a file goes up: the files a page loads, then the pages (every .html points at this build's scripts: the
 * route copies, resume/index.html and the like), and the root index.html, the one most visitors get, last of all.
 * @param {string} path
 * @returns {number}
 */
const uploadRank = (path) => (path === 'index.html' ? 2 : path.endsWith('.html') ? 1 : 0);

/**
 * What a deploy does. Uploads: every local file whose hash is not the one in the previous manifest, or that is missing
 * on the host, or has another size there; the pages go last, the route copies and then index.html. Removals: remote files that are in neither this build
 * nor the previous manifest; the previous deploy's own files are kept for the tabs that still run it.
 * @param {Map<string, LocalFile>} local
 * @param {Map<string, number>} remote
 * @param {Manifest | null} previous
 * @returns {{ upload: string[], remove: string[], kept: string[] }}
 */
export function plan(local, remote, previous) {
  const upload = [...local.entries()]
    // a server that hides dotfiles from LIST makes .htaccess look missing: it then goes up every time, harmlessly
    .filter(([p, f]) => previous?.files[p] !== f.sha256 || remote.get(p) !== f.size)
    .map(([p]) => p)
    .sort((a, b) => uploadRank(a) - uploadRank(b) || a.localeCompare(b));
  const stale = [...remote.keys()].filter((p) => !local.has(p)).sort();
  // without a manifest nothing is known about the previous deploy: everything on the host stays this once
  const remove = previous ? stale.filter((p) => !Object.hasOwn(previous.files, p)) : [];
  return { upload, remove, kept: stale.filter((p) => !remove.includes(p)) };
}

/**
 * Whether the page visitors get is this build's.
 * @returns {Promise<string>}
 */
async function liveCheck() {
  try {
    const html = await fetch(SITE, { cache: 'no-store' }).then((r) => r.text());
    const want = /assets\/index-[\w-]+\.js/.exec(readFileSync(join(DIST, 'index.html'), 'utf8'))?.[0];
    return want && html.includes(want) ? `live: ${SITE} serves this build` : `check ${SITE}: not this build yet`;
  } catch (e) {
    return `could not open ${SITE} to check (${e instanceof Error ? e.message : String(e)}); the files are uploaded`;
  }
}

/**
 * @param {Client} client
 * @param {string[]} args
 * @returns {Promise<void>}
 */
async function deploy(client, args) {
  const dry = args.includes('--dry-run');
  const ls = args.find((a) => a === '--ls' || a.startsWith('--ls='));

  const { host, user, password } = account(readNetrc(), process.env.FTP_HOST);
  await client.access({ host, user, password, secure: true, secureOptions: { servername: host } });
  console.log(`connected to ${host} (TLS)`);
  const home = await client.pwd(); // FTP_DIR is relative to the login's own folder

  if (ls) {
    const path = ls.includes('=') ? ls.slice(ls.indexOf('=') + 1) : '';
    console.log(`${home} ${path}`);
    for (const f of await client.list(path || undefined))
      console.log(`${f.isDirectory ? 'd' : '-'} ${String(f.size)}\t${f.name}`);
    return;
  }

  if (!DIR || DIR === '/' || DIR === '.') throw new Error('refusing to deploy into the FTP root: set FTP_DIR');
  const local = localFiles(DIST);
  if (!local.has('index.html')) throw new Error('dist/index.html is missing: run npm run build');
  const reserved = [...local.keys()].find((p) => p === MANIFEST || KEEP.some((re) => re.test(p)));
  if (reserved) throw new Error(`dist/${reserved} is in a path the deploy never touches`);

  const remote = await remoteFiles(client, DIR);
  const previous = await remoteManifest(client, DIR);

  const { upload, remove, kept } = plan(local, remote, previous);

  console.log(`${String(local.size)} files in dist/, ${String(remote.size)} on the host in ${DIR}/`);
  console.log(
    previous ? `previous deploy: ${previous.deployedAt || 'time unknown'}` : `no ${MANIFEST} on the host yet`,
  );
  console.log(
    `upload ${String(upload.length)}, remove ${String(remove.length)}, ` +
      `keep ${String(kept.length)} of the previous deploy${dry ? ' (dry run)' : ''}`,
  );
  for (const p of upload) console.log(`  + ${p}`);
  for (const p of remove) console.log(`  - ${p}`);
  if (dry) return;

  for (const p of upload) {
    await client.ensureDir(posix.join(DIR, posix.dirname(p)));
    await client.cd(home); // ensureDir leaves the client inside the new folder
    await client.uploadFrom(join(DIST, ...p.split('/')), posix.join(DIR, p));
  }
  /** @type {Manifest} */
  const manifest = {
    version: 1,
    deployedAt: new Date().toISOString(),
    files: Object.fromEntries([...local.keys()].sort().map((p) => [p, local.get(p)?.sha256 ?? ''])),
  };
  await client.uploadFrom(Readable.from([JSON.stringify(manifest, null, 2) + '\n']), posix.join(DIR, MANIFEST));
  for (const p of remove) await client.remove(posix.join(DIR, p), true);
  console.log('uploaded');
  console.log(await liveCheck());
}

async function main() {
  const args = process.argv.slice(2);
  const unknown = args.find((a) => !/^--(dry-run|help|ls(=.*)?)$/.test(a));
  if (unknown !== undefined || args.includes('--help')) {
    if (unknown !== undefined) console.error(`unknown argument: ${unknown}\n`);
    console.log(USAGE);
    process.exitCode = unknown === undefined ? 0 : 2;
    return;
  }
  const client = new Client(30_000);
  try {
    await deploy(client, args);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  } finally {
    client.close();
  }
}

// run only as a script: the tests import the pure parts
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
