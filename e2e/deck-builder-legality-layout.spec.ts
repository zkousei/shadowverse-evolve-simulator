import { expect, test } from './helpers/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
type Translations = typeof import('../src/i18n/en/translation.json');
const en = JSON.parse(readFileSync(resolve('src/i18n/en/translation.json'), 'utf8')) as Translations;
const ja = JSON.parse(readFileSync(resolve('src/i18n/ja/translation.json'), 'utf8')) as Translations;

const deckPath = resolve('public/sample-decks/constructed-royal-sample.json');
const deck = JSON.parse(readFileSync(deckPath, 'utf8')) as { mainDeck: { id: string; name: string }[] };
// Fourteen real, unrestricted cards make a legal 40-card deck while keeping
// this layout contract independent of downloading the entire sample catalog.
const mainCards = deck.mainDeck.slice(0, 14);
const card = [...mainCards.slice(0, 13)].sort((a, b) => a.id.localeCompare(b.id))[0];
const importedDeck = { ...deck, mainDeck: mainCards.flatMap((entry, index) =>
  Array.from({ length: index < 13 ? 3 : 1 }, () => entry)), evolveDeck: [] };

for (const locale of ['en-US', 'ja-JP']) {
  for (const viewport of [{ width: 1440, height: 1100 }, { width: 900, height: 650 }]) {
    test.describe(`${locale} ${viewport.width}x${viewport.height}`, () => {
      test.use({ locale, viewport });
      test('keeps quantity buttons fixed across legal/illegal transitions', async ({ page }, testInfo) => {
        const text = locale === 'ja-JP' ? ja : en;
        await page.goto('/deck-builder');
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeEnabled();
        await fileInput.setInputFiles({ name: 'layout-audit.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(importedDeck)) });
        const heading = page.getByRole('heading', { name: new RegExp(`^${text.deckBuilder.deckArea.mainDeck}`) });
        await expect(heading).toContainText('40/50');
        const exportButton = page.getByRole('button', { name: text.deckBuilder.deckArea.actions.export, exact: true });
        await expect(exportButton).toBeEnabled();
        await page.getByRole('button', { name: text.deckBuilder.deckArea.actions.save, exact: true }).click();
        const rows = heading.locator('xpath=following-sibling::div[1]');
        const row = rows.getByText(card.name, { exact: true }).locator('..').locator('..');
        const minus = row.getByTitle(text.deckBuilder.deckArea.actions.removeMain, { exact: true });
        const plus = row.getByTitle(text.deckBuilder.addActions.mainLabel, { exact: true });
        await minus.scrollIntoViewIfNeeded();
        const beforeMinus = await minus.boundingBox();
        const beforePlus = await plus.boundingBox();
        if (!beforeMinus || !beforePlus) throw new Error('Expected visible quantity controls');
        const assertPositions = async () => {
          for (const [button, original] of [[minus, beforeMinus], [plus, beforePlus]] as const) {
            const current = await button.boundingBox();
            expect(current).not.toBeNull();
            expect(Math.abs(current!.y - original.y)).toBeLessThan(1);
            expect(Math.abs(current!.x - original.x)).toBeLessThan(1);
          }
        };
        for (let attempt = 0; attempt < 3; attempt++) {
          // Use the original pointer positions: locator.click would follow a
          // displaced button and hide the regression this test protects.
          await page.mouse.click(beforeMinus.x + beforeMinus.width / 2, beforeMinus.y + beforeMinus.height / 2);
          await expect(heading).toContainText('39/50');
          await expect(exportButton).toBeDisabled();
          await assertPositions();
          await page.mouse.click(beforePlus.x + beforePlus.width / 2, beforePlus.y + beforePlus.height / 2);
          await expect(heading).toContainText('40/50');
          await expect(exportButton).toBeEnabled();
          await assertPositions();
        }
        // The summary remains compact; full issue text is available without
        // changing the list layout. Verify keyboard focus in the real browser.
        await page.mouse.click(beforeMinus.x + beforeMinus.width / 2, beforeMinus.y + beforeMinus.height / 2);
        await expect(exportButton).toBeDisabled();
        await assertPositions();
        await page.screenshot({ path: testInfo.outputPath('quantity-controls.png') });
        const details = page.getByRole('button', { name: text.deckBuilder.deckRule.validationDetailsAria });
        await details.click();
        const dialog = page.getByRole('dialog', { name: text.deckBuilder.deckRule.validationDialogTitle });
        await expect(dialog).toBeVisible();
        const close = dialog.getByRole('button', { name: text.common.buttons.close });
        await expect(close).toBeFocused();
        const results = dialog.getByRole('region', { name: text.deckBuilder.deckRule.validationResults });
        await page.keyboard.press('Tab');
        await expect(results).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(close).toBeFocused();
        const issue = text.deckBuilder.validation.mainDeckTooSmall.replaceAll('{{expected}}', '40').replaceAll('{{actual}}', '39');
        await expect(dialog.getByText(issue, { exact: true })).toBeVisible();
        const dialogBox = await dialog.boundingBox();
        expect(dialogBox).not.toBeNull();
        expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
        expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport.height);
        await page.screenshot({ path: testInfo.outputPath('validation-details.png') });
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(details).toBeFocused();
      });
    });
  }
}
