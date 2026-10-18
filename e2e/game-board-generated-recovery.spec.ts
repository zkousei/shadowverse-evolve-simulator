import { expect, test } from './helpers/test';
import { readFileSync } from 'node:fs';
import { asSchemaOneCatalogFixture, buildGeneratedCatalogFixture } from './helpers/generatedCatalog';
import { startSoloGame, spawnDefaultToken, zoneCards } from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test('detail delay and missing schema 1 groups do not block play, and schema 2 recovery preserves the active board', async ({ page }) => {
  const deck = JSON.parse(readFileSync('e2e/fixtures/dummy-deck.json', 'utf8'));
  const cards = [...deck.mainDeck, ...deck.evolveDeck, deck.leaderCard, ...(deck.tokenDeck ?? [])]
    .map(card => ({ ...card, ability_text: 'Verified original ability' }));
  let deployed = asSchemaOneCatalogFixture(buildGeneratedCatalogFixture(cards));
  const updated = buildGeneratedCatalogFixture(cards.map(card => ({ ...card, ability_text: 'Verified updated ability' })));
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let missing = true;
  let manifests = 0;
  let detailRequests = 0;
  let legacyRequests = 0;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/cards_(detailed|preview)\.json$/.test(request.url())) legacyRequests++; });
  await page.route('**/card-catalog/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/manifest.json')) manifests++;
    if (path.includes('/details/')) {
      detailRequests++;
      await pending;
      if (missing) return route.fulfill({ status: 404, json: { error: 'removed old group' } });
    }
    const body = deployed.files.get(path);
    await route.fulfill({ status: body ? 200 : 404, contentType: 'application/json', body: body ?? '{}' });
  });
  try {
    // Imports, initial draw, readiness and start must finish before details do.
    await startSoloGame(page);
    await expect.poll(() => detailRequests).toBeGreaterThan(0);
    await zoneCards(page, 'hand-host').last().click();
    const inspector = page.getByTestId('card-inspector');
    await expect(inspector).toContainText('Loading card information');
    release();
    await expect(inspector).toContainText('Could not load card information');
    const beforeRetry = detailRequests;
    await inspector.getByRole('button', { name: 'Retry card information', exact: true }).click();
    await expect.poll(() => detailRequests).toBeGreaterThan(beforeRetry);
    await expect(inspector).toContainText('Could not load card information');
    expect(manifests).toBe(2);
    await inspector.getByRole('button', { name: 'Close', exact: true }).click();
    await spawnDefaultToken(page, 'bottom', 'field');
    await zoneCards(page, 'field-host').first().click();
    await expect(inspector).toContainText('This card is not in the current card catalog.');
    await inspector.getByRole('button', { name: 'Close', exact: true }).click();
    const cardIds = () => page.locator('[data-card-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-card-id')).sort());
    const before = await cardIds();
    await zoneCards(page, 'hand-host').last().click();
    expect(deployed.manifest.schemaVersion).toBe(1);
    expect(updated.manifest.schemaVersion).toBe(2);
    deployed = updated;
    missing = false;
    await inspector.getByRole('button', { name: 'Refresh card catalog', exact: true }).click();
    await expect(inspector).toContainText('Verified updated ability');
    expect(manifests).toBe(3);
    expect(await cardIds()).toEqual(before);
    await expect(page.getByTestId('preparation-controls')).toBeHidden();
    expect(legacyRequests).toBe(0);
    expect(errors).toEqual([]);
  } finally { release(); }
});
