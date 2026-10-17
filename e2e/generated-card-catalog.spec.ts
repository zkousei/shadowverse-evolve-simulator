import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('the real development reader loads summaries and only the requested detail group', async ({ page }) => {
  const released = JSON.parse(readFileSync('public/cards_detailed.json', 'utf8'));
  const preview = JSON.parse(readFileSync('public/cards_preview.json', 'utf8'));
  const releasedIds = new Set(released.map((card: { id: string }) => card.id));
  const expectedCount = released.length + preview.filter((card: { id: string }) => !releasedIds.has(card.id)).length;
  const requested: string[] = [];
  const errors: string[] = [];
  page.on('request', request => requested.push(new URL(request.url()).pathname));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // Import the actual Vite-served reader without switching any app screen.
    const modulePath = '/src/utils/card/generatedCardCatalog.ts';
    const { openGeneratedCardCatalog } = await import(modulePath);
    const catalog = await openGeneratedCardCatalog('/card-catalog');
    const first = catalog.index[0];
    const details = await catalog.loadCards([first.id]);
    const again = await catalog.loadCards([first.id]);
    return { version: catalog.version, count: catalog.index.length, summary: first,
      detail: details[0], cached: details[0] === again[0] };
  });
  expect(result.version).toMatch(/^[a-f0-9]{64}$/);
  expect(result.count).toBe(expectedCount);
  expect(result.summary.id).toBe(released[0].id);
  expect(result.summary.ability_text).toBeUndefined();
  expect(result.detail).toEqual({ ...released[0], catalog_status: 'released' });
  expect(result.cached).toBe(true);
  expect(requested.filter(path => path.startsWith('/card-catalog/'))).toEqual([
    '/card-catalog/manifest.json',
    `/card-catalog/versions/${result.version}/index.json`,
    `/card-catalog/versions/${result.version}/details/${result.summary.detail_group}.json`,
  ]);
  expect(requested).not.toContain('/cards_detailed.json');
  expect(requested).not.toContain('/cards_preview.json');
  expect(errors).toEqual([]);
});
