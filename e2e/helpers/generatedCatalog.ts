import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { decodeGeneratedCardIndex } from '../../src/utils/card/generatedCardIndex';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

export const buildGeneratedCatalogFixture = (cards: unknown[]) => {
  const root = mkdtempSync(join(tmpdir(), 'catalog-browser-fixture-'));
  try {
    const released = join(root, 'released.json');
    const preview = join(root, 'preview.json');
    const output = join(root, 'generated');
    writeFileSync(released, JSON.stringify(cards));
    writeFileSync(preview, '[]');
    execFileSync('python3', ['-m', 'tools.card_data.generate_catalog', '--released', released,
      '--preview', preview, '--output', output], { stdio: 'pipe' });
    const bytes = readFileSync(join(output, 'manifest.json'));
    const manifest = JSON.parse(bytes.toString());
    const files = new Map<string, Buffer>([['/card-catalog/manifest.json', bytes]]);
    for (const entry of [manifest.index, ...Object.values(manifest.details)] as Array<{ file: string }>) {
      files.set(`/card-catalog/${entry.file}`, readFileSync(join(output, entry.file)));
    }
    return { manifest, files };
  } finally { rmSync(root, { recursive: true, force: true }); }
};

export const routeGeneratedCatalogFixture = async (page: Page, fixture: ReturnType<typeof buildGeneratedCatalogFixture>) => {
  await page.route('**/card-catalog/**', async route => {
    const body = fixture.files.get(new URL(route.request().url()).pathname);
    await route.fulfill({ status: body ? 200 : 404, contentType: 'application/json', body: body ?? '{}' });
  });
};


/** Prior schema fixture for exercising an open v1 source recovering into a newer format. */
export const asSchemaOneCatalogFixture = (fixture: ReturnType<typeof buildGeneratedCatalogFixture>) => {
  const manifest = structuredClone(fixture.manifest);
  const files = new Map<string, Buffer>();
  const descriptors = [manifest.index, ...Object.values(manifest.details)] as Array<{ file: string; bytes: number; gzipBytes: number; sha256: string }>;
  const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
  for (const entry of descriptors) {
    const name = entry.file.split('/').slice(2).join('/');
    let bytes = fixture.files.get(`/card-catalog/${entry.file}`)!;
    if (name === 'index.json') bytes = Buffer.from(JSON.stringify(decodeGeneratedCardIndex(JSON.parse(bytes.toString()), manifest.schemaVersion)) + '\n');
    files.set(name, bytes);
    Object.assign(entry, { bytes: bytes.length, gzipBytes: gzipSync(bytes).length, sha256: hash(bytes) });
  }
  manifest.schemaVersion = 1;
  manifest.catalogVersion = hash(Buffer.from(JSON.stringify({
    files: Object.fromEntries([...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, bytes]) => [name, hash(bytes)])), schemaVersion: 1,
  }) + '\n'));
  for (const entry of descriptors) entry.file = `versions/${manifest.catalogVersion}/${entry.file.split('/').slice(2).join('/')}`;
  const routes = new Map([...files].map(([name, bytes]) => [`/card-catalog/versions/${manifest.catalogVersion}/${name}`, bytes]));
  routes.set('/card-catalog/manifest.json', Buffer.from(JSON.stringify(manifest)));
  return { manifest, files: routes };
};

/** Test-only schema 3 data; production generation stays on schema 2. */
export const asSplitCatalogFixture = (source: ReturnType<typeof buildGeneratedCatalogFixture>, maxCards = 1) => {
  if (!Number.isSafeInteger(maxCards) || maxCards < 1) throw new Error('Invalid fixture chunk size');
  const sourceIndex = JSON.parse(source.files.get(`/card-catalog/${source.manifest.index.file}`)!.toString());
  const fields = sourceIndex.fields as string[];
  const index = decodeGeneratedCardIndex(sourceIndex, source.manifest.schemaVersion) as Array<Record<string, unknown>>;
  const byId = new Map<string, Record<string, unknown>>();
  for (const desc of Object.values(source.manifest.details) as Array<{ file: string }>) {
    for (const card of JSON.parse(source.files.get(`/card-catalog/${desc.file}`)!.toString()) as Array<Record<string, unknown>>) {
      byId.set(card.id as string, card);
    }
  }
  const products = new Map<string, Array<Record<string, unknown>>>();
  for (const entry of index) {
    const id = entry.id as string;
    const product = id.split('-')[0];
    const cards = products.get(product) ?? [];
    const card = byId.get(id);
    if (!card) throw new Error('Missing fixture detail');
    cards.push(card);
    products.set(product, cards);
  }
  const bodies = new Map<string, Buffer>();
  const assigned = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const [product, cards] of products) {
    const pieces = Math.ceil(cards.length / maxCards);
    for (let part = 0; part < pieces; part++) {
      const group = pieces === 1 ? product : `${product}@${String(part + 1).padStart(4, '0')}`;
      const chunk = cards.slice(part * maxCards, (part + 1) * maxCards);
      bodies.set(`details/${group}.json`, Buffer.from(JSON.stringify(chunk) + '\n'));
      counts.set(group, chunk.length);
      for (const card of chunk) assigned.set(card.id as string, group);
    }
  }
  const entries = index.map(entry => ({ ...entry, detail_group: assigned.get(entry.id as string)! } as Record<string, unknown>));
  bodies.set('index.json', Buffer.from(JSON.stringify({ encoding: 'rows-v1', fields,
    rows: entries.map(entry => [fields.reduce((mask, field, bit) => field in entry ? mask + 2 ** bit : mask, 0),
      ...fields.filter(field => field in entry).map(field => entry[field])]),
  }) + '\n'));
  const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
  const version = hash(Buffer.from(JSON.stringify({
    files: Object.fromEntries([...bodies].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, data]) => [name, hash(data)])), schemaVersion: 3,
  }) + '\n'));
  const descriptor = (name: string, count: number) => {
    const data = bodies.get(name)!;
    return { file: `versions/${version}/${name}`, count, bytes: data.length,
      gzipBytes: gzipSync(data).length, sha256: hash(data) };
  };
  const manifest = { schemaVersion: 3, catalogVersion: version, counts: structuredClone(source.manifest.counts),
    index: descriptor('index.json', index.length),
    details: Object.fromEntries([...counts].map(([group, count]) => [group, descriptor(`details/${group}.json`, count)])),
  };
  const files = new Map([...bodies].map(([name, data]) => [`/card-catalog/versions/${version}/${name}`, data]));
  files.set('/card-catalog/manifest.json', Buffer.from(JSON.stringify(manifest)));
  return { manifest, files };
};
