import { expect, type Locator, type Page } from '@playwright/test';
import path from 'path';

export const dummyDeckPath = path.resolve(process.cwd(), 'e2e/fixtures/dummy-deck.json');
export const largeDummyDeckPath = path.resolve(process.cwd(), 'e2e/fixtures/dummy-deck-large.json');

export const boardSection = (page: Page, side: 'top' | 'bottom'): Locator =>
  page.getByTestId(`board-section-${side}`);

export const deckInput = (page: Page, side: 'top' | 'bottom'): Locator =>
  boardSection(page, side).locator('input[type="file"]');

export const zone = (page: Page, zoneId: string): Locator =>
  page.getByTestId(`zone-${zoneId}`);

export const zoneCards = (page: Page, zoneId: string): Locator =>
  zone(page, zoneId).locator('[data-card-id]');

export const leaderZoneCards = (page: Page, role: 'host' | 'guest'): Locator =>
  page.getByTestId(`leader-zone-leader-${role}`).locator('[data-card-id]');

export const importSoloDummyDecks = async (page: Page, deckPath = dummyDeckPath) => {
  await deckInput(page, 'bottom').setInputFiles(deckPath);
  await deckInput(page, 'top').setInputFiles(deckPath);

  await expect(leaderZoneCards(page, 'host')).toHaveCount(1);
  await expect(leaderZoneCards(page, 'guest')).toHaveCount(1);
};

export const startSoloGame = async (page: Page) => {
  await page.goto('/game?mode=solo');
  const preparationControls = page.getByTestId('preparation-controls');

  await importSoloDummyDecks(page);

  await preparationControls.getByRole('button', { name: /Player 1 1st/ }).click();

  await preparationControls.getByRole('button', { name: /Draw Hand \(4\)/ }).click();
  await expect(zoneCards(page, 'hand-host')).toHaveCount(4);

  await preparationControls.getByRole('button', { name: /Player 1 Ready/ }).click();

  await preparationControls.getByRole('button', { name: /Draw P2 Hand \(4\)/ }).click();
  await expect(zoneCards(page, 'hand-guest')).toHaveCount(4);

  await preparationControls.getByRole('button', { name: /Player 2 Ready/ }).click();

  await preparationControls.getByRole('button', { name: /START GAME/ }).click();

  await expect(page.getByTestId('preparation-controls')).toBeHidden();
  await expect(boardSection(page, 'bottom')).toHaveAttribute('data-turn-active', 'true');
  await expect(boardSection(page, 'top')).toHaveAttribute('data-turn-active', 'false');
};

export const dragFirstZoneCard = async (page: Page, sourceZoneId: string, targetZoneId: string) => {
  const sourceCard = zoneCards(page, sourceZoneId).first();
  const targetZone = zone(page, targetZoneId);

  await sourceCard.scrollIntoViewIfNeeded();
  await targetZone.scrollIntoViewIfNeeded();
  await sourceCard.dragTo(targetZone);
};

export const openMainDeckActions = async (page: Page, role: 'host' | 'guest') => {
  const mainDeckSection = zone(page, `mainDeck-${role}`).locator('..');

  await zone(page, `mainDeck-${role}`).scrollIntoViewIfNeeded();
  await mainDeckSection.getByRole('button', { name: 'Actions' }).click();

  return mainDeckSection;
};
