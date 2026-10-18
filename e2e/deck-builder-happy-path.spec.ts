import { test, expect, type Page } from './helpers/test';
import path from 'path';
import { readFileSync } from 'node:fs';

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

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeEnabled();
    await fileInput.setInputFiles(constructedSampleDeckPath);

    await expect(page.getByPlaceholder('Deck Name', { exact: true })).toHaveValue('Sample Constructed Royal');
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
    const loadButton = myDecksDialog.getByRole('button', { name: 'Load' });
    await expect(loadButton).toBeEnabled();
    await loadButton.click();
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
    const reloadedLoadButton = reopenedMyDecksDialog.getByRole('button', { name: 'Load' });
    await expect(reloadedLoadButton).toBeEnabled();
    await reloadedLoadButton.click();

    await expect(page.getByPlaceholder('Deck Name', { exact: true })).toHaveValue('Sample Constructed Royal');
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Sample_Constructed_Royal.json');
  });
});

test('shows restriction badges and updates counts after add, remove, and format change', async ({ page }) => {
  await resetBrowserStorage(page);
  await page.goto('/deck-builder');
  await page.getByRole('combobox', { name: 'Constructed class', exact: true }).selectOption('ビショップ');
  await page.getByPlaceholder('Search cards by name...').fill('清浄の領域');

  const libraryCard = page.locator('.glass-panel').filter({
    has: page.getByRole('button', { name: 'Preview 清浄の領域', exact: true }),
  }).last();
  await expect(libraryCard.getByText('Limited to 1', { exact: true })).toBeVisible();
  await expect(libraryCard.getByTitle('Add to Main Deck', { exact: true })).toHaveText('0 / 1');
  await libraryCard.getByTitle('Add to Main Deck', { exact: true }).click();
  await expect(libraryCard.getByTitle('Add to Main Deck', { exact: true })).toHaveText('1 / 1');
  await expect(libraryCard.getByTitle('Add to Main Deck', { exact: true })).toBeDisabled();
  await expect(page.getByText('Limited to 1', { exact: true })).toHaveCount(2);

  await page.getByTitle('Remove one copy from Main Deck', { exact: true }).click();
  await expect(libraryCard.getByTitle('Add to Main Deck', { exact: true })).toHaveText('0 / 1');
  await expect(libraryCard.getByTitle('Add to Main Deck', { exact: true })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Deck format', exact: true }).selectOption('other');
  await expect(page.getByText('Limited to 1', { exact: true })).toHaveCount(0);
  await expect(libraryCard.getByTitle('Add to Main Deck', { exact: true })).toHaveText('0 / 3');
  await expect(page.getByText(/Included:/)).toHaveCount(0);

  await page.getByPlaceholder('Search cards by name...').fill('ワールドブレイク');
  await page.getByRole('combobox', { name: 'Deck format', exact: true }).selectOption('constructed');
  await expect(page.getByText('Banned', { exact: true }).first()).toBeVisible();
  for (const addButton of await page.getByTitle('Add to Main Deck', { exact: true }).all()) {
    await expect(addButton).toBeDisabled();
    await expect(addButton).toHaveText('Unavailable');
  }
});


test('keeps bans with Cutthroat, restores intrinsic limits after removal, and disables full decks', async ({ page }) => {
  const catalog = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/cards_detailed.json'), 'utf8')) as { id: string; name: string; deck_section: string }[];
  const findCard = (id: string) => catalog.find(card => card.id === id)!;
  const cutthroat = findCard('BP19-110');
  const worldBreak = catalog.find(card => card.name === 'ワールドブレイク')!;
  const onion = findCard('BP09-049');
  const carrot = findCard('CP01-085');
  await resetBrowserStorage(page);
  await page.goto('/deck-builder');
  const importDeck = async (mainDeck: typeof catalog, evolveDeck: typeof catalog) => {
    const input = page.locator('input[type="file"]');
    await expect(input).toBeEnabled();
    await input.setInputFiles({ name: 'restriction-audit.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ name: 'Restriction Audit', rule: 'constructed', selectedClass: 'ウィッチ', mainDeck, evolveDeck })) });
  };
  const libraryCard = (name: string, section: 'main' | 'evolve' = 'main') => page.locator('.glass-panel')
    .filter({ has: page.getByRole('button', { name: `Preview ${name}`, exact: true }) })
    .filter({ has: page.getByTitle(section === 'main' ? 'Add to Main Deck' : 'Add to Evolve Deck', { exact: true }) }).last();
  const search = page.getByPlaceholder('Search cards by name...');

  await importDeck([cutthroat, worldBreak, onion, onion], [carrot, carrot]);
  await expect(page.getByRole('heading', { name: /Main Deck/ })).toContainText('2/50');
  await expect(page.getByRole('heading', { name: /Evolve Deck/ })).toContainText('1/10');
  await search.fill('ワールドブレイク');
  await expect(libraryCard('ワールドブレイク').getByTitle('Add to Main Deck', { exact: true })).toHaveText('Unavailable');
  await expect(libraryCard('ワールドブレイク').getByTitle('Add to Main Deck', { exact: true })).toBeDisabled();
  await search.fill('オニオン軍団');
  await expect(libraryCard('オニオン軍団').getByTitle('Add to Main Deck', { exact: true })).toHaveText('1 / 1');
  await expect(libraryCard('オニオン軍団').getByTitle('Add to Main Deck', { exact: true })).toBeDisabled();
  await page.getByText('機鋒の咎人・カットスロート', { exact: true }).locator('..').locator('..').getByTitle('Remove one copy from Main Deck', { exact: true }).click();
  await expect(libraryCard('オニオン軍団').getByTitle('Add to Main Deck', { exact: true })).toHaveText('1 / 50');
  await expect(libraryCard('オニオン軍団').getByTitle('Add to Main Deck', { exact: true })).toBeEnabled();
  await search.fill('にんじん');
  await expect(libraryCard('にんじん', 'evolve').getByTitle('Add to Evolve Deck', { exact: true })).toHaveText('EVO1 / 10');

  await importDeck(Array.from({ length: 50 }, () => onion), Array.from({ length: 10 }, () => carrot));
  await search.fill('ゴブリン');
  await expect(libraryCard('ゴブリン').getByTitle('Add to Main Deck', { exact: true })).toHaveText('0 / 3');
  await expect(libraryCard('ゴブリン').getByTitle('Add to Main Deck', { exact: true })).toBeDisabled();
  await search.fill('機鋒の咎人・カットスロート');
  await expect(page.getByTitle('Add to Evolve Deck', { exact: true }).first()).toBeDisabled();
});
