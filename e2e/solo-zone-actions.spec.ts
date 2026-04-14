import { test, expect } from '@playwright/test';
import {
  openMainDeckActions,
  startSoloGame,
  zoneCards,
} from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test.describe('Solo Zone Actions', () => {
  test('searches the main deck and adds a card to hand', async ({ page }) => {
    await startSoloGame(page);

    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(2);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);

    const mainDeckSection = await openMainDeckActions(page, 'host');
    await mainDeckSection.getByRole('button', { name: 'Search' }).click();

    const searchPanel = page.getByTestId('search-card-modal-panel');
    await expect(searchPanel).toBeVisible();
    await expect(searchPanel).toContainText('Player 1 Main Deck (2)');
    await expect(searchPanel.getByTestId('search-card-type-counts')).toContainText(/Follower: \d+ \/ Spell: \d+ \/ Amulet: \d+/);
    await expect(searchPanel.getByRole('button', { name: 'Play to Field', exact: true })).toHaveCount(2);
    await expect(searchPanel.getByRole('button', { name: 'Add to Hand', exact: true })).toHaveCount(2);
    await expect(searchPanel.getByRole('button', { name: 'Add to EX Area', exact: true })).toHaveCount(2);

    await searchPanel.getByRole('button', { name: 'Add to Hand', exact: true }).first().click({ force: true });

    await expect(searchPanel).toBeHidden();
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(1);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(5);
  });

  test('resolves Look Top into field and EX area destinations', async ({ page }) => {
    await startSoloGame(page);

    const mainDeckSection = await openMainDeckActions(page, 'host');
    await mainDeckSection.getByRole('button', { name: 'Look Top (N)' }).click();

    const countDialog = page.getByRole('dialog', { name: 'How many cards to look at?' });
    await expect(countDialog).toBeVisible();
    await countDialog.getByRole('button', { name: '2' }).click();

    await expect(page.getByText('Look at Top 2 Cards')).toBeVisible();
    const topDeckModal = page.getByText('Look at Top 2 Cards').locator('xpath=ancestor::div[contains(@style, "max-width: 1200px")]');

    await topDeckModal.getByRole('img', { name: /E2E/ }).first().click();
    await topDeckModal.getByRole('button', { name: 'EX Area' }).click();
    await topDeckModal.getByRole('img', { name: /E2E/ }).first().click();
    await topDeckModal.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText('Look at Top 2 Cards')).toBeHidden();
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(0);
    await expect(zoneCards(page, 'field-host')).toHaveCount(1);
    await expect(zoneCards(page, 'ex-host')).toHaveCount(1);
  });
});
