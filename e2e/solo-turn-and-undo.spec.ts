import { test, expect } from '@playwright/test';
import {
  boardSection,
  startSoloGame,
  spawnDefaultToken,
  openMainDeckActions,
  zoneCards,
} from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test.describe('Solo Turn and Undo Flow', () => {
  test('undoes multiple moves across solo players and then still undoes the end turn', async ({ page }) => {
    await startSoloGame(page);
    await boardSection(page, 'bottom').getByRole('button', { name: 'End Player 1 Turn' }).click();
    await expect(zoneCards(page, 'hand-guest')).toHaveCount(5);
    await boardSection(page, 'bottom').getByRole('button', { name: 'Draw Player 1', exact: true }).click();
    await boardSection(page, 'top').getByRole('button', { name: 'Draw Player 2', exact: true }).click();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(5);
    await expect(zoneCards(page, 'hand-guest')).toHaveCount(6);
    await page.getByTestId('undo-move-guest').click();
    await expect(zoneCards(page, 'hand-guest')).toHaveCount(5);
    await expect(page.getByTestId('undo-move-host')).toBeEnabled();
    await expect(page.getByTestId('undo-move-guest')).toBeDisabled();
    await page.getByTestId('undo-move-host').click();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    await expect(page.getByTestId('undo-move-host')).toBeDisabled();
    await expect(page.getByTestId('undo-move-guest')).toBeDisabled();
    await page.getByRole('button', { name: /UNDO LAST END TURN/ }).click();
    await page.getByRole('dialog', { name: 'Undo Last End Turn' }).getByRole('button', { name: 'Yes, Undo' }).click();
    await expect(zoneCards(page, 'hand-guest')).toHaveCount(4);
    await expect(boardSection(page, 'bottom')).toHaveAttribute('data-turn-active', 'true');
    await expect(page.getByTestId('undo-move-host')).toBeDisabled();
    await expect(page.getByTestId('undo-move-guest')).toBeDisabled();
  });

  test('preserves multiple undo steps after decreasing a zero counter, undoes a real counter change before token creation', async ({ page }) => {
    await startSoloGame(page);
    await spawnDefaultToken(page, 'bottom', 'field');
    await boardSection(page, 'bottom').getByRole('button', { name: 'Draw Player 1', exact: true }).click();
    const token = zoneCards(page, 'field-host').first();
    await token.hover();
    await token.getByRole('button', { name: '-C', exact: true }).click();
    await expect(page.getByTestId('undo-move-host')).toBeEnabled();
    await page.getByTestId('undo-move-host').click();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    await expect(zoneCards(page, 'field-host')).toHaveCount(1);
    await expect(page.getByTestId('undo-move-host')).toBeEnabled();
    await page.getByTestId('undo-move-host').click();
    await expect(zoneCards(page, 'field-host')).toHaveCount(0);
    await expect(page.getByTestId('undo-move-host')).toBeDisabled();

    await spawnDefaultToken(page, 'bottom', 'field');
    await token.hover();
    await token.getByRole('button', { name: '+C', exact: true }).click();
    await expect(token.getByTestId('generic-counter-badge')).toBeVisible();
    await page.getByTestId('undo-move-host').click();
    await expect(token.getByTestId('generic-counter-badge')).toBeHidden();
    await expect(zoneCards(page, 'field-host')).toHaveCount(1);
    await page.getByTestId('undo-move-host').click();
    await expect(zoneCards(page, 'field-host')).toHaveCount(0);
    await expect(page.getByTestId('undo-move-host')).toBeDisabled();
  });

  test('undoes a draw and then restores the exact deck order before shuffle', async ({ page }) => {
    await startSoloGame(page);
    const deck = zoneCards(page, 'mainDeck-host');
    const before = await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')));
    expect(before).toHaveLength(2);
    const menu = await openMainDeckActions(page, 'host');
    // Force a changed two-card order so the test does not depend on chance.
    const originalRandom = await page.evaluateHandle(() => Math.random);
    await page.evaluate(() => { Math.random = () => 0; });
    try {
      await menu.getByRole('button', { name: 'Shuffle', exact: true }).click();
    } finally {
      await page.evaluate(random => { Math.random = random; }, originalRandom);
      await originalRandom.dispose();
    }
    const shuffled = await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')));
    expect(shuffled).toEqual([...before].reverse());
    await boardSection(page, 'bottom').getByRole('button', { name: 'Draw Player 1', exact: true }).click();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(5);
    await page.getByTestId('undo-move-host').click();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    expect(await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')))).toEqual(shuffled);
    await page.getByTestId('undo-move-host').click();
    expect(await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')))).toEqual(before);
    await expect(page.getByTestId('undo-move-host')).toBeDisabled();
  });

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

    await phaseSelect.selectOption('Main');
    await expect(phaseSelect).toHaveValue('Main');

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
