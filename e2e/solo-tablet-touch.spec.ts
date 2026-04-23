import { test, expect } from '@playwright/test';
import {
  openMainDeckActions,
  startSoloGame,
  zoneCards,
} from './helpers/gameBoard';

test.use({
  locale: 'en-US',
  viewport: { width: 1024, height: 768 },
  hasTouch: true,
  isMobile: false,
});

test.describe('Solo Tablet Touch Controls', () => {
  test('opens search-card quick actions only after tapping a card on coarse input', async ({ page }) => {
    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = ((query: string) => {
        if (query.includes('(pointer: coarse)')) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as MediaQueryList;
        }

        return originalMatchMedia(query);
      }) as typeof window.matchMedia;
    });

    await startSoloGame(page);

    const boardRoot = page.locator('[data-layout-profile][data-input-profile]').first();
    await expect(boardRoot).toHaveAttribute('data-layout-profile', 'tablet');
    await expect(boardRoot).toHaveAttribute('data-input-profile', 'coarse');

    const hostMainDeckBox = await page.getByTestId('zone-mainDeck-host').boundingBox();
    const hostTrackerBox = await page.getByTestId('player-tracker-host').boundingBox();
    expect(hostMainDeckBox).not.toBeNull();
    expect(hostTrackerBox).not.toBeNull();
    if (hostMainDeckBox && hostTrackerBox) {
      const controlsGap = hostTrackerBox.x - (hostMainDeckBox.x + hostMainDeckBox.width);
      expect(controlsGap).toBeGreaterThanOrEqual(12);
    }

    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(2);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);

    const mainDeckSection = await openMainDeckActions(page, 'host');
    await mainDeckSection.getByRole('button', { name: 'Search' }).click();

    const searchPanel = page.getByTestId('search-card-modal-panel');
    await expect(searchPanel).toBeVisible();

    const firstCardContainer = searchPanel.locator('.search-card-container').first();
    const firstCardControls = firstCardContainer.locator('.modal-card-controls');
    await expect(firstCardControls).toHaveCSS('opacity', '0');
    await expect(firstCardControls).toHaveCSS('pointer-events', 'none');

    await firstCardContainer.click();
    await expect(firstCardControls).toHaveCSS('opacity', '1');
    await expect(firstCardControls).toHaveCSS('pointer-events', 'auto');

    await firstCardControls.getByRole('button', { name: 'Add to Hand', exact: true }).click();

    await expect(searchPanel).toBeHidden();
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(1);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(5);
  });
});
