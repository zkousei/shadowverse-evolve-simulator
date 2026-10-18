import { test, expect } from './helpers/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildGeneratedCatalogFixture, routeGeneratedCatalogFixture } from './helpers/generatedCatalog';

test.use({ locale: 'en-US' });

for (const lastCard of [51, 151]) {
  test(`recovers an image without leaving the final page after ${lastCard === 51 ? 'one page change' : 'rapid forward and backward paging'}`, async ({ page }) => {
    const cards = Array.from({ length: lastCard }, (_, index) => ({
      id: `IMAGE-${index + 1}`,
      name: `Image Card ${index + 1}`,
      image: `/e2e-card-art/${index + 1}.png`,
      card_kind_normalized: 'follower',
      deck_section: 'main',
    }));
    await routeGeneratedCatalogFixture(page, buildGeneratedCatalogFixture(cards));
    const artwork = readFileSync(path.resolve(process.cwd(), 'public/card_back.png'));
    let nextPageImageRequests = 0;
    await page.route('**/e2e-card-art/*.png', async route => {
      if (new URL(route.request().url()).pathname === `/e2e-card-art/${lastCard}.png`) {
        nextPageImageRequests += 1;
        if (nextPageImageRequests === 1) {
          await route.abort('failed');
          return;
        }
      }
      await route.fulfill({ contentType: 'image/png', body: artwork });
    });

    await page.goto('/deck-builder');
    await expect(page.getByRole('button', { name: 'Preview Image Card 1', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    if (lastCard === 151) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: 'Prev', exact: true }).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    const card = page.getByRole('button', { name: `Preview Image Card ${lastCard}`, exact: true });
    await expect(card).toBeVisible();
    const image = card.getByRole('img', { name: `Image Card ${lastCard}`, exact: true });
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    expect(nextPageImageRequests).toBe(2);
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  });
}
