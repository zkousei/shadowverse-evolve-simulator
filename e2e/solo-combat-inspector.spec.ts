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

    await expect(page.getByText('ATTACK MODE')).toBeVisible();
    await expect(page.getByText('Select an enemy follower or leader for Token.')).toBeVisible();

    await zoneCards(page, 'field-guest').first().click();

    await expect(page.getByText('ATTACK MODE')).toBeHidden();
    await expect(page.getByTestId('card-inspector')).toBeHidden();
    await expect(page.getByText(/attacks/).first()).toBeVisible();
  });
});
