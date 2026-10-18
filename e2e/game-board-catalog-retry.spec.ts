import { expect, test } from './helpers/test';
import path from 'node:path';
import { startSoloGame, spawnDefaultToken, zoneCards } from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test('retries failed card information without reloading or resetting an active game', async ({ page }) => {
  let unavailable = true;
  let requests = 0;
  await page.route('**/card-catalog/manifest.json', async route => {
    requests++;
    if (unavailable && new URL(route.request().url()).pathname.endsWith('/manifest.json') && page.url().includes('/game')) await route.abort('failed');
    else await route.continue();
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
  const initialRequests = requests;
  unavailable = false;
  await retry.click();
  await expect(retry).toBeHidden();
  await expect.poll(() => requests).toBe(initialRequests + 1);
  await zoneCards(page, 'field-host').first().click();
  await expect(inspector).toContainText('This card is not in the current card catalog.');
  expect(await page.locator('[data-card-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-card-id')).sort())).toEqual(cards);
  await expect(page.getByTestId('preparation-controls')).toBeHidden();
});

test('restores saved-deck availability from the same retried catalog', async ({ page }) => {
  let unavailable = true;
  let requests = 0;
  await page.route('**/card-catalog/manifest.json', async route => {
    requests++;
    if (unavailable && new URL(route.request().url()).pathname.endsWith('/manifest.json') && page.url().includes('/game')) await route.abort('failed');
    else await route.continue();
  });
  await page.goto('/deck-builder');
  const input = page.locator('input[type="file"]');
  await expect(input).toBeEnabled();
  await input.setInputFiles(path.resolve('public/sample-decks/constructed-royal-sample.json'));
  await expect(page.getByPlaceholder('Deck Name', { exact: true })).toHaveValue('Sample Constructed Royal');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  // Catalog recovery needs a persisted deck, not the short-lived save toast.
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await page.goto('/game?mode=solo');
  const retry = page.getByRole('button', { name: 'Retry card information', exact: true });
  await expect(retry).toBeVisible();
  const load = page.getByRole('button', { name: 'Load Player 1 from My Decks', exact: true });
  await expect(load).toBeDisabled();
  const initialRequests = requests;
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
  expect(requests).toBe(initialRequests + 1);
});

test('recovers a missing saved-deck detail group from an empty board without automatically importing', async ({ page }) => {
  let blockDetails = false;
  let manifests = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/card-catalog/manifest.json') manifests++; });
  await page.route('**/card-catalog/**/details/**', async route => {
    if (blockDetails) await route.fulfill({ status: 404, json: { error: 'removed group' } });
    else await route.continue();
  });
  await page.goto('/deck-builder');
  const input = page.locator('input[type="file"]');
  await expect(input).toBeEnabled();
  await input.setInputFiles(path.resolve('public/sample-decks/constructed-royal-sample.json'));
  await expect(page.getByPlaceholder('Deck Name', { exact: true })).toHaveValue('Sample Constructed Royal');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  // Catalog recovery needs a persisted deck, not the short-lived save toast.
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  blockDetails = true;
  await page.goto('/game?mode=solo');
  const open = page.getByRole('button', { name: 'Load Player 1 from My Decks', exact: true });
  await expect(open).toBeEnabled();
  await open.click();
  const picker = page.getByRole('dialog', { name: 'Load from My Decks' });
  await picker.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(picker.getByRole('alert')).toContainText('Could not load the saved deck');
  await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(0);
  const before = manifests;
  blockDetails = false;
  await picker.getByRole('button', { name: 'Refresh card catalog', exact: true }).click();
  await expect.poll(() => manifests).toBe(before + 1);
  await expect(picker.getByRole('button', { name: 'Load', exact: true })).toBeEnabled();
  await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(0);
  await picker.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(picker).toBeHidden();
  await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(40);
  await expect(zoneCards(page, 'evolveDeck-host')).toHaveCount(10);
  await expect(page.getByTestId('leader-zone-leader-host').locator('[data-card-id]')).toHaveCount(1);
});
