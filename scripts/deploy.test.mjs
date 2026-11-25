// @ts-check
import { describe, expect, it } from 'vitest';
import { account, parseManifest, parseNetrc, plan } from './deploy.mjs';

/** @param {Record<string, string>} files content by path; the "hash" is the content itself */
const local = (files) =>
  new Map(Object.entries(files).map(([p, content]) => [p, { size: content.length, sha256: content }]));
/** @param {Record<string, string>} files */
const remote = (files) => new Map(Object.entries(files).map(([p, content]) => [p, content.length]));
/** @param {Record<string, string>} files */
const manifest = (files) => ({ version: /** @type {const} */ (1), deployedAt: '2026-11-25T00:00:00.000Z', files });

describe('plan', () => {
  it('uploads nothing when the host already has this build', () => {
    const files = { 'index.html': 'page', 'assets/index-a.js': 'aa', 'room.json': 'model' };
    expect(plan(local(files), remote(files), manifest(files))).toEqual({ upload: [], remove: [], kept: [] });
  });

  it('uploads by content, not by size: the same length with another hash goes up', () => {
    const before = { 'index.html': 'page', 'room.json': 'model' };
    const after = { 'index.html': 'page', 'room.json': 'MODEL' };
    expect(plan(local(after), remote(before), manifest(before)).upload).toEqual(['room.json']);
  });

  it('uploads index.html after everything else', () => {
    const files = { 'index.html': 'page', 'assets/xp-b.js': 'bb', 'wall/1.jpg': 'jpg', '.htaccess': 'h' };
    const { upload } = plan(local(files), remote({}), null);
    expect(upload.at(-1)).toBe('index.html');
    expect([...upload].sort()).toEqual(Object.keys(files).sort());
  });

  it('uploads a file the manifest knows but the host lost or truncated', () => {
    const files = { 'index.html': 'page', 'assets/index-a.js': 'aa', 'og.jpg': 'picture' };
    const onHost = remote({ 'index.html': 'page', 'og.jpg': 'pic' });
    expect(plan(local(files), onHost, manifest(files)).upload).toEqual(['assets/index-a.js', 'og.jpg']);
  });

  it('keeps the previous deploy and removes only what is older than it', () => {
    const previous = { 'index.html': 'old page', 'assets/xp-old.js': 'old' };
    const onHost = { ...previous, 'assets/xp-older.js': 'older', 'stray.txt': 'x' };
    const next = { 'index.html': 'new page', 'assets/xp-new.js': 'new' };
    expect(plan(local(next), remote(onHost), manifest(previous))).toEqual({
      upload: ['assets/xp-new.js', 'index.html'],
      remove: ['assets/xp-older.js', 'stray.txt'],
      kept: ['assets/xp-old.js'],
    });
  });

  it('removes nothing on the first deploy with a manifest', () => {
    const onHost = { 'index.html': 'old page', 'assets/xp-old.js': 'old' };
    const result = plan(local({ 'index.html': 'new page' }), remote(onHost), null);
    expect(result.remove).toEqual([]);
    expect(result.kept).toEqual(['assets/xp-old.js']);
  });
});

describe('parseManifest', () => {
  it('reads what the deploy writes', () => {
    const m = manifest({ 'index.html': 'abc' });
    expect(parseManifest(JSON.stringify(m))).toEqual(m);
  });

  it('gives null for anything else', () => {
    expect(parseManifest('<html>404</html>')).toBeNull();
    expect(parseManifest('[]')).toBeNull();
    expect(parseManifest('{"files": 1}')).toBeNull();
  });
});

describe('the account from ~/.netrc', () => {
  const netrc = parseNetrc(`
    machine github.com login me password t0ken
    machine server1.hosting.reg.ru
      login u1
      password p1
  `);

  it('finds the only REG.RU hosting machine', () => {
    expect(account(netrc, undefined)).toEqual({ host: 'server1.hosting.reg.ru', user: 'u1', password: 'p1' });
  });

  it('takes FTP_HOST over it', () => {
    expect(account(netrc, 'github.com')).toEqual({ host: 'github.com', user: 'me', password: 't0ken' });
    expect(() => account(netrc, 'elsewhere.example')).toThrow('no login and password for elsewhere.example');
  });

  it('refuses to guess between two, or with none', () => {
    const two = [...netrc, ...parseNetrc('machine server2.hosting.reg.ru login u2 password p2')];
    expect(() => account(two, undefined)).toThrow('set FTP_HOST');
    expect(() => account(parseNetrc('machine github.com login me password t'), undefined)).toThrow('no machine ending');
  });
});
