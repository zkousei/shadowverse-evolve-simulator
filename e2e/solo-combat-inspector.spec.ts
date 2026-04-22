import { test, expect } from '@playwright/test';
import {
  spawnDefaultToken,
  startSoloGame,
  zoneCards,
} from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test.describe('Solo Combat and Inspector Flows', () => {
  test('opens the card inspector and closes it from the popover', async ({ page }) => {
    await startSoloGame(page);
    await spawnDefaultToken(page, 'bottom', 'field');

    await zoneCards(page, 'field-host').first().click();

    const inspector = page.getByTestId('card-inspector');
    await expect(inspector).toBeVisible();
    await expect(inspector).toContainText('Token');
    await expect(inspector).toContainText('Ability Text');

    await inspector.getByRole('button', { name: 'Close' }).click();
    await expect(inspector).toBeHidden();
  });

  test('declares an attack by selecting a target while attack mode is active', async ({ page }) => {
    await startSoloGame(page);
    await spawnDefaultToken(page, 'bottom', 'field');
    await spawnDefaultToken(page, 'top', 'field');

    const attacker = zoneCards(page, 'field-host').first();
    await attacker.hover();
    await attacker.getByRole('button', { name: 'Attack' }).click({ force: true });

    await expect(page.getByTestId('board-playmat')).toHaveAttribute('data-attack-mode-active', 'true');

    await zoneCards(page, 'field-guest').first().click();

    await expect(page.getByTestId('board-playmat')).toHaveAttribute('data-attack-mode-active', 'false');
    await expect(page.getByTestId('card-inspector')).toBeHidden();
    await expect(page.getByText(/attacks/).first()).toBeVisible();
  });

  test('can stand a rested follower even when adjacent field cards are present', async ({ page }) => {
    await startSoloGame(page);
    await spawnDefaultToken(page, 'bottom', 'field');
    await spawnDefaultToken(page, 'bottom', 'field');

    const secondFollower = zoneCards(page, 'field-host').nth(1);

    await secondFollower.hover();
    await secondFollower.getByRole('button', { name: 'REST' }).click();
    await secondFollower.hover();
    await expect(secondFollower.getByRole('button', { name: 'STAND' })).toBeVisible();
    await expect(secondFollower.getByRole('button', { name: 'Attack' })).toHaveCount(0);

    await secondFollower.getByRole('button', { name: 'STAND' }).click();
    await secondFollower.hover();
    await expect(secondFollower.getByRole('button', { name: 'REST' })).toBeVisible();
    await expect(secondFollower.getByRole('button', { name: 'Attack' })).toBeVisible();
  });
});
