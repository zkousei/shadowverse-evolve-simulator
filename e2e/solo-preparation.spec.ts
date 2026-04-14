import { test, expect } from '@playwright/test';
import {
  deckInput,
  importSoloDummyDecks,
  largeDummyDeckPath,
  zoneCards,
} from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test.describe('Solo Preparation Flow', () => {
  test('mulligans the initial hand and gates game start until both players are ready', async ({ page }) => {
    await page.goto('/game?mode=solo');
    const preparationControls = page.getByTestId('preparation-controls');

    await importSoloDummyDecks(page, largeDummyDeckPath);

    await preparationControls.getByRole('button', { name: /Player 1 1st/ }).click();
    await preparationControls.getByRole('button', { name: /Draw Hand \(4\)/ }).click();

    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(6);

    await page.getByRole('button', { name: /Mulligan \(Player 1\)/ }).click();

    const mulliganDialog = page.getByRole('dialog', { name: /Mulligan: Select Return Order/ });
    await expect(mulliganDialog).toBeVisible();
    await expect(mulliganDialog.getByRole('button', { name: /Exchange \(Mulligan\)/ })).toBeDisabled();

    const mulliganCards = mulliganDialog.getByRole('img', { name: /E2E/ });
    for (let index = 0; index < 4; index += 1) {
      await mulliganCards.nth(index).click();
    }

    await mulliganDialog.getByRole('button', { name: /Exchange \(Mulligan\)/ }).click();
    await expect(mulliganDialog).toBeHidden();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(6);
    await expect(page.getByRole('button', { name: /Mulligan \(Player 1\)/ })).toHaveCount(0);

    await preparationControls.getByRole('button', { name: /Player 1 Ready/ }).click();
    await expect(preparationControls.getByRole('button', { name: /START GAME/ })).toBeDisabled();

    await preparationControls.getByRole('button', { name: /Draw P2 Hand \(4\)/ }).click();
    await preparationControls.getByRole('button', { name: /Player 2 Ready/ }).click();
    await expect(preparationControls.getByRole('button', { name: /START GAME/ })).toBeEnabled();

    await preparationControls.getByRole('button', { name: /Cancel P2 Ready/ }).click();
    await expect(preparationControls.getByRole('button', { name: /START GAME/ })).toBeDisabled();

    await preparationControls.getByRole('button', { name: /Player 2 Ready/ }).click();
    await preparationControls.getByRole('button', { name: /START GAME/ }).click();

    await expect(preparationControls).toBeHidden();
    await expect(deckInput(page, 'bottom')).toBeDisabled();
    await expect(deckInput(page, 'top')).toBeDisabled();
  });
});
