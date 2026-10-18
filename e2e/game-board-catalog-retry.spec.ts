import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { startSoloGame, spawnDefaultToken, zoneCards } from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test('retries failed card information without reloading or resetting an active game', async ({ page }) => {
  let unavailable = true;
  const requests = { '/cards_detailed.json': 0, '/cards_preview.json': 0 };
  await page.route(/\/cards_(detailed|preview)\.json$/, async route => {
    const pathname = new URL(route.request().url()).pathname as keyof typeof requests;
    requests[pathname]++;
    if (unavailable) await route.abort('failed');
    else await route.fulfill({ contentType: 'application/json', body: readFileSync(path.resolve(`public${pathname}`), 'utf8') });
  });
  await startSoloGame(page);
  const retry = page.getByRole('button', { name: 'Retry card information', exact: true });
  await expect(retry).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load Player 1 from My Decks', exact: true })).toHaveCount(0);
  await spawnDefaultToken(page, 'bottom', 'field');
  await zoneCards(page, 'field-host').first().click();
  const inspector = page.getByTestId('card-inspector');
  await expect(inspector).toContainText('Could not load card information');
  await inspector.getByRole('button', { name: 'Close', exact: true }).click();
  const cards = await page.locator('[data-card-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-card-id')).sort());
  const initialRequests = { ...requests };
  unavailable = false;
  await retry.click();
  await expect(retry).toBeHidden();
  await expect.poll(() => requests).toEqual({ '/cards_detailed.json': initialRequests['/cards_detailed.json'] + 1, '/cards_preview.json': initialRequests['/cards_preview.json'] + 1 });
  await zoneCards(page, 'field-host').first().click();
  await expect(inspector).toContainText('No detailed ability text found for this card.');
  expect(await page.locator('[data-card-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-card-id')).sort())).toEqual(cards);
  await expect(page.getByTestId('preparation-controls')).toBeHidden();
});

test('restores saved-deck availability from the same retried catalog', async ({ page }) => {
  let unavailable = true;
  const requests = { '/cards_detailed.json': 0, '/cards_preview.json': 0 };
  await page.route(/\/cards_(detailed|preview)\.json$/, async route => {
    const pathname = new URL(route.request().url()).pathname as keyof typeof requests;
    requests[pathname]++;
    if (unavailable) await route.abort('failed');
    else await route.fulfill({ contentType: 'application/json', body: readFileSync(path.resolve(`public${pathname}`), 'utf8') });
  });
  await page.goto('/deck-builder');
  const input = page.locator('input[type="file"]');
  await expect(input).toBeEnabled();
  await input.setInputFiles(path.resolve('public/sample-decks/constructed-royal-sample.json'));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('"Sample Constructed Royal" was saved.')).toBeVisible();
  await page.goto('/game?mode=solo');
  const retry = page.getByRole('button', { name: 'Retry card information', exact: true });
  await expect(retry).toBeVisible();
  const load = page.getByRole('button', { name: 'Load Player 1 from My Decks', exact: true });
  await expect(load).toBeDisabled();
  const initialRequests = { ...requests };
  unavailable = false;
  await retry.click();
  await expect(load).toBeEnabled();
  await load.click();
  const picker = page.getByRole('dialog', { name: 'Load from My Decks' });
  await picker.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(picker).toBeHidden();
  await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(40);
  await expect(zoneCards(page, 'evolveDeck-host')).toHaveCount(10);
  await expect(page.getByTestId('leader-zone-leader-host').locator('[data-card-id]')).toHaveCount(1);
  expect(requests).toEqual({ '/cards_detailed.json': initialRequests['/cards_detailed.json'] + 1, '/cards_preview.json': initialRequests['/cards_preview.json'] + 1 });
});
