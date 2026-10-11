import { test, expect } from '@playwright/test';
import { spawnDefaultToken, startSoloGame, zone, zoneCards, dragLocatorFromExposedCardPointToLocator } from './helpers/gameBoard';

test.use({ locale: 'en-US' });
for (const touch of [false, true]) {
  test.describe(touch ? 'Tablet multi selection' : 'Desktop multi selection', () => {
    test.use({ viewport: { width: touch ? 1024 : 1440, height: 900 }, hasTouch: touch });
    test('selects both players’ cards and undoes their move together', async ({ page }) => {
      await startSoloGame(page);
      await spawnDefaultToken(page, 'bottom', 'field');
      await spawnDefaultToken(page, 'bottom', 'ex');
      await spawnDefaultToken(page, 'top', 'field');
      const field = zoneCards(page, 'field-host').first();
      const opponent = zoneCards(page, 'field-guest').first();
      const bar = page.getByTestId('board-multi-selection-bar');
      await bar.getByRole('button', { name: 'Select multiple', exact: true }).click();
      if (touch) { await field.tap(); await opponent.tap(); }
      else { await field.click(); await opponent.click(); }
      await expect(bar.getByRole('status')).toHaveText('2 selected');
      await zone(page, 'ex-host').getByRole('button', { name: 'Select all', exact: true }).click();
      await expect(bar.getByRole('status')).toHaveText('3 selected');
      await expect(opponent).toHaveAttribute('data-selection-tone', 'selected');
      await bar.getByRole('button', { name: 'Health -1', exact: true }).click();
      for (const zoneId of ['field-host', 'ex-host', 'field-guest']) {
        await expect(zoneCards(page, zoneId).first().getByText('0', { exact: true })).toBeVisible();
      }
      await bar.getByRole('button', { name: 'To cemetery', exact: true }).click();
      for (const zoneId of ['field-host', 'ex-host', 'field-guest']) {
        await expect(zoneCards(page, zoneId)).toHaveCount(0);
      }
      await page.getByTestId('undo-move-host').click();
      for (const zoneId of ['field-host', 'ex-host', 'field-guest']) {
        await expect(zoneCards(page, zoneId)).toHaveCount(1);
        await expect(zoneCards(page, zoneId).first().getByText('0', { exact: true })).toBeVisible();
        await expect(zoneCards(page, zoneId).first()).not.toHaveAttribute('data-selection-tone');
      }
    });
    test('adjusts a selection across field and EX, moves it and undoes the entire move', async ({ page }, testInfo) => {
      await startSoloGame(page);
      await spawnDefaultToken(page, 'bottom', 'field');
      await spawnDefaultToken(page, 'bottom', 'ex');
      const field = zoneCards(page, 'field-host').first();
      const ex = zoneCards(page, 'ex-host').first();
      const bar = page.getByTestId('board-multi-selection-bar');
      const header = page.getByTestId('gameboard-header');
      await expect(header.getByTestId('board-multi-selection-bar')).toBeVisible();
      const initialPlaymat = await page.getByTestId('board-playmat').boundingBox();
      await bar.getByRole('button', { name: 'Select multiple', exact: true }).click();
      if (touch) { await field.tap(); await ex.tap(); }
      else { await field.click(); await ex.click(); }
      await expect(bar.getByRole('status')).toHaveText('2 selected');
      expect((await page.getByTestId('board-playmat').boundingBox())?.y).toBe(initialPlaymat?.y);
      const exitButton = await bar.getByRole('button', { name: 'Exit selection', exact: true }).boundingBox();
      const headerBox = await header.boundingBox();
      expect(exitButton!.x + exitButton!.width).toBeLessThanOrEqual(headerBox!.x + headerBox!.width);
      await bar.getByRole('button', { name: 'Selection help', exact: true }).click();
      await expect(page.getByTestId('multi-selection-help')).toBeVisible();
      expect((await page.getByTestId('board-playmat').boundingBox())?.y).toBe(initialPlaymat?.y);
      await bar.getByRole('button', { name: 'Selection help', exact: true }).click();
      await page.screenshot({ path: testInfo.outputPath('selection.png') });
      await expect(field).toHaveAttribute('data-selection-tone', 'selected');
      await expect(ex).toHaveAttribute('data-selection-tone', 'selected');
      await bar.getByRole('button', { name: 'Health -1', exact: true }).click();
      await expect(field.getByText('0', { exact: true })).toBeVisible();
      await expect(ex.getByText('0', { exact: true })).toBeVisible();
      await expect(bar.getByRole('status')).toHaveText('2 selected');
      await bar.getByRole('button', { name: 'Rest', exact: true }).click();
      await expect(field).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)');
      await expect(ex).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)');
      await bar.getByRole('button', { name: 'To cemetery', exact: true }).click();
      await expect(zoneCards(page, 'field-host')).toHaveCount(0);
      await expect(zoneCards(page, 'ex-host')).toHaveCount(0);
      await expect(bar.getByRole('button', { name: 'Select multiple', exact: true })).toBeVisible();
      expect((await page.getByTestId('board-playmat').boundingBox())?.y).toBe(initialPlaymat?.y);
      await page.getByTestId('undo-move-host').click();
      await expect(zoneCards(page, 'field-host')).toHaveCount(1);
      await expect(zoneCards(page, 'ex-host')).toHaveCount(1);
      await expect(field.getByText('0', { exact: true })).toBeVisible();
      await expect(field).not.toHaveAttribute('data-selection-tone');
    });
  });
}

