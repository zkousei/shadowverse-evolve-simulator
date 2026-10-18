import { expect, test } from '../helpers/test';

test.use({ locale: 'en-US' });

test('an empty production GameBoard requests only one manifest and index, with no details or legacy JSON', async ({ page }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/card-catalog/') || /\/cards_(detailed|preview)\.json$/.test(path)) requests.push(path);
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game?mode=solo');
  await expect(page.getByRole('button', { name: 'Load Player 1 from My Decks', exact: true })).toBeEnabled();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toBe('/card-catalog/manifest.json');
  expect(requests[1]).toMatch(/^\/card-catalog\/versions\/[a-f0-9]{64}\/index\.json$/);
  expect(errors).toEqual([]);
});
