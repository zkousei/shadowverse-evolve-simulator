import { afterEach, expect, test, vi } from 'vitest';
import { build, createServer, type ViteDevServer } from 'vite';
import { createServer as createHttpServer, type Server } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cardCatalog } from './cardCatalog';
import * as artifacts from './cardCatalogArtifacts';

const servers: ViteDevServer[] = [];
const httpServers: Server[] = [];
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(httpServers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  })));
  await Promise.all(servers.splice(0).map(server => server.close()));
  vi.restoreAllMocks();
  roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true }));
});
const fixture = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'catalog-dev-test-')));
  roots.push(root);
  mkdirSync(join(root, 'public'));
  writeFileSync(join(root, 'index.html'), '<html><body>unchanged app</body></html>');
  writeFileSync(join(root, 'public/cards_detailed.json'), JSON.stringify([
    { id: 'BP01-001', name: 'Old', ability_text: 'Details', future: { value: 0 } },
  ]));
  writeFileSync(join(root, 'public/cards_preview.json'), '[]');
  return root;
};
const start = async (root: string) => {
  const server = await createServer({ configFile: false, root, plugins: [cardCatalog()], logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null } });
  servers.push(server);
  const http = createHttpServer(server.middlewares);
  httpServers.push(http);
  await new Promise<void>((resolve, reject) => {
    http.once('error', reject);
    http.listen(0, '127.0.0.1', resolve);
  });
  const address = http.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return (path: string, method = 'GET') => fetch(`http://127.0.0.1:${address.port}${path}`, { method });
};
const expectFailure = async (response: Response, status: number) => {
  expect(response.status).toBe(status);
  expect(response.headers.get('content-type')).toContain('application/json');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toHaveProperty('error');
};

