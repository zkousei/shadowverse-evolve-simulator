import { readFileSync } from 'node:fs';
import { expect, test } from './helpers/test';
import { buildGeneratedCatalogFixture } from './helpers/generatedCatalog';
import { openMainDeckActions, zoneCards } from './helpers/gameBoard';

test.use({ locale: 'en-US', viewport: { width: 1280, height: 900 } });

const artwork = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jHykAAAAASUVORK5CYII=', 'base64');

test('loads nearby deck artwork before offscreen cards, recovers a transient failure, and loads the final card on scroll', async ({ page }, testInfo) => {
  const deck = JSON.parse(readFileSync('public/sample-decks/constructed-royal-sample.json', 'utf8'));
  const rewrite = (card: { id: string }) => ({ ...card, image: `/e2e-game-art/${card.id}.png`, related_cards: [] });
  deck.mainDeck = deck.mainDeck.map(rewrite);
  deck.evolveDeck = deck.evolveDeck.map(rewrite);
  deck.leaderCards = deck.leaderCards.map(rewrite);
  deck.tokenDeck = [];
  const cards = [...deck.mainDeck, ...deck.evolveDeck, ...deck.leaderCards];
  const fixture = buildGeneratedCatalogFixture(cards);
  let releaseDetails!: () => void;
  const pendingDetails = new Promise<void>(resolve => { releaseDetails = resolve; });
  await page.route('**/card-catalog/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes('/details/')) await pendingDetails;
    const body = fixture.files.get(path);
    await route.fulfill({ status: body ? 200 : 404, contentType: 'application/json', body: body ?? '{}' });
  });
  const mainUrls = new Set<string>(deck.mainDeck.map((card: { image: string }) => card.image));
  const requested = new Set<string>();
  let failedUrl = '';
  let retries = 0;
  await page.route('**/e2e-game-art/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (mainUrls.has(path)) {
      requested.add(path);
      if (!failedUrl) {
        failedUrl = path;
        await route.fulfill({ status: 503, body: 'Temporary image failure' });
        return;
      }
      if (path === failedUrl) retries++;
    }
    await route.fulfill({ contentType: 'image/png', body: artwork });
  });
  try {
    await page.goto('/game?mode=solo');
    await page.getByTestId('board-section-bottom').locator('input[type="file"]').setInputFiles({
      name: 'artwork-deck.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(deck)),
    });
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(40);
    expect(requested.size).toBe(0);
    const menu = await openMainDeckActions(page, 'host');
    await menu.getByRole('button', { name: 'Search', exact: true }).click();
    const grid = page.getByTestId('search-card-grid');
    const rows = grid.locator('.search-card-container');
    await expect(rows).toHaveCount(40);
    await expect.poll(() => requested.size).toBeGreaterThan(0);
    expect(requested.size).toBeLessThan(40);
    await expect.poll(() => retries).toBe(1);
    const recovered = grid.locator(`img[src="${failedUrl}"]`);
    await expect.poll(() => recovered.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1);
    expect(await grid.locator('img').count()).toBeLessThan(40);
    expect(requested.size).toBeLessThan(40);
    await testInfo.attach('initial-artwork-requests', {
      contentType: 'application/json', body: JSON.stringify({ totalCards: 40, initialUniqueImageRequests: requested.size }),
    });
    // Image loading must not wait for the blocked catalog detail groups.
    await rows.last().scrollIntoViewIfNeeded();
    await expect.poll(() => rows.last().locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1);
    await rows.first().scrollIntoViewIfNeeded();
    await expect.poll(() => rows.first().locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1);
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(40);
  } finally { releaseDetails(); }
});
