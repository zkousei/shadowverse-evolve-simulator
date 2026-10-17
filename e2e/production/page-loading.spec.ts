import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { leaderZoneCards, startSoloGame, zoneCards } from '../helpers/gameBoard';

type Chunk = { file: string; imports?: string[]; isDynamicEntry?: boolean };
const manifest = JSON.parse(readFileSync(path.resolve(process.cwd(), 'dist/.vite/manifest.json'), 'utf8')) as Record<string, Chunk>;
const pageFile = (page: 'DeckBuilder' | 'GameBoard') => {
  const chunk = manifest[`src/pages/${page}.tsx`];
  expect(chunk?.isDynamicEntry).toBe(true);
  return chunk.file;
};
const staticFiles = (key: string, files = new Set<string>()): Set<string> => {
  const chunk = manifest[key];
  if (files.has(chunk.file)) return files;
  files.add(chunk.file);
  for (const dependency of chunk.imports ?? []) staticFiles(dependency, files);
  return files;
};

test.use({ locale: 'en-US' });

type PageName = 'DeckBuilder' | 'GameBoard';
const pageUrl = (name: PageName) => name === 'DeckBuilder' ? '/deck-builder' : '/game?mode=solo';
const expectPage = async (page: Page, name: PageName) => {
  if (name === 'DeckBuilder') {
    await expect(page.getByRole('heading', { name: 'Card Library' })).toBeVisible();
  } else {
    await expect(page.getByTestId('board-section-bottom')).toBeVisible();
  }
};
const navigateToPage = async (page: Page, name: PageName) => {
  if (name === 'DeckBuilder') {
    await page.getByRole('link', { name: 'Deck Builder', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Solo', exact: true }).click();
  }
};

test('keeps page-specific chunks out of the initial home load', async ({ page }) => {
  const deckFile = pageFile('DeckBuilder');
  const gameFile = pageFile('GameBoard');
  const initial = staticFiles('index.html');
  expect(initial.has(deckFile)).toBe(false);
  expect(initial.has(gameFile)).toBe(false);
  const requested = new Set<string>();
  page.on('request', request => requested.add(new URL(request.url()).pathname));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Shadowverse Evolve/ })).toBeVisible();
  expect(requested.has(`/${deckFile}`)).toBe(false);
  expect(requested.has(`/${gameFile}`)).toBe(false);
  await page.getByRole('link', { name: 'Deck Builder', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Card Library' })).toBeVisible();
  expect(requested.has(`/${deckFile}`)).toBe(true);
  expect(requested.has(`/${gameFile}`)).toBe(false);
});

for (const name of ['DeckBuilder', 'GameBoard'] as const) {
  test(`${name} keeps navigation usable while its chunk is delayed`, async ({ page }) => {
    const file = pageFile(name);
    let release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/${file}`, async route => {
      await ready;
      await route.continue();
    });
    try {
      await page.goto(pageUrl(name), { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('status')).toHaveText('Loading page…');
      await page.getByRole('link', { name: 'Home', exact: true }).click();
      await expect(page.getByRole('heading', { name: /Shadowverse Evolve/ })).toBeVisible();
      await navigateToPage(page, name);
      await expect(page.getByRole('status')).toHaveText('Loading page…');
      release();
      await expectPage(page, name);
    } finally {
      release();
    }
  });

  test(`${name} recovers a failed chunk only after an explicit reload`, async ({ page }) => {
    const file = pageFile(name);
    let attempts = 0;
    let documentRequests = 0;
    page.on('request', request => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests += 1;
    });
    await page.route(`**/${file}`, async route => {
      attempts += 1;
      if (attempts === 1) await route.abort('failed');
      else await route.continue();
    });
    await page.goto(pageUrl(name));
    await expect(page.getByRole('alert')).toContainText('Unable to load this page');
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Shadowverse Evolve/ })).toBeVisible();
    await navigateToPage(page, name);
    await expect(page.getByRole('alert')).toContainText('Unable to load this page');
    expect(attempts).toBe(1);
    expect(documentRequests).toBe(1);
    await page.getByRole('button', { name: 'Reload this page', exact: true }).click();
    await expectPage(page, name);
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(pageUrl(name));
    expect(attempts).toBe(2);
    expect(documentRequests).toBe(2);
  });

  test(`${name} supports direct access and reload`, async ({ page }) => {
    await page.goto(pageUrl(name));
    await expectPage(page, name);
    await page.reload();
    await expectPage(page, name);
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(pageUrl(name));
  });
}

test('preserves an active solo game when the app language changes', async ({ page }) => {
  await startSoloGame(page);
  await page.getByTestId('player-tracker-host-hp-increase').click();
  const tracker = page.getByTestId('player-tracker-host');
  await expect(tracker.getByText('HP: 21', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('option', { name: '日本語', exact: true }).click();
  await expect(page.getByRole('button', { name: '日本語', exact: true })).toBeVisible();
  await expect(tracker.getByText('HP: 21', { exact: true })).toBeVisible();
  await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
  await expect(page.getByTestId('preparation-controls')).toHaveCount(0);
});

test('restores a saved deck after loading the deck builder and game chunks', async ({ page }) => {
  await page.goto('/deck-builder');
  const input = page.locator('input[type="file"]');
  await expect(input).toBeEnabled();
  await input.setInputFiles(path.resolve(process.cwd(), 'public/sample-decks/constructed-royal-sample.json'));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('"Sample Constructed Royal" was saved.')).toBeVisible();
  await navigateToPage(page, 'GameBoard');
  const load = page.getByRole('button', { name: 'Load Player 1 from My Decks', exact: true });
  await expect(load).toBeEnabled();
  await load.click();
  const picker = page.getByRole('dialog', { name: 'Load from My Decks' });
  await expect(picker.getByText('Sample Constructed Royal')).toBeVisible();
  await picker.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(picker).toBeHidden();
  await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(40);
  await expect(zoneCards(page, 'evolveDeck-host')).toHaveCount(10);
  await expect(leaderZoneCards(page, 'host')).toHaveCount(1);
});
