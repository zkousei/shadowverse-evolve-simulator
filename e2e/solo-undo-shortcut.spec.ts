import { test, expect } from '@playwright/test';
import { boardSection, openMainDeckActions, startSoloGame, zoneCards } from './helpers/gameBoard';

test.use({ locale: 'en-US' });

for (const modifier of ['Control', 'Meta']) {
  test(`${modifier}+Z restores normal Undo groups and movement without undoing the turn`, async ({ page }) => {
    await startSoloGame(page);
    await boardSection(page, 'bottom').getByRole('button', { name: 'End Player 1 Turn' }).click();
    await boardSection(page, 'bottom').getByRole('button', { name: 'Draw Player 1', exact: true }).click();
    const increase = page.getByTestId('player-tracker-host-hp-increase');
    await increase.click(); await increase.click();
    const tracker = page.getByTestId('player-tracker-host');
    await expect(tracker.getByText('HP: 22', { exact: true })).toBeVisible();
    await page.keyboard.press(`${modifier}+Shift+z`);
    await expect(tracker.getByText('HP: 22', { exact: true })).toBeVisible();
    await page.keyboard.down(modifier);
    await page.keyboard.down('z');
    await expect(tracker.getByText('HP: 20', { exact: true })).toBeVisible();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(5);
    await page.keyboard.down('z');
    await expect(zoneCards(page, 'hand-host')).toHaveCount(5);
    await page.keyboard.up('z');
    await page.keyboard.up(modifier);
    await expect(page.getByRole('status').filter({ hasText: 'stat adjustments' })).toHaveCount(0);
    await page.keyboard.press(`${modifier}+z`);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    await expect(page.getByRole('status').filter({ hasText: 'undid card movement' })).toContainText('Hand → Deck: 1');
    await expect(boardSection(page, 'top')).toHaveAttribute('data-turn-active', 'true');
    await expect(zoneCards(page, 'hand-guest')).toHaveCount(5);
    await expect(page.getByTestId('undo-move-host')).toBeDisabled();
    await page.keyboard.press(`${modifier}+z`);
    await expect(boardSection(page, 'top')).toHaveAttribute('data-turn-active', 'true');
    await expect(page.getByRole('dialog', { name: 'Undo Last End Turn' })).toHaveCount(0);
  });
}

test('preserves pending numeric Undo behind deck actions, a count input, and turn confirmation', async ({ page }) => {
  await startSoloGame(page);
  await boardSection(page, 'bottom').getByRole('button', { name: 'End Player 1 Turn' }).click();
  await page.getByTestId('player-tracker-host-hp-increase').click();
  const tracker = page.getByTestId('player-tracker-host');
  const menu = await openMainDeckActions(page, 'host');
  await page.keyboard.press('Control+z');
  await expect(tracker.getByText('HP: 21', { exact: true })).toBeVisible();
  await menu.getByRole('button', { name: 'Look Top (N)' }).click();
  const dialog = page.getByRole('dialog', { name: 'How many cards to look at?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Other', exact: true }).click();
  await dialog.getByRole('spinbutton', { name: 'Custom card count' }).fill('2');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Meta+z');
  await expect(dialog).toBeVisible();
  await expect(tracker.getByText('HP: 21', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: /UNDO LAST END TURN/ }).click();
  const turnDialog = page.getByRole('dialog', { name: 'Undo Last End Turn' });
  await page.keyboard.press('Control+z');
  await expect(turnDialog).toBeVisible();
  await expect(tracker.getByText('HP: 21', { exact: true })).toBeVisible();
  await turnDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.keyboard.press('Control+z');
  await expect(tracker.getByText('HP: 20', { exact: true })).toBeVisible();
  await expect(boardSection(page, 'top')).toHaveAttribute('data-turn-active', 'true');
});

for (const modifier of ['Control', 'Meta']) {
  test(`${modifier}+Z blocks Undo during keyboard drag and restores it after drag cancellation`, async ({ page }) => {
    await startSoloGame(page);
    await page.getByTestId('player-tracker-host-hp-increase').click();
    const tracker = page.getByTestId('player-tracker-host');
    await expect(tracker.getByText('HP: 21', { exact: true })).toBeVisible();
    const card = zoneCards(page, 'hand-host').first();
    await card.focus();
    await page.keyboard.press('Space');
    // Wait for DnD activation and measuring before sending more sensor keys.
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('status').filter({ hasText: 'was moved over droppable area' })).toHaveCount(1);
    await page.keyboard.press(`${modifier}+z`);
    await expect(tracker.getByText('HP: 21', { exact: true })).toBeVisible();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('status').filter({ hasText: 'Dragging was cancelled.' })).toHaveCount(1);
    await expect(card).not.toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press(`${modifier}+z`);
    await expect(tracker.getByText('HP: 20', { exact: true })).toBeVisible();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
  });
}
