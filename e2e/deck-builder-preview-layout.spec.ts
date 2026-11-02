import { test, expect } from './helpers/test';
import { buildGeneratedCatalogFixture, routeGeneratedCatalogFixture } from './helpers/generatedCatalog';

const name = 'Card preview with a long title that wraps on narrow screens';
const fixture = buildGeneratedCatalogFixture([{
  id: 'LAYOUT-001', name, image: '/card_back.png',
  card_kind_normalized: 'follower', deck_section: 'main',
  ability_text: 'A long ability description for a scrollable card preview.\n'.repeat(40),
}]);

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 640 }]) {
  test.describe(`Card preview ${viewport.width}x${viewport.height}`, () => {
    test.use({ locale: 'en-US', viewport });
    test('keeps the entire close control inside the dialog and clickable', async ({ page }, testInfo) => {
      await routeGeneratedCatalogFixture(page, fixture);
      await page.goto('/deck-builder');
      await page.getByRole('button', { name: `Preview ${name}`, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: `${name} preview`, exact: true });
      const close = dialog.getByRole('button', { name: 'Close card preview' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('A long ability description for a scrollable card preview.', { exact: false })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('card-preview.png') });
      const bounds = await dialog.boundingBox();
      const button = await close.boundingBox();
      if (!bounds || !button) throw new Error('Expected a visible dialog and close control');
      expect(button.y).toBeGreaterThanOrEqual(bounds.y + 4);
      expect(button.x + button.width).toBeLessThanOrEqual(bounds.x + bounds.width - 4);
      // Check the visible edge, not only the center of a partially clipped button.
      expect(await close.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return document.elementFromPoint(rect.right - 2, rect.top + rect.height / 2)?.closest('button') === element;
      })).toBe(true);
      await close.click();
      await expect(dialog).toBeHidden();
    });
  });
}
