import { expect, test } from '@playwright/test';
import { buildGeneratedCatalogFixture } from './helpers/generatedCatalog';

test.use({ locale: 'en-US' });

test('a missing old detail group preserves edits and an explicit reload restores the draft using the updated catalog', async ({ page }) => {
  const cards = Array.from({ length: 51 }, (_, i) => ({
    id: i < 50 ? `A-${i + 1}` : 'B-1', name: `Card ${i + 1}`, image: '',
    class: 'ロイヤル', type: 'フォロワー', cost: '1', ability_text: `Ability ${i + 1}`,
    card_kind_normalized: 'follower', deck_section: 'main', is_deck_build_legal: true,
  }));
  let deployed = buildGeneratedCatalogFixture(cards);
  const updated = buildGeneratedCatalogFixture(cards.map(card => ({ ...card, ability_text: `${card.ability_text} updated` })));
  let missing = true;
  const versions: string[] = [];
  await page.route('**/card-catalog/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/card-catalog/manifest.json') versions.push(deployed.manifest.catalogVersion);
    if (missing && path.endsWith('/details/B.json')) return route.fulfill({ status: 404, json: { error: 'Not found' } });
    const body = deployed.files.get(path);
    await route.fulfill({ status: body ? 200 : 404, contentType: 'application/json', body: body ?? '{}' });
  });
  await page.goto('/deck-builder');
  await expect(page.getByRole('button', { name: 'Preview Card 1', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Deck format' }).selectOption('other');
  await page.getByRole('button', { name: 'Preview Card 1', exact: true }).locator('..').getByTitle('Add to Main Deck').click();
  await expect(page.getByText('1/50', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Card information could not be loaded');
  await expect(page.getByText('1/50', { exact: true })).toBeVisible();
  // Edit immediately before reload: the 400 ms draft timer must not be required.
  await page.getByPlaceholder('Deck Name', { exact: true }).fill('Latest edit before reload');
  deployed = updated;
  missing = false;
  await page.getByRole('button', { name: 'Save draft and reload', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Resume previous session' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByPlaceholder('Deck Name', { exact: true })).toHaveValue('Latest edit before reload');
  await expect(page.getByText('1/50', { exact: true })).toBeVisible();
  expect(new Set(versions).size).toBe(2);
  expect(versions[0]).not.toBe(versions.at(-1));
  expect(versions.at(-1)).toBe(updated.manifest.catalogVersion);
  await page.getByRole('button', { name: 'Preview Card 1', exact: true }).first().click();
  await expect(page.getByText('Ability 1 updated', { exact: true })).toBeVisible();
});
