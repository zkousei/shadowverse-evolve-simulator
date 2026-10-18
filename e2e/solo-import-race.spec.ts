import { expect, test, type Page } from './helpers/test';
import { deckInput, importSoloDummyDecks, zoneCards } from './helpers/gameBoard';

type DelayedReadsWindow = Window & { __pendingDeckReads: Array<() => Promise<void>> };
test.use({ locale: 'en-US' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const reads = (window as DelayedReadsWindow).__pendingDeckReads = [];
    const read = FileReader.prototype.readAsText;
    FileReader.prototype.readAsText = function (this: FileReader, blob: Blob, encoding?: string) {
      if (blob instanceof File && blob.name === 'delayed-deck.json') {
        reads.push(() => new Promise<void>(resolve => {
          this.addEventListener('loadend', () => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          }, { once: true });
          read.call(this, blob, encoding);
        }));
      } else {
        read.call(this, blob, encoding);
      }
    };
  });
});

const delayUpload = async (page: Page, name: string) => deckInput(page, 'bottom').setInputFiles({
  name: 'delayed-deck.json', mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({ mainDeck: [{ id: name, name, image: '', deck_section: 'main' }] })),
});
const release = (page: Page, index: number) => page.evaluate(async selected => {
  await (window as DelayedReadsWindow).__pendingDeckReads[selected]();
}, index);

test('an upload finishing after reset does not replace the reset deck', async ({ page }) => {
  await page.goto('/game?mode=solo');
  await importSoloDummyDecks(page);
  const count = await zoneCards(page, 'mainDeck-host').count();
  const originalIds = await zoneCards(page, 'mainDeck-host').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-card-id')).sort());
  await delayUpload(page, 'Late');
  await page.getByTestId('preparation-controls').getByRole('button', { name: 'Reset Game', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Reset Game' });
  await dialog.getByRole('button', { name: 'Yes, Reset', exact: true }).click();
  await expect(dialog).toBeHidden();
  await release(page, 0);
  await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(count);
  await expect.poll(() => zoneCards(page, 'mainDeck-host').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-card-id')).sort())).toEqual(originalIds);
});

test('an older file read cannot overwrite a newer upload for the same player', async ({ page }) => {
  await page.goto('/game?mode=solo');
  await importSoloDummyDecks(page);
  await delayUpload(page, 'Old');
  await delayUpload(page, 'New');
  await release(page, 1);
  await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(1);
  const newId = await zoneCards(page, 'mainDeck-host').first().getAttribute('data-card-id');
  await release(page, 0);
  await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(1);
  await expect(zoneCards(page, 'mainDeck-host').first()).toHaveAttribute('data-card-id', newId!);
});
