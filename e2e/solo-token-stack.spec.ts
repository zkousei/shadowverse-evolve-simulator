import { test, expect } from '@playwright/test';
import {
  dragFirstZoneCard,
  dragLocatorFromVisibleCornerToLocator,
  spawnDefaultToken,
  startSoloGame,
  zone,
  zoneCards,
} from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test.describe('Solo Token and Stack Flows', () => {
  test('spawns a token to the field and removes it when sent to cemetery', async ({ page }) => {
    await startSoloGame(page);

    await expect(zoneCards(page, 'field-host')).toHaveCount(0);
    await expect(zoneCards(page, 'cemetery-host')).toHaveCount(0);

    await spawnDefaultToken(page, 'bottom', 'field');

    await expect(zoneCards(page, 'field-host')).toHaveCount(1);

    await dragFirstZoneCard(page, 'field-host', 'cemetery-host');

    await expect(zoneCards(page, 'field-host')).toHaveCount(0);
    await expect(zoneCards(page, 'cemetery-host')).toHaveCount(0);
  });

  test('stacks one field card onto another and moves the full stack together', async ({ page }) => {
    await startSoloGame(page);

    await dragFirstZoneCard(page, 'hand-host', 'field-host');
    await expect(zoneCards(page, 'field-host')).toHaveCount(1);

    const rootCard = zoneCards(page, 'field-host').first();
    const rootCardId = await rootCard.getAttribute('data-card-id');
    if (!rootCardId) {
      throw new Error('Expected the first field card to expose a data-card-id.');
    }

    await zoneCards(page, 'hand-host').first().dragTo(rootCard);

    await expect(zoneCards(page, 'hand-host')).toHaveCount(2);
    await expect(zoneCards(page, 'field-host')).toHaveCount(2);

    await dragLocatorFromVisibleCornerToLocator(
      page,
      page.locator(`[data-card-id="${rootCardId}"]`),
      zone(page, 'cemetery-host')
    );

    await expect(zoneCards(page, 'field-host')).toHaveCount(0);
    await expect(zoneCards(page, 'cemetery-host')).toHaveCount(2);
  });
});
