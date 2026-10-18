import { expect, test } from '@playwright/test';
import path from 'node:path';
import { zoneCards, leaderZoneCards } from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test('closing the picker before the async continuation prevents import and a later load still works', async ({ page }) => {
  await page.goto('/deck-builder');
  const input = page.locator('input[type="file"]');
  await expect(input).toBeEnabled();
  await input.setInputFiles(path.resolve('public/sample-decks/constructed-royal-sample.json'));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('"Sample Constructed Royal" was saved.')).toBeVisible();
  await page.goto('/game?mode=solo');
  const open = page.getByRole('button', { name: 'Load Player 1 from My Decks', exact: true });
  await open.click();
  const picker = page.getByRole('dialog', { name: 'Load from My Decks' });
  // Perform both actions in one task, before the Promise continuation. This
  // exercises cancellation with the actual in-memory resolver and page wiring.
  await picker.getByRole('button', { name: 'Load', exact: true }).evaluate(button => {
    const close = Array.from(button.closest('[role="dialog"]')!.querySelectorAll('button'))
      .find(candidate => candidate.textContent?.trim() === 'Close')!;
    (button as HTMLButtonElement).click();
    close.click();
  });
  await expect(picker).toBeHidden();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(0);
  await open.click();
  await picker.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(picker).toBeHidden();
  await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(40);
  await expect(zoneCards(page, 'evolveDeck-host')).toHaveCount(10);
  await expect(leaderZoneCards(page, 'host')).toHaveCount(1);
});
