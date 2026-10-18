import { expect, test } from '@playwright/test';
import path from 'node:path';
import { zoneCards, leaderZoneCards } from './helpers/gameBoard';

test.use({ locale: 'en-US' });

for (const change of ['rename', 'delete'] as const) {
  test(`rechecks a saved deck after another tab ${change === 'rename' ? 'renames' : 'deletes'} it`, async ({ page, context }) => {
    await page.goto('/deck-builder');
    const input = page.locator('input[type="file"]');
    await expect(input).toBeEnabled();
    await input.setInputFiles(path.resolve('public/sample-decks/constructed-royal-sample.json'));
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('"Sample Constructed Royal" was saved.')).toBeVisible();
    await page.goto('/game?mode=solo');
    await page.getByRole('button', { name: 'Load Player 1 from My Decks', exact: true }).click();
    const picker = page.getByRole('dialog', { name: 'Load from My Decks' });
    await expect(picker.getByText('Sample Constructed Royal', { exact: true })).toBeVisible();
    const originalIds = await zoneCards(page, 'mainDeck-host').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-card-id')).sort());

    const otherTab = await context.newPage();
    await otherTab.goto('/');
    await otherTab.evaluate(action => {
      const key = 'sve.savedDecks.v1';
      const saved = JSON.parse(localStorage.getItem(key)!) as { decks: Array<{ name: string }> };
      if (action === 'rename') saved.decks[0].name = 'Changed in another tab';
      else saved.decks = [];
      localStorage.setItem(key, JSON.stringify(saved));
    }, change);
    await otherTab.close();

    await picker.getByRole('button', { name: 'Load', exact: true }).click();
    await expect(picker).toBeVisible();
    await expect(picker.getByText('Sample Constructed Royal', { exact: true })).toBeHidden();
    expect(await zoneCards(page, 'mainDeck-host').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-card-id')).sort())).toEqual(originalIds);

    if (change === 'rename') {
      await expect(picker.getByText('Changed in another tab', { exact: true })).toBeVisible();
      await picker.getByRole('button', { name: 'Load', exact: true }).click();
      await expect(picker).toBeHidden();
      await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(40);
      await expect(zoneCards(page, 'evolveDeck-host')).toHaveCount(10);
      await expect(leaderZoneCards(page, 'host')).toHaveCount(1);
    } else {
      await expect(picker.getByRole('button', { name: 'Load', exact: true })).toHaveCount(0);
    }
  });
}
