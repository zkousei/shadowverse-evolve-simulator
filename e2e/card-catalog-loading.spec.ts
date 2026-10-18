import { test, expect } from './helpers/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { leaderZoneCards, zoneCards } from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test('DeckBuilder uses generated data and GameBoard restores saved decks from index plus selected details', async ({ page }) => {
  const requests = { '/cards_detailed.json': 0, '/cards_preview.json': 0 };
  const generatedRequests: string[] = [];
  let holdResponses = false;
  let releaseResponses!: () => void;
  const responsesReady = new Promise<void>(resolve => { releaseResponses = resolve; });

  await page.route(/\/cards_(detailed|preview)\.json$/, async route => {
    const pathname = new URL(route.request().url()).pathname as keyof typeof requests;
    requests[pathname] += 1;
    if (holdResponses) await responsesReady;
    await route.fulfill({
      contentType: 'application/json',
      body: readFileSync(path.resolve(process.cwd(), `public${pathname}`), 'utf8'),
    });
  });

  await page.route('**/card-catalog/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    generatedRequests.push(pathname);
    if (holdResponses) await responsesReady;
    await route.continue();
  });

  try {
    await page.goto('/deck-builder');
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeEnabled();
    await fileInput.setInputFiles(path.resolve(process.cwd(), 'public/sample-decks/constructed-royal-sample.json'));
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('"Sample Constructed Royal" was saved.')).toBeVisible();
    expect(requests).toEqual({ '/cards_detailed.json': 0, '/cards_preview.json': 0 });

    generatedRequests.length = 0;
    holdResponses = true;
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Solo', exact: true }).click();
    await expect(page).toHaveURL(/\/game\?mode=solo$/);

    const loadDeck = page.getByRole('button', { name: 'Load Player 1 from My Decks', exact: true });
    await expect(loadDeck).toBeDisabled();
    releaseResponses();
    await expect(loadDeck).toBeEnabled();
    // Development Strict Mode opens twice; neither opening may fetch details.
    expect(generatedRequests.filter(path => path.endsWith('/manifest.json'))).toHaveLength(2);
    expect(generatedRequests.filter(path => path.endsWith('/index.json'))).toHaveLength(2);
    expect(generatedRequests).toHaveLength(4);
    expect(generatedRequests.some(path => path.includes("/details/"))).toBe(false);
    await loadDeck.click();
    const picker = page.getByRole('dialog', { name: 'Load from My Decks' });
    await expect(picker.getByText('Sample Constructed Royal')).toBeVisible();
    await picker.getByRole('button', { name: 'Load', exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(40);
    await expect(zoneCards(page, 'evolveDeck-host')).toHaveCount(10);
    await expect(leaderZoneCards(page, 'host')).toHaveCount(1);
    expect(requests).toEqual({ '/cards_detailed.json': 0, '/cards_preview.json': 0 });
    const details = generatedRequests.filter(path => path.includes('/details/'));
    expect(details.length).toBeGreaterThan(0);
    expect(new Set(details).size).toBe(details.length);
  } finally {
    releaseResponses();
  }
});
