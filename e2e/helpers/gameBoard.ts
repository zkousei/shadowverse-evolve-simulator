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

  await dragLocatorFromExposedCardPointToLocator(page, sourceCard, targetZone);
};

export const hoverExposedCardPoint = async (page: Page, source: Locator) => {
  await source.scrollIntoViewIfNeeded();
  const findExposedPoint = () => source.evaluate(element => {
    const rect = element.getBoundingClientRect();
    for (let y = rect.top + 2; y < rect.bottom - 2; y += 4) {
      for (let x = rect.left + 2; x < rect.right - 2; x += 4) {
        const exposed = [[0, 0], [2, 2]].every(([dx, dy]) => {
          const hit = document.elementFromPoint(x + dx, y + dy);
          return hit?.closest('[data-card-id]') === element && !hit.closest('button');
        });
        if (exposed) return { x, y };
      }
    }
    return null;
  });
  const hoverPoint = await findExposedPoint();
  if (!hoverPoint) throw new Error('No exposed point on the source card.');
  await page.mouse.move(hoverPoint.x, hoverPoint.y);
  // Hover reveals quick-action buttons. Let them render before choosing the
  // drag origin, so pointer-down cannot accidentally increment a counter.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const sourcePoint = await findExposedPoint();
  if (!sourcePoint) throw new Error('No exposed point after card quick actions appeared.');
  await page.mouse.move(sourcePoint.x, sourcePoint.y);
  return sourcePoint;
};

export const dragLocatorFromExposedCardPointToLocator = async (
  page: Page,
  source: Locator,
  target: Locator
) => {
  await target.scrollIntoViewIfNeeded();
  const sourcePoint = await hoverExposedCardPoint(page, source);
  const sourceBox = await source.boundingBox();
  if (!sourceBox) throw new Error('The source card has no bounding box.');
  const sourceId = await source.getAttribute('data-card-id');
  const targetCardId = await target.getAttribute('data-card-id');
  const targetId = targetCardId ?? (await target.getAttribute('data-testid'))?.replace(/^zone-/, '');
  if (!sourceId || !targetId) throw new Error('Expected card/zone identifiers for the drag.');
  // A zone's cards are droppable too. The game resolves their zone on drop.
  // Explicit card targets still require that exact card (important for stacks).
  const targetIds = [targetId];
  if (!targetCardId) {
    targetIds.push(...await target.locator('[data-card-id]').evaluateAll(elements =>
      elements.map(element => element.getAttribute('data-card-id')!).filter(Boolean)));
  }
  const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const announcement = (action: string) => new RegExp(
    `Draggable item ${escapePattern(sourceId)} was ${action} droppable area (?:${targetIds.map(escapePattern).join('|')})(?:\\.|$)`,
  );
  await page.mouse.down();
  // Cross the pointer activation distance before waiting for DnD to activate.
  await page.mouse.move(sourcePoint.x + 10, sourcePoint.y, { steps: 2 });
  await expect(source).toHaveAttribute('aria-pressed', 'true');
  const targetBox = await target.boundingBox();
  if (!targetBox) throw new Error('The drag target has no bounding box.');
  await page.mouse.move(
    // Align card centers, accounting for the point where the card was grabbed.
    // Moving a corner grab to the target center overlaps an attached card instead.
    targetBox.x + targetBox.width / 2 - sourceBox.width / 2 + sourcePoint.x - sourceBox.x,
    targetBox.y + targetBox.height / 2 - sourceBox.height / 2 + sourcePoint.y - sourceBox.y,
    { steps: 12 }
  );
  // Releasing before collision detection has rendered can drop onto the old target.
  await expect(page.getByRole('status').filter({
    hasText: announcement('moved over'),
  })).toHaveCount(1);
  await page.mouse.up();
  await expect(page.getByRole('status').filter({
    hasText: announcement('dropped over'),
  })).toHaveCount(1);
  // dnd-kit keeps its document click guard for 50ms after a real pointer drag
  // (AbstractPointerSensor.detach). It has no DOM completion signal. Respect
  // that guard before the caller clicks Undo or another control.
  await page.waitForTimeout(50);
};

export const spawnDefaultToken = async (
  page: Page,
  side: 'top' | 'bottom',
  destination: 'ex' | 'field' = 'field'
) => {
  const playerLabel = side === 'bottom' ? 'Player 1' : 'Player 2';

  await boardSection(page, side).getByRole('button', { name: `Spawn ${playerLabel} Token` }).click();

  const dialog = page.getByRole('dialog', { name: 'Generate Tokens' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Generate' })).toBeDisabled();

  await dialog.getByRole('button', { name: destination === 'field' ? 'Field' : 'EX Area' }).click();
  await dialog.getByRole('button', { name: 'Increase Token count' }).click();
  await expect(dialog).toContainText('1 selected');

  await dialog.getByRole('button', { name: 'Generate' }).click();
  await expect(dialog).toBeHidden();
};

export const openMainDeckActions = async (page: Page, role: 'host' | 'guest') => {
  const mainDeckSection = zone(page, `mainDeck-${role}`).locator('..');
  const actionsButton = mainDeckSection.getByRole('button', { name: 'Actions' });

  await zone(page, `mainDeck-${role}`).scrollIntoViewIfNeeded();
  if (await actionsButton.count()) {
    await actionsButton.click();
    return mainDeckSection;
  }

  const mainDeckCard = zoneCards(page, `mainDeck-${role}`).first();
  if (await mainDeckCard.count()) {
    await expect(mainDeckCard).toBeVisible();
    await mainDeckCard.click();
  } else {
    await zone(page, `mainDeck-${role}`).click();
  }

  const touchSheet = page.getByTestId('gameboard-touch-action-sheet');
  await expect(touchSheet).toBeVisible();

  return touchSheet;
};
