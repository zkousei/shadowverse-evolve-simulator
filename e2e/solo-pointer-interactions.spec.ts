import { expect, test } from './helpers/test';
import { hoverExposedCardPoint, spawnDefaultToken, startSoloGame, zoneCards } from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test('a stationary card press opens details without starting a drag or swallowing Close', async ({ page }) => {
  await startSoloGame(page);
  await spawnDefaultToken(page, 'bottom', 'field');
  const card = zoneCards(page, 'field-host').first();
  await hoverExposedCardPoint(page, card);
  await page.mouse.down();
  await expect(card).not.toHaveAttribute('aria-pressed', 'true');
  await page.mouse.up();
  const inspector = page.getByTestId('card-inspector');
  await expect(inspector).toBeVisible();
  await inspector.getByRole('button', { name: 'Close' }).click();
  await expect(inspector).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'was dropped' })).toHaveCount(0);
});

test('small pointer movement stays a tap; an activated drag returning to its origin does not inspect', async ({ page }) => {
  await startSoloGame(page);
  await spawnDefaultToken(page, 'bottom', 'field');
  const card = zoneCards(page, 'field-host').first();
  const origin = await hoverExposedCardPoint(page, card);
  await page.mouse.down();
  await page.mouse.move(origin.x + 2, origin.y + 2);
  await expect(card).not.toHaveAttribute('aria-pressed', 'true');
  await page.mouse.up();
  const inspector = page.getByTestId('card-inspector');
  await expect(inspector).toBeVisible();
  await inspector.getByRole('button', { name: 'Close' }).click();
  await expect(inspector).toBeHidden();

  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x + 12, origin.y, { steps: 2 });
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(origin.x, origin.y, { steps: 2 });
  await page.mouse.up();
  await expect(card).not.toHaveAttribute('aria-pressed', 'true');
  await expect(inspector).toBeHidden();
  await expect(zoneCards(page, 'field-host')).toHaveCount(1);
});


test('cancelling a pointer drag does not open details when the mouse is released', async ({ page }) => {
  await startSoloGame(page);
  await spawnDefaultToken(page, 'bottom', 'field');
  const card = zoneCards(page, 'field-host').first();
  const origin = await hoverExposedCardPoint(page, card);
  await page.mouse.down();
  await page.mouse.move(origin.x + 12, origin.y, { steps: 2 });
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(card).not.toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: 'Dragging was cancelled.' })).toHaveCount(1);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.up();
  await expect(page.getByTestId('card-inspector')).toBeHidden();
  await expect(zoneCards(page, 'field-host')).toHaveCount(1);
  await hoverExposedCardPoint(page, card);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByTestId('card-inspector')).toBeVisible();
});


test('Escape cancels a press before the pointer drag activates', async ({ page }) => {
  await startSoloGame(page);
  await spawnDefaultToken(page, 'bottom', 'field');
  const card = zoneCards(page, 'field-host').first();
  await hoverExposedCardPoint(page, card);
  await page.mouse.down();
  await expect(card).not.toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.getByTestId('card-inspector')).toBeHidden();
  await hoverExposedCardPoint(page, card);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByTestId('card-inspector')).toBeVisible();
});