test('development serves the exact verified build bytes without writing source or public artifacts', async () => {
  const root = fixture();
  const inputs = ['cards_detailed.json', 'cards_preview.json'].map(name => readFileSync(join(root, 'public', name)));
  const get = await start(root);
  const response = await get('/card-catalog/manifest.json');
  expect(response.headers.get('content-type')).toContain('application/json');
  const body = Buffer.from(await response.arrayBuffer());
  const manifest = JSON.parse(body.toString());
  const compiled = await build({ configFile: false, root, plugins: [cardCatalog()], logLevel: 'silent', build: { write: false } });
  if (Array.isArray(compiled) || !('output' in compiled)) throw new Error('Expected bundle');
  const assets = new Map(compiled.output.filter(file => file.type === 'asset').map(file => [file.fileName, Buffer.from(file.source)]));
  expect(body).toEqual(assets.get('card-catalog/manifest.json'));
  const descriptors = [manifest.index, ...Object.values(manifest.details)] as Array<{ file: string; sha256: string; bytes: number }>;
  for (const descriptor of descriptors) {
    const file = await get(`/card-catalog/${descriptor.file}`);
    expect(file.status).toBe(200);
    expect(file.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
    const bytes = Buffer.from(await file.arrayBuffer());
    expect(bytes).toEqual(assets.get(`card-catalog/${descriptor.file}`));
    expect(bytes.length).toBe(descriptor.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(descriptor.sha256);
  }
  expect(['cards_detailed.json', 'cards_preview.json'].map(name => readFileSync(join(root, 'public', name)))).toEqual(inputs);
  expect(readdirSync(join(root, 'public')).sort()).toEqual(['cards_detailed.json', 'cards_preview.json']);
  expect(readdirSync(root)).not.toContain('artifacts');
});

test('source edits invalidate the snapshot even with unchanged file size and mtime, and old versions return 404', async () => {
  const root = fixture();
  const get = await start(root);
  const previous = await (await get('/card-catalog/manifest.json')).json();
  const source = join(root, 'public/cards_detailed.json');
  const stat = statSync(source);
  writeFileSync(source, readFileSync(source, 'utf8').replace('Old', 'New'));
  utimesSync(source, stat.atime, stat.mtime);
  const current = await (await get('/card-catalog/manifest.json')).json();
  expect(current.catalogVersion).not.toBe(previous.catalogVersion);
  await expectFailure(await get(`/card-catalog/${previous.details.BP01.file}`), 404);
  expect((await (await get(`/card-catalog/${current.details.BP01.file}`)).json())[0].name).toBe('New');
});

test('invalid or missing sources return 503 instead of stale data, and a corrected source can retry', async () => {
  const root = fixture();
  const get = await start(root);
  const previous = await (await get('/card-catalog/manifest.json')).json();
  const preview = join(root, 'public/cards_preview.json');
  writeFileSync(preview, 'invalid JSON');
  await expectFailure(await get('/card-catalog/manifest.json'), 503);
  await expectFailure(await get(`/card-catalog/${previous.index.file}`), 503);
  rmSync(preview);
  await expectFailure(await get('/card-catalog/manifest.json'), 503);
  writeFileSync(preview, '[{"id":"PV01-001","name":"Preview"}]');
  const current = await (await get('/card-catalog/manifest.json')).json();
  expect(current.counts.total).toBe(2);
  expect(current.catalogVersion).not.toBe(previous.catalogVersion);
});

test('unrelated development requests need no catalog generation and invalid catalog paths never become SPA HTML', async () => {
  const root = fixture();
  writeFileSync(join(root, 'public/cards_preview.json'), 'invalid JSON');
  const get = await start(root);
  expect(await (await get('/deck-builder')).text()).toContain('unchanged app');
  expect(await (await get('/cards_preview.json')).text()).toBe('invalid JSON');
  for (const path of ['/card-catalog', '/card-catalog/', '/card-catalog/missing.json', '/card-catalog/versions/invalid/index.json']) {
    await expectFailure(await get(path), 404);
  }
  const post = await get('/card-catalog/manifest.json', 'POST');
  await expectFailure(post, 405);
  expect(post.headers.get('allow')).toBe('GET, HEAD');
});

test('parallel requests share a consistent catalog and HEAD returns metadata without a body', async () => {
  const generate = vi.spyOn(artifacts, 'generateCardCatalogAssets');
  const get = await start(fixture());
  const responses = await Promise.all(Array.from({ length: 4 }, () => get('/card-catalog/manifest.json')));
  const bodies = await Promise.all(responses.map(response => response.text()));
  expect(new Set(bodies).size).toBe(1);
  const manifest = JSON.parse(bodies[0]);
  expect(manifest.counts.total).toBe(1);
  const head = await get(`/card-catalog/${manifest.index.file}`, 'HEAD');
  expect(head.status).toBe(200);
  expect(head.headers.get('content-type')).toContain('application/json');
  expect(Number(head.headers.get('content-length'))).toBe(manifest.index.bytes);
  expect(await head.text()).toBe('');
  expect(generate).toHaveBeenCalledTimes(1);
});

test('a public catalog collision is rejected instead of bypassing verification', async () => {
  const root = fixture();
  mkdirSync(join(root, 'public/card-catalog'));
  writeFileSync(join(root, 'public/card-catalog/manifest.json'), '{"unverified":true}');
  const get = await start(root);
  await expectFailure(await get('/card-catalog/manifest.json'), 503);
});


test('a source change after verification rejects the pending snapshot and a later request regenerates it', async () => {
  const root = fixture();
  const generate = artifacts.generateCardCatalogAssets;
  let verified!: () => void;
  let release!: () => void;
  const ready = new Promise<void>(resolve => { verified = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  vi.spyOn(artifacts, 'generateCardCatalogAssets').mockImplementationOnce(async publicDir => {
    const files = await generate(publicDir);
    verified();
    await gate;
    return files;
  });
  const get = await start(root);
  const pending = get('/card-catalog/manifest.json');
  try {
    await ready;
    const source = join(root, 'public/cards_detailed.json');
    writeFileSync(source, readFileSync(source, 'utf8').replace('Old', 'New'));
  } finally {
    release();
  }
  await expectFailure(await pending, 503);
  const current = await (await get('/card-catalog/manifest.json')).json();
  expect((await (await get(`/card-catalog/${current.index.file}`)).json())[0].name).toBe('New');
});
