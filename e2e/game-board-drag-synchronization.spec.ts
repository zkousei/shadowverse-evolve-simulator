import { expect, test } from './helpers/test';
import { dragLocatorFromExposedCardPointToLocator, spawnDefaultToken, startKeyboardCardDrag, startSoloGame, zone, zoneCards } from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test('pointer drag follows its target when the viewport scrolls during movement', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await startSoloGame(page);
  await spawnDefaultToken(page, 'bottom');
  await page.evaluate(() => {
    let origin: { x: number; y: number } | undefined;
    const scrollDuringDrag = (event: PointerEvent) => {
      if (!event.buttons || !document.querySelector('[data-card-id][aria-pressed="true"]')) return;
      if (!origin) { origin = { x: event.clientX, y: event.clientY }; return; }
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 40) return;
      const before = window.scrollY;
      window.scrollBy(0, -180);
      document.documentElement.dataset.dragScroll = String(before - window.scrollY);
      document.removeEventListener('pointermove', scrollDuringDrag);
    };
    document.addEventListener('pointermove', scrollDuringDrag);
  });
  await dragLocatorFromExposedCardPointToLocator(page, zoneCards(page, 'field-host').first(), zone(page, 'cemetery-host'));
  await expect(page.locator('html')).toHaveAttribute('data-drag-scroll', '180');
  await expect(zoneCards(page, 'field-host')).toHaveCount(0);
  await expect(zoneCards(page, 'cemetery-host')).toHaveCount(0);
  await page.getByTestId('undo-move-host').click();
  await expect(zoneCards(page, 'field-host')).toHaveCount(1);
});

test('keyboard drag waits for delayed document key handling before testing Undo and cancellation', async ({ page }) => {
  await startSoloGame(page);
  await page.getByTestId('player-tracker-host-hp-increase').click();
  await page.evaluate(() => {
    // Simulate a busy browser delaying the sensor's document subscription.
    const add = document.addEventListener.bind(document);
    document.addEventListener = (...args: Parameters<typeof add>) => {
      if (args[0] === 'keydown') setTimeout(() => add(...args), 300);
      else add(...args);
    };
  });
  const card = zoneCards(page, 'hand-host').first();
  await startKeyboardCardDrag(page, card);
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('player-tracker-host')).toContainText('HP: 21');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('status').filter({ hasText: 'Dragging was cancelled.' })).toHaveCount(1);
  await expect(card).not.toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('player-tracker-host')).toContainText('HP: 20');
  await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
});
