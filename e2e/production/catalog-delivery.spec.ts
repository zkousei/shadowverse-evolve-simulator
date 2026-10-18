import { decodeGeneratedCardIndex } from '../../src/utils/card/generatedCardIndex';
import { expect, test } from '../helpers/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { APIRequestContext } from '../helpers/test';

type Descriptor = { file: string; bytes: number; sha256: string; count: number };
const fetchVerified = async (request: APIRequestContext, descriptor: Descriptor, schemaVersion?: number) => {
  const response = await request.get(`/card-catalog/${descriptor.file}`);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.headers()['cache-control']).toBe('public, max-age=0, must-revalidate');
  const body = await response.body();
  expect(body.length).toBe(descriptor.bytes);
  expect(createHash('sha256').update(body).digest('hex')).toBe(descriptor.sha256);
  const raw = JSON.parse(body.toString());
  const records = schemaVersion ? decodeGeneratedCardIndex(raw, schemaVersion) : raw;
  expect(records).toHaveLength(descriptor.count);
  return records;
};

test('serves verified summaries and complete details from the production build', async ({ request }) => {
  const response = await request.get('/card-catalog/manifest.json');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.headers()['cache-control']).toBe('public, max-age=0, must-revalidate');
  const manifest = await response.json();
  expect(manifest.schemaVersion).toBe(2);
  const summaries = await fetchVerified(request, manifest.index, manifest.schemaVersion);
  const details = await fetchVerified(request, manifest.details[summaries[0].detail_group]);
  const original = JSON.parse(readFileSync('public/cards_detailed.json', 'utf8'));
  expect(details.find((card: { id: string }) => card.id === original[0].id))
    .toEqual({ ...original[0], catalog_status: 'released' });
});

test('returns 404 instead of the SPA document for missing catalog files', async ({ request }) => {
  for (const path of ['/card-catalog', '/card-catalog/missing.json',
    `/card-catalog/versions/${'0'.repeat(64)}/details/BP01.json`]) {
    const response = await request.get(path, { headers: { Accept: 'text/html' } });
    expect(response.status(), path).toBe(404);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(await response.json()).toEqual({ error: 'Catalog file not found' });
  }
});

test('deck builder uses generated catalogs and only requests part of the detail groups', async ({ page }) => {
  const requested = new Set<string>();
  page.on('request', request => requested.add(new URL(request.url()).pathname));
  await page.goto('/deck-builder');
  await expect(page.locator('input[type="file"]')).toBeEnabled();
  expect(requested.has('/cards_detailed.json')).toBe(false);
  expect(requested.has('/cards_preview.json')).toBe(false);
  expect(requested.has('/card-catalog/manifest.json')).toBe(true);
  await expect(page.getByRole('button', { name: /プレビュー|Preview / }).first()).toBeVisible();
  const manifest = JSON.parse(readFileSync('dist/card-catalog/manifest.json', 'utf8'));
  const groups = [...requested].filter(path => path.includes('/details/'));
  expect(groups.length).toBeGreaterThan(0);
  expect(groups.length).toBeLessThan(Object.keys(manifest.details).length);
});
