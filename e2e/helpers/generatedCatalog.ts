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


/** Prior schema fixture for exercising an open v1 source recovering into v2. */
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
