import { test, expect } from '@playwright/test';
import {
  boardSection,
  startSoloGame,
  zoneCards,
} from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test.describe('Solo Turn and Undo Flow', () => {
  test('changes phase, ends the active turn, and restores it through undo', async ({ page }) => {
    await startSoloGame(page);

    const phaseSelect = page.getByRole('combobox', { name: 'Phase' });
    await expect(phaseSelect).toHaveValue('Start');

    await phaseSelect.selectOption('End');
    await expect(phaseSelect).toHaveValue('End');

    await expect(boardSection(page, 'bottom')).toHaveAttribute('data-turn-active', 'true');
    await expect(boardSection(page, 'top')).toHaveAttribute('data-turn-active', 'false');
    await expect(zoneCards(page, 'hand-guest')).toHaveCount(4);

    await boardSection(page, 'bottom').getByRole('button', { name: 'End Player 1 Turn' }).click();

    await expect(boardSection(page, 'bottom')).toHaveAttribute('data-turn-active', 'false');
    await expect(boardSection(page, 'top')).toHaveAttribute('data-turn-active', 'true');
    await expect(boardSection(page, 'top').getByRole('button', { name: 'End Player 2 Turn' })).toBeEnabled();
    await expect(zoneCards(page, 'hand-guest')).toHaveCount(5);

    await page.getByRole('button', { name: /UNDO LAST END TURN/ }).click();
    const undoDialog = page.getByRole('dialog', { name: 'Undo Last End Turn' });
    await expect(undoDialog).toBeVisible();
    await undoDialog.getByRole('button', { name: 'Yes, Undo' }).click();

    await expect(undoDialog).toBeHidden();
    await expect(boardSection(page, 'bottom')).toHaveAttribute('data-turn-active', 'true');
    await expect(boardSection(page, 'top')).toHaveAttribute('data-turn-active', 'false');
    await expect(zoneCards(page, 'hand-guest')).toHaveCount(4);
    await expect(phaseSelect).toHaveValue('End');
  });
});
