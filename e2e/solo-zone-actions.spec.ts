import { test, expect } from './helpers/test';
import {
  largeDummyDeckPath,
  openMainDeckActions,
  startSoloGame,
  zoneCards,
} from './helpers/gameBoard';

test.use({ locale: 'en-US' });

test.describe('Solo Zone Actions', () => {
  test('banishes the top card from the compact player controls', async ({ page }) => {
    await startSoloGame(page);

    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(2);
    await expect(zoneCards(page, 'banish-host')).toHaveCount(0);

    const hostControls = page.getByTestId('board-section-bottom');
    await hostControls.getByRole('button', { name: /Banish Top/ }).click();

    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(1);
    await expect(zoneCards(page, 'banish-host')).toHaveCount(1);
  });

  test('searches the main deck and adds a card to hand', async ({ page }) => {
    await startSoloGame(page);

    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(2);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);

    const mainDeckSection = await openMainDeckActions(page, 'host');
    await mainDeckSection.getByRole('button', { name: 'Search' }).click();

    const searchPanel = page.getByTestId('search-card-modal-panel');
    await expect(searchPanel).toBeVisible();
    await expect(searchPanel).toContainText('Player 1 Main Deck (2)');
    await expect(searchPanel.getByTestId('search-card-type-counts')).toContainText(/Follower: \d+ \/ Spell: \d+ \/ Amulet: \d+/);
    await expect(searchPanel.getByRole('button', { name: 'Play to Field', exact: true })).toHaveCount(2);
    await expect(searchPanel.getByRole('button', { name: 'Add to Hand', exact: true })).toHaveCount(2);
    await expect(searchPanel.getByRole('button', { name: 'Add to EX Area', exact: true })).toHaveCount(2);

    await searchPanel.getByRole('button', { name: 'Add to Hand', exact: true }).first().click({ force: true });

    await expect(searchPanel).toBeHidden();
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(1);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(5);
    await expect(page.getByRole('status').filter({ hasText: 'added a card' })).toBeVisible();
    const shuffleDialog = page.getByRole('dialog', { name: 'Shuffle Player 1 Main Deck?' });
    await shuffleDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(shuffleDialog).toBeHidden();
    await page.getByTestId('undo-move-host').click();
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(2);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    await expect(page.getByRole('status').filter({ hasText: 'undid card movement' })).toContainText('Hand → Deck: 1');
    await page.getByTestId('gameboard-recent-events-trigger').click();
    await expect(page.getByTestId('gameboard-recent-events')).toContainText('Hand → Deck: 1');
  });

  test('clears selection after undoing an assignment and supports reselection, order and game Undo', async ({ page }) => {
    await startSoloGame(page);
    const deck = zoneCards(page, 'mainDeck-host');
    const originalIds = await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')));
    const menu = await openMainDeckActions(page, 'host');
    await menu.getByRole('button', { name: 'Look Top (N)' }).click();
    await page.getByRole('dialog', { name: 'How many cards to look at?' }).getByRole('button', { name: '2' }).click();
    const modal = page.getByText('Look at Top 2 Cards').locator('xpath=ancestor::div[contains(@style, "max-width: 1200px")]');
    const retry = modal.getByRole('button', { name: 'Undo last assignment' });
    await expect(retry).toBeDisabled();
    const pendingCards = modal.locator('button[aria-pressed]');
    await pendingCards.nth(1).click();
    await pendingCards.first().click();
    await modal.getByRole('button', { name: 'Cemetery', exact: true }).click();
    await expect(modal.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    await expect(zoneCards(page, 'cemetery-host')).toHaveCount(0);
    await retry.click();
    await expect(pendingCards).toHaveCount(2);
    await expect(pendingCards.first()).toHaveAttribute('aria-pressed', 'false');
    await expect(pendingCards.nth(1)).toHaveAttribute('aria-pressed', 'false');
    await expect(modal.getByTestId('top-deck-destination-actions')).toHaveCount(0);
    await expect(modal.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    await expect(retry).toBeDisabled();
    await pendingCards.nth(1).click();
    await pendingCards.first().click();
    await modal.getByRole('button', { name: 'Bottom of Deck', exact: true }).click();
    expect(await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')))).toEqual(originalIds);
    await modal.getByRole('button', { name: 'Confirm' }).click();
    await expect(modal).toBeHidden();
    expect(await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')))).toEqual([...originalIds].reverse());
    await expect(zoneCards(page, 'cemetery-host')).toHaveCount(0);
    await page.getByTestId('undo-move-host').click();
    expect(await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')))).toEqual(originalIds);
    const reopenedMenu = await openMainDeckActions(page, 'host');
    await reopenedMenu.getByRole('button', { name: 'Look Top (N)' }).click();
    await page.getByRole('dialog', { name: 'How many cards to look at?' }).getByRole('button', { name: '2' }).click();
    await expect(retry).toBeDisabled();
    await modal.getByRole('button', { name: 'Cancel' }).click();
  });

  test('changes an older assigned batch directly and restores its previous destination on retry', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await startSoloGame(page, largeDummyDeckPath);
    const deck = zoneCards(page, 'mainDeck-host');
    const originalIds = await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')));
    const menu = await openMainDeckActions(page, 'host');
    await menu.getByRole('button', { name: 'Look Top (N)' }).click();
    await page.getByRole('dialog', { name: 'How many cards to look at?' }).getByRole('button', { name: '4', exact: true }).click();
    const modal = page.getByText('Look at Top 4 Cards').locator('xpath=ancestor::div[contains(@style, "max-width: 1200px")]');
    const pending = modal.locator('section').filter({ hasText: 'Cards to be Assigned' });
    await pending.getByRole('button').nth(0).click();
    await pending.getByRole('button').nth(1).click();
    await modal.getByRole('button', { name: 'Cemetery', exact: true }).click();
    await pending.getByRole('button').first().click();
    await modal.getByRole('button', { name: 'Hand', exact: true }).click();
    await pending.getByRole('button').first().click();
    await modal.getByRole('button', { name: 'EX Area', exact: true }).click();
    const cemetery = modal.getByRole('heading', { name: /Cemetery/ }).locator('..');
    await cemetery.getByRole('button').nth(1).click();
    await cemetery.getByRole('button').nth(0).click();
    await expect(cemetery.getByRole('button', { pressed: true })).toHaveCount(2);
    await expect(pending).toHaveCount(0);
    await expect(modal.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled();
    await expect(modal.getByRole('button', { name: 'Bottom of Deck', exact: true })).toBeInViewport();
    await modal.getByRole('button', { name: 'Bottom of Deck', exact: true }).click();
    await expect(cemetery).toHaveCount(0);
    await modal.getByRole('button', { name: 'Undo last assignment' }).click();
    await expect(cemetery.getByRole('button', { pressed: false })).toHaveCount(2);
    await expect(modal.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
    await expect(modal.getByTestId('top-deck-destination-actions')).toHaveCount(0);
    await expect(pending).toHaveCount(0);
    await cemetery.getByRole('button').nth(1).click();
    await cemetery.getByRole('button').nth(0).click();
    await modal.getByRole('button', { name: 'Bottom of Deck', exact: true }).click();
    expect(await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')))).toEqual(originalIds);
    await expect(zoneCards(page, 'cemetery-host')).toHaveCount(0);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    await expect(zoneCards(page, 'ex-host')).toHaveCount(0);
    await modal.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(modal).toBeHidden();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(5);
    await expect(zoneCards(page, 'ex-host')).toHaveCount(1);
    expect(await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')))).toEqual([...originalIds.slice(4), originalIds[1], originalIds[0]]);
    await page.getByTestId('undo-move-host').click();
    expect(await deck.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')))).toEqual(originalIds);
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    await expect(zoneCards(page, 'ex-host')).toHaveCount(0);
  });

  test('keeps keyboard card focus visible and cancels Look Top without changing the deck', async ({ page }) => {
    await startSoloGame(page);
    const originalDeckIds = await zoneCards(page, 'mainDeck-host').evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')));
    const mainDeckSection = await openMainDeckActions(page, 'host');
    await mainDeckSection.getByRole('button', { name: 'Look Top (N)' }).click();
    await page.getByRole('dialog', { name: 'How many cards to look at?' }).getByRole('button', { name: '2' }).click();
    const modal = page.getByText('Look at Top 2 Cards').locator('xpath=ancestor::div[contains(@style, "max-width: 1200px")]');
    const pendingCards = modal.locator('button[aria-pressed]');
    await modal.getByRole('button', { name: 'Cancel', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(pendingCards.first()).toBeFocused();
    await expect.poll(() => pendingCards.first().evaluate(card => getComputedStyle(card).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Space');
    await expect(pendingCards.first()).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Tab');
    await expect(pendingCards.nth(1)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(pendingCards.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await modal.getByRole('button', { name: 'Hand', exact: true }).click();
    await expect(modal.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(modal).toBeHidden();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    expect(await zoneCards(page, 'mainDeck-host').evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')))).toEqual(originalDeckIds);
  });

  for (const height of [900, 720]) {
    test(`keeps completed Look Top results visible without inner scrolling at 1280x${height}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height });
      await startSoloGame(page);
      const mainDeckSection = await openMainDeckActions(page, 'host');
      await mainDeckSection.getByRole('button', { name: 'Look Top (N)' }).click();
      await page.getByRole('dialog', { name: 'How many cards to look at?' }).getByRole('button', { name: '2' }).click();
      const modal = page.getByText('Look at Top 2 Cards').locator('xpath=ancestor::div[contains(@style, "max-width: 1200px")]');
      await expect(modal.getByRole('button', { name: /All remaining to/ })).toHaveCount(0);
      const pending = modal.locator('section').filter({ hasText: 'Cards to be Assigned' });
      await expect(modal.getByRole('heading', { level: 4 })).toHaveCount(0);
      await pending.getByRole('img', { name: /E2E/ }).first().click();
      await modal.getByRole('button', { name: 'Hand', exact: true }).click();
      await expect(modal.getByRole('heading', { level: 4 })).toHaveCount(1);
      await pending.getByRole('img', { name: /E2E/ }).first().click();
      await modal.getByRole('button', { name: 'Bottom of Deck', exact: true }).click();
      await expect(modal.getByText('All cards have been assigned.')).toBeVisible();
      await expect(pending).toHaveCount(0);
      await expect(modal.getByRole('heading', { level: 4 })).toHaveCount(2);
      await expect(modal.getByRole('button', { name: 'Confirm' })).toBeEnabled();
      const content = modal.getByTestId('top-deck-content');
      await expect.poll(() => content.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
      await expect(modal.getByLabel('Randomize bottom order')).toBeInViewport();
      await modal.getByRole('heading', { name: /Bottom of Deck/ }).locator('..').getByRole('img').click();
      await modal.getByRole('button', { name: 'Return to unassigned', exact: true }).click();
      await expect(pending).toBeVisible();
      await expect(modal.getByRole('heading', { level: 4 })).toHaveCount(1);
      await expect(modal.getByRole('button', { name: 'Confirm' })).toBeDisabled();
      await modal.getByRole('button', { name: 'Top of Deck', exact: true }).click();
      await expect(modal.getByRole('heading', { name: /Top of Deck/ })).toBeVisible();
      await expect(modal.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    });
  }

  for (const viewport of [{ width: 1280, height: 720 }, { width: 900, height: 650 }]) {
    test(`keeps destination controls separate from all seven card groups at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await startSoloGame(page, largeDummyDeckPath);
      const handCard = zoneCards(page, 'hand-host').first();
      await handCard.hover();
      await handCard.getByRole('button', { name: 'Send to bottom of deck', exact: true }).click();
      await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(7);
      const menu = await openMainDeckActions(page, 'host');
      await menu.getByRole('button', { name: 'Look Top (N)' }).click();
      const countDialog = page.getByRole('dialog', { name: 'How many cards to look at?' });
      await countDialog.getByRole('button', { name: 'Other', exact: true }).click();
      await countDialog.getByRole('spinbutton', { name: 'Custom card count' }).fill('7');
      await countDialog.getByRole('button', { name: 'Look', exact: true }).click();
      const modal = page.getByText('Look at Top 7 Cards').locator('xpath=ancestor::div[contains(@style, "max-width: 1200px")]');
      const content = modal.getByTestId('top-deck-content');
      const controls = modal.getByTestId('top-deck-destination-actions');
      await expect(controls).toHaveCount(0);
      const destinations = ['Field', 'Hand', 'Reveal to Hand', 'EX Area', 'Bottom of Deck', 'Top of Deck', 'Cemetery'];
      const pending = content.locator('section').filter({ hasText: 'Cards to be Assigned' });
      for (const name of destinations) {
        await pending.getByRole('button').first().click();
        await modal.getByRole('button', { name, exact: true }).click();
        await expect(controls).toHaveCount(0);
      }
      await expect(content.getByRole('heading', { level: 4 })).toHaveCount(7);
      const cards = content.locator('button[aria-pressed]');
      const dimensions = await cards.getByRole('img').evaluateAll(images => images.map(image => {
        const { width, height } = image.getBoundingClientRect();
        return { width, height };
      }));
      expect(dimensions).toHaveLength(7);
      dimensions.forEach(size => expect(size).toEqual(dimensions[0]));
      await cards.first().click();
      await expect(controls).toBeVisible();
      const contentBox = await content.boundingBox();
      const controlsBox = await controls.boundingBox();
      expect(contentBox).not.toBeNull();
      expect(controlsBox).not.toBeNull();
      expect(controlsBox!.y).toBeCloseTo(contentBox!.y + contentBox!.height, 0);
      const handBox = await modal.getByRole('button', { name: /Your Hand/ }).boundingBox();
      expect(handBox).not.toBeNull();
      expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(handBox!.y);
      const confirmBox = await modal.getByRole('button', { name: 'Confirm', exact: true }).boundingBox();
      expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(confirmBox!.y);
      for (const button of await controls.getByRole('button').all()) {
        await expect(button).toBeInViewport({ ratio: 1 });
      }
      await content.evaluate(element => { element.scrollTop = element.scrollHeight; });
      expect(await controls.boundingBox()).toEqual(controlsBox);
      await expect(modal.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled();
      await controls.getByRole('button', { name: 'Hand', exact: true }).click();
      await expect(controls).toHaveCount(0);
      await expect(modal.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
      await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    });
  }

  for (const viewport of [{ width: 390, height: 640 }, { width: 844, height: 390 }]) {
    test(`can assign multiple Look Top cards with the reference hand open at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await startSoloGame(page);
      const menu = await openMainDeckActions(page, 'host');
      await menu.getByRole('button', { name: 'Look Top (N)' }).click();
      await page.getByRole('dialog', { name: 'How many cards to look at?' }).getByRole('button', { name: '2' }).click();
      const modal = page.getByText('Look at Top 2 Cards').locator('xpath=ancestor::div[contains(@style, "max-width: 1200px")]');
      const pending = modal.getByTestId('top-deck-content').getByRole('button');
      await pending.first().click();
      await pending.nth(1).click({ timeout: 5000 });
      await modal.getByRole('button', { name: 'Hand', exact: true }).click();
      await modal.getByRole('button', { name: 'Confirm', exact: true }).click();
      await expect(modal).toBeHidden();
      await expect(zoneCards(page, 'hand-host')).toHaveCount(6);
      await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(0);
      await page.getByTestId('undo-move-host').click();
      await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
      await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(2);
    });
  }

  test('resolves Look Top into field and EX area destinations', async ({ page }) => {
    await startSoloGame(page);

    const mainDeckSection = await openMainDeckActions(page, 'host');
    await mainDeckSection.getByRole('button', { name: 'Look Top (N)' }).click();

    const countDialog = page.getByRole('dialog', { name: 'How many cards to look at?' });
    await expect(countDialog).toBeVisible();
    await countDialog.getByRole('button', { name: '2' }).click();

    await expect(page.getByText('Look at Top 2 Cards')).toBeVisible();
    const topDeckModal = page.getByText('Look at Top 2 Cards').locator('xpath=ancestor::div[contains(@style, "max-width: 1200px")]');

    const pending = topDeckModal.locator('section').filter({ hasText: 'Cards to be Assigned' });
    await expect(topDeckModal.getByRole('button', { name: 'Field', exact: true })).toHaveCount(0);
    await pending.getByRole('img', { name: /E2E/ }).first().click();
    await expect(pending.getByRole('img', { name: /E2E/ })).toHaveCount(2);
    await topDeckModal.getByRole('button', { name: 'Field', exact: true }).click();
    await pending.getByRole('img', { name: /E2E/ }).first().click();
    await topDeckModal.getByRole('button', { name: 'EX Area' }).click();
    await expect(zoneCards(page, 'field-host')).toHaveCount(0);
    await expect(zoneCards(page, 'ex-host')).toHaveCount(0);
    await topDeckModal.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText('Look at Top 2 Cards')).toBeHidden();
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(0);
    await expect(zoneCards(page, 'field-host')).toHaveCount(1);
    await expect(zoneCards(page, 'ex-host')).toHaveCount(1);
    await page.getByTestId('undo-move-host').click();
    await expect(zoneCards(page, 'field-host')).toHaveCount(0);
    await expect(zoneCards(page, 'ex-host')).toHaveCount(0);
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(2);
    await expect(page.getByRole('status').filter({ hasText: 'undid Look Top' })).toContainText('Field: 1, EX: 1');
    await page.getByTestId('gameboard-recent-events-trigger').click();
    await expect(page.getByTestId('gameboard-recent-events')).toContainText('Field: 1, EX: 1');
  });

  test('undoes private look-to-hand and deck-bottom results with counts only in logs and accessible notifications', async ({ page }) => {
    await startSoloGame(page);
    const mainDeckSection = await openMainDeckActions(page, 'host');
    await mainDeckSection.getByRole('button', { name: 'Look Top (N)' }).click();
    await page.getByRole('dialog', { name: 'How many cards to look at?' }).getByRole('button', { name: '2' }).click();
    const modal = page.getByText('Look at Top 2 Cards').locator('xpath=ancestor::div[contains(@style, "max-width: 1200px")]');
    const pending = modal.locator('section').filter({ hasText: 'Cards to be Assigned' });
    const cardNames = await pending.getByRole('img', { name: /E2E/ }).evaluateAll(images => images.map(image => image.getAttribute('alt')!));
    expect(cardNames).toHaveLength(2);
    await pending.getByRole('img', { name: /E2E/ }).first().click();
    await modal.getByRole('button', { name: 'Hand', exact: true }).click();
    await pending.getByRole('img', { name: /E2E/ }).first().click();
    await modal.getByRole('button', { name: 'Bottom of Deck', exact: true }).click();
    await modal.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(5);
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(1);
    await page.getByTestId('undo-move-host').click();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);
    await expect(zoneCards(page, 'mainDeck-host')).toHaveCount(2);
    const notification = page.getByRole('status').filter({ hasText: 'undid Look Top' });
    await expect(notification).toHaveText('Player 1 undid Look Top (Hand: 1, Deck bottom: 1).');
    await page.getByTestId('gameboard-recent-events-trigger').click();
    const log = page.getByTestId('gameboard-recent-events');
    await expect(log).toContainText('Player 1 undid Look Top (Hand: 1, Deck bottom: 1).');
    await expect(log).toContainText('resolved Look Top 2');
    for (const name of cardNames) {
      await expect(log).not.toContainText(name);
      await expect(notification).not.toContainText(name);
    }
    await expect(notification.locator('img')).toHaveCount(0);
    await expect(notification).not.toHaveAttribute('title');
    await expect(notification).toBeHidden({ timeout: 5000 });
    await expect(log).toContainText('undid Look Top');
  });
});
