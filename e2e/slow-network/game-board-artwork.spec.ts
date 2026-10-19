import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '../helpers/test';
import { buildGeneratedCatalogFixture, routeGeneratedCatalogFixture } from '../helpers/generatedCatalog';
import { openMainDeckActions, zoneCards } from '../helpers/gameBoard';
import { startSlowArtworkServer } from '../helpers/slowArtworkServer';

test.use({ locale: 'en-US', viewport: { width: 1280, height: 900 } });

for (const latency of [0, 150]) {
  test(`cold artwork at 5.2 Mbps, latency ${latency}ms remains operable`, async ({ page, context }, testInfo) => {
    const server = await startSlowArtworkServer();
    const cdp = await context.newCDPSession(page);
    try {
      const deck = JSON.parse(readFileSync('public/sample-decks/constructed-royal-sample.json', 'utf8'));
      const rewrite = (card: { id: string }) => ({ ...card, image: `${server.origin}/art/${card.id}.png`, related_cards: [] });
      deck.mainDeck = deck.mainDeck.map(rewrite);
      deck.evolveDeck = deck.evolveDeck.map(rewrite);
      deck.leaderCards = deck.leaderCards.map(rewrite);
      deck.tokenDeck = [];
      await routeGeneratedCatalogFixture(page, buildGeneratedCatalogFixture([...deck.mainDeck, ...deck.evolveDeck, ...deck.leaderCards]));
      await page.route('https://shadowverse-evolve.com/**', route => route.abort());
      await page.goto('/game?mode=solo');
      await page.getByTestId('board-section-bottom').locator('input[type="file"]').setInputFiles({
        name: 'slow-deck.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(deck)),
      });
      await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(40);
      await expect.poll(() => page.getByTestId('leader-zone-leader-host').locator('img').evaluateAll(images => images.some(node => { const image = node as HTMLImageElement; return image.complete && image.naturalWidth > 0; }))).toBe(true);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      const measure = (path: string) => page.evaluate(async url => {
        const start = performance.now();
        const response = await fetch(url);
        const headersMs = performance.now() - start;
        const body = await response.arrayBuffer();
        return { status: response.status, bytes: body.byteLength, headersMs, elapsedMs: performance.now() - start };
      }, `${server.origin}${path}`);
      const baseline = await measure('/art/baseline.png');
      const bytesPerSecond = 5.2 * 1_000_000 / 8;
      await cdp.send('Network.emulateNetworkConditionsByRule', { offline: false, matchedNetworkConditions: [{
        urlPattern: `${server.origin}/*`, latency, downloadThroughput: bytesPerSecond, uploadThroughput: -1,
      }] });
      const shaped = await measure('/art/shaped.png');
      expect(shaped.status).toBe(200);
      expect(shaped.bytes).toBe(server.bytes);
      if (latency) expect(shaped.headersMs).toBeGreaterThanOrEqual(latency * 0.7);
      // Calibration catches an accidentally unthrottled/fulfilled tiny fixture.
      expect(shaped.elapsedMs).toBeGreaterThanOrEqual(server.bytes / bytesPerSecond * 1000 * 0.65 + latency);
      const menu = await openMainDeckActions(page, 'host');
      const opened = Date.now();
      await menu.getByRole('button', { name: 'Search', exact: true }).click();
      const panel = page.getByTestId('search-card-modal-panel');
      const rows = page.getByTestId('search-card-grid').locator('.search-card-container');
      await expect(rows).toHaveCount(40);
      await panel.getByRole('button', { name: 'Select Multiple', exact: true }).click();
      await panel.getByRole('button', { name: 'Select All', exact: true }).click();
      await expect(panel).toContainText('40 selected');
      await panel.getByRole('button', { name: 'Done Selecting', exact: true }).click();
      const loaded = (row: typeof rows) => row.locator('img').evaluateAll(images => images.some(node => { const image = node as HTMLImageElement; return image.complete && image.naturalWidth > 0; }));
      await expect.poll(() => loaded(rows.first()), { timeout: 30_000 }).toBe(true);
      const firstImageMs = Date.now() - opened;
      const mainPaths = new Set<string>(deck.mainDeck.map((card: { id: string }) => `/art/${card.id}.png`));
      const initialRequested = [...server.requested].filter(path => mainPaths.has(path)).length;
      expect(initialRequested).toBeLessThan(40);
      await rows.last().scrollIntoViewIfNeeded();
      await expect.poll(() => loaded(rows.last()), { timeout: 45_000 }).toBe(true);
      await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(40);
      const timings = await page.evaluate(origin => performance.getEntriesByType('resource')
        .filter(entry => entry.name.startsWith(origin))
        .map(entry => {
          const resource = entry as PerformanceResourceTiming;
          return { url: resource.name, durationMs: resource.duration, firstByteMs: resource.responseStart - resource.startTime,
            downloadMs: resource.responseEnd - resource.responseStart, bytes: resource.encodedBodySize };
        }), server.origin);
      const report = { downloadMbps: 5.2, latencyMs: latency, scope: 'artwork HTTP only; catalog responses are fixtures',
        imageBytes: server.bytes, baseline, shaped, firstImageMs, initialRequested, timings };
      const reportPath = testInfo.outputPath('measurements.json');
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      await testInfo.attach('slow-network-measurements', { contentType: 'application/json', path: reportPath });
      console.log(JSON.stringify({ downloadMbps: 5.2, latencyMs: latency, imageBytes: server.bytes,
        baselineMs: Math.round(baseline.elapsedMs), shapedHeadersMs: Math.round(shaped.headersMs), shapedMs: Math.round(shaped.elapsedMs), firstImageMs, initialRequested }));
      await panel.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(panel).toBeHidden();
    } finally {
      await cdp.detach();
      await server.close();
    }
  });
}