test('selects a three-card stack once and supports shortcut selection and zone select all', async ({ page }) => {
  await startSoloGame(page);
  await dragLocatorFromExposedCardPointToLocator(page, zoneCards(page, 'hand-host').first(), zone(page, 'field-host'));
  const root = zoneCards(page, 'field-host').first();
  const rootId = await root.getAttribute('data-card-id');
  await dragLocatorFromExposedCardPointToLocator(page, zoneCards(page, 'hand-host').first(), root);
  await dragLocatorFromExposedCardPointToLocator(page, zoneCards(page, 'hand-host').first(), root);
  await expect(zoneCards(page, 'field-host')).toHaveCount(3);
  const rootLocator = page.locator(`[data-card-id="${rootId}"]`);
  const top = zoneCards(page, 'field-host').filter({ hasNot: page.locator(`[data-card-id="${rootId}"]`) }).last();
  await top.click({ modifiers: ['Control'], position: { x: 4, y: 4 } });
  const bar = page.getByTestId('board-multi-selection-bar');
  await expect(bar.getByRole('status')).toHaveText('1 selected');
  await expect(rootLocator).toHaveAttribute('data-selection-tone', 'selected');
  await expect(top).toHaveAttribute('data-selection-tone', 'related');
  await bar.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await expect(bar.getByRole('status')).toHaveText('0 selected');
  await zone(page, 'field-host').getByRole('button', { name: 'Select all', exact: true }).click();
  await expect(bar.getByRole('status')).toHaveText('1 selected');
  await bar.getByRole('button', { name: 'Counter +1', exact: true }).click();
  await expect(top.getByTestId('generic-counter-badge')).toHaveText('Counter1');
  await expect(rootLocator.getByTestId('generic-counter-badge')).toHaveCount(0);
  await bar.getByRole('button', { name: 'Banish', exact: true }).click();
  await expect(zoneCards(page, 'field-host')).toHaveCount(0);
  await page.getByTestId('undo-move-host').click();
  await expect(zoneCards(page, 'field-host')).toHaveCount(3);
  await expect(top.getByTestId('generic-counter-badge')).toHaveText('Counter1');
});


test('undoes repeated mixed-side numeric batches together', async ({ page }) => {
  await startSoloGame(page);
  await spawnDefaultToken(page, 'bottom', 'field');
  await spawnDefaultToken(page, 'top', 'field');
  const own = zoneCards(page, 'field-host').first();
  const opponent = zoneCards(page, 'field-guest').first();
  const bar = page.getByTestId('board-multi-selection-bar');
  await bar.getByRole('button', { name: 'Select multiple', exact: true }).click();
  await own.click();
  await opponent.click();
  await bar.getByRole('button', { name: 'Counter +1', exact: true }).click();
  await bar.getByRole('button', { name: 'Counter +1', exact: true }).click();
  await bar.getByRole('button', { name: 'Counter -1', exact: true }).click();
  await expect(own.getByTestId('generic-counter-badge')).toHaveText('Counter1');
  await expect(opponent.getByTestId('generic-counter-badge')).toHaveText('Counter1');
  await page.getByTestId('undo-move-host').click();
  await expect(own.getByTestId('generic-counter-badge')).toBeHidden();
  await expect(opponent.getByTestId('generic-counter-badge')).toBeHidden();
  await expect(zoneCards(page, 'field-host')).toHaveCount(1);
  await expect(zoneCards(page, 'field-guest')).toHaveCount(1);
  await expect(page.getByTestId('undo-move-guest')).toBeEnabled();
});
