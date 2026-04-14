import { test, expect } from '@playwright/test';
import {
  boardSection,
  dragFirstZoneCard,
  startSoloGame,
  zoneCards,
} from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test.describe('Solo Board Movement', () => {
  test('moves cards through public zones with real drag and blocks invalid deck mixing', async ({ page }) => {
    await startSoloGame(page);

    await boardSection(page, 'bottom').getByRole('button', { name: /Draw/ }).click();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(5);
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(1);

    await dragFirstZoneCard(page, 'hand-host', 'field-host');
    await expect(zoneCards(page, 'field-host')).toHaveCount(1);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);

    await dragFirstZoneCard(page, 'field-host', 'cemetery-host');
    await expect(zoneCards(page, 'field-host')).toHaveCount(0);
    await expect(zoneCards(page, 'cemetery-host')).toHaveCount(1);

    await dragFirstZoneCard(page, 'hand-host', 'field-host');
    await dragFirstZoneCard(page, 'field-host', 'banish-host');
    await expect(zoneCards(page, 'field-host')).toHaveCount(0);
    await expect(zoneCards(page, 'banish-host')).toHaveCount(1);

    await dragFirstZoneCard(page, 'hand-host', 'field-host');
    await dragFirstZoneCard(page, 'field-host', 'ex-host');
    await expect(zoneCards(page, 'field-host')).toHaveCount(0);
    await expect(zoneCards(page, 'ex-host')).toHaveCount(1);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(2);

    await dragFirstZoneCard(page, 'hand-host', 'evolveDeck-host');
    await expect(zoneCards(page, 'hand-host')).toHaveCount(2);
    await expect(zoneCards(page, 'evolveDeck-host')).toHaveCount(2);
  });
});
