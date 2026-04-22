import { test, expect } from '@playwright/test';
import {
  dragFirstZoneCard,
  startSoloGame,
  zone,
  zoneCards,
} from './helpers/gameBoard';

test.use({
  locale: 'en-US',
  viewport: { width: 1440, height: 900 },
});

test.describe('Solo Desktop Overview Layout', () => {
  test('keeps the full three-column board visible while using smaller PC card sizing', async ({ page }) => {
    await startSoloGame(page);

    const shell = page.locator('[data-board-density="overview"]');
    await expect(shell).toHaveAttribute('data-layout-profile', 'desktop');
    await expect(shell).toHaveAttribute('data-input-profile', 'fine');
    await expect(page.getByTestId('player-controls-tracker-disclosure')).toHaveCount(0);
    await expect(page.getByTestId('player-tracker-host')).toBeVisible();

    const playmatBox = await page.getByTestId('board-playmat').boundingBox();
    const bottomSectionBox = await page.getByTestId('board-section-bottom').boundingBox();
    expect(playmatBox).not.toBeNull();
    expect(bottomSectionBox).not.toBeNull();
    if (playmatBox && bottomSectionBox) {
      const leftGutter = bottomSectionBox.x - playmatBox.x;
      const rightGutter = (playmatBox.x + playmatBox.width) - (bottomSectionBox.x + bottomSectionBox.width);
      expect(Math.abs(leftGutter - rightGutter)).toBeLessThanOrEqual(24);
    }

    for (const zoneId of [
      'hand-guest',
      'cemetery-guest',
      'ex-guest',
      'banish-guest',
      'mainDeck-guest',
      'field-guest',
      'evolveDeck-guest',
      'evolveDeck-host',
      'field-host',
      'mainDeck-host',
      'banish-host',
      'ex-host',
      'cemetery-host',
      'hand-host',
    ]) {
      await expect(zone(page, zoneId)).toBeAttached();
    }

    const firstHandCardBox = await zoneCards(page, 'hand-host').first().boundingBox();
    expect(firstHandCardBox?.width).toBeGreaterThanOrEqual(69);
    expect(firstHandCardBox?.width).toBeLessThanOrEqual(72);
    expect(firstHandCardBox?.height).toBeGreaterThanOrEqual(97);
    expect(firstHandCardBox?.height).toBeLessThanOrEqual(100);

    await dragFirstZoneCard(page, 'hand-host', 'field-host');
    await expect(zoneCards(page, 'field-host')).toHaveCount(1);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(3);
  });
});
