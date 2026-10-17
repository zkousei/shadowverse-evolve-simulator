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
