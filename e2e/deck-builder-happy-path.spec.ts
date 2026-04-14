import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const constructedSampleDeckPath = path.resolve(
  process.cwd(),
  'public/sample-decks/constructed-royal-sample.json',
);

test.use({ locale: 'en-US' });

const resetBrowserStorage = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
  });
};

test.describe('Deck Builder Happy Path', () => {
  test('imports a legal deck, saves it to My Decks, reloads it, and exports JSON', async ({ page }) => {
    await resetBrowserStorage(page);
    await page.goto('/deck-builder');

    await expect(page.getByRole('heading', { name: /Card Library/ })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(constructedSampleDeckPath);

    await expect(page.getByPlaceholder('Deck Name')).toHaveValue('Sample Constructed Royal');
    await expect(page.getByRole('heading', { name: /Main Deck/ })).toContainText('40/50');
    await expect(page.getByRole('heading', { name: /Evolve Deck/ })).toContainText('10/10');
    await expect(page.getByRole('heading', { name: /Leader/ })).toContainText('1/1');
    await expect(page.getByRole('button', { name: 'Export' })).toBeEnabled();

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('"Sample Constructed Royal" was saved.')).toBeVisible();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'My Decks' }).click();
    const myDecksDialog = page.getByRole('dialog', { name: 'My Decks' });
    await expect(myDecksDialog).toBeVisible();
    await expect(myDecksDialog.getByText('Sample Constructed Royal')).toBeVisible();
    await myDecksDialog.getByRole('button', { name: 'Load' }).click();
    await expect(myDecksDialog).toBeHidden();

    await page.evaluate(() => {
      window.localStorage.removeItem('sve.deckBuilderDraft.v1');
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: /Card Library/ })).toBeVisible();

    const startFreshButton = page.getByRole('button', { name: 'Start Fresh' });
    if (await startFreshButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startFreshButton.click();
    }

    await page.getByRole('button', { name: 'My Decks' }).click();
    const reopenedMyDecksDialog = page.getByRole('dialog', { name: 'My Decks' });
    await expect(reopenedMyDecksDialog.getByText('Sample Constructed Royal')).toBeVisible();
    await reopenedMyDecksDialog.getByRole('button', { name: 'Load' }).click();

    await expect(page.getByPlaceholder('Deck Name')).toHaveValue('Sample Constructed Royal');
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Sample_Constructed_Royal.json');
  });
});
