import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const dummyDeckPath = path.resolve(process.cwd(), 'e2e/fixtures/dummy-deck.json');

const boardSection = (page: Page, side: 'top' | 'bottom') =>
  page.getByTestId(`board-section-${side}`);

const deckInput = (page: Page, side: 'top' | 'bottom') =>
  boardSection(page, side).locator('input[type="file"]');

const zoneCards = (page: Page, zoneId: string) =>
  page.getByTestId(`zone-${zoneId}`).locator('[data-card-id]');

const leaderZoneCards = (page: Page, role: 'host' | 'guest') =>
  page.getByTestId(`leader-zone-leader-${role}`).locator('[data-card-id]');

test.describe('Solo Game Flow', () => {
  test('home page displays correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('navigates to solo mode via direct URL', async ({ page }) => {
    await page.goto('/game?mode=solo');
    await expect(page).toHaveURL(/mode=solo/);
    await expect(page.getByTestId('board-section-bottom')).toBeVisible();
  });

  test('imports valid solo decks, starts a game, and moves a hand card onto the field', async ({ page }) => {
    await page.goto('/game?mode=solo');
    const preparationControls = page.getByTestId('preparation-controls');

    await deckInput(page, 'bottom').setInputFiles(dummyDeckPath);
    await deckInput(page, 'top').setInputFiles(dummyDeckPath);

    await expect(leaderZoneCards(page, 'host')).toHaveCount(1);
    await expect(leaderZoneCards(page, 'guest')).toHaveCount(1);

    await preparationControls.getByRole('button', { name: /^(?:1P 先行|Player 1 1st)$/ }).click();

    await preparationControls.getByRole('button', { name: /^(?:🃏 )?(?:初期手札を引く \(4枚\)|Draw Hand \(4\))$/ }).click();
    await expect(zoneCards(page, 'hand-host')).toHaveCount(4);

    await preparationControls.getByRole('button', { name: /^(?:✅ )?(?:1P 準備完了|Player 1 Ready)$/ }).click();

    await preparationControls.getByRole('button', { name: /^(?:🃏 )?(?:2P 初期手札を引く \(4枚\)|Draw P2 Hand \(4\))$/ }).click();
    await expect(zoneCards(page, 'hand-guest')).toHaveCount(4);

    await preparationControls.getByRole('button', { name: /^(?:✅ )?(?:2P 準備完了|Player 2 Ready)$/ }).click();

    await preparationControls.getByRole('button', { name: /^(?:▶ )?(?:ゲーム開始|START GAME)$/ }).click();

    await expect(page.getByTestId('preparation-controls')).toBeHidden();
    await expect(boardSection(page, 'bottom')).toHaveAttribute('data-turn-active', 'true');
    await expect(boardSection(page, 'top')).toHaveAttribute('data-turn-active', 'false');

    const hostHandCards = zoneCards(page, 'hand-host');
    const hostFieldCards = zoneCards(page, 'field-host');

    await expect(hostFieldCards).toHaveCount(0);

    await boardSection(page, 'bottom')
      .getByRole('button', { name: /カードを引く|Draw/ })
      .click();
    await expect(hostHandCards).toHaveCount(5);

    await page.getByTestId('player-tracker-host-hp-increase').click();
    await expect(page.getByTestId('player-tracker-host')).toContainText('HP: 21');

    const firstCardInHand = hostHandCards.first();
    const fieldZone = page.getByTestId('zone-field-host');

    await firstCardInHand.scrollIntoViewIfNeeded();
    await fieldZone.scrollIntoViewIfNeeded();
    await firstCardInHand.dragTo(fieldZone);

    await expect(hostFieldCards).toHaveCount(1);
    await expect(hostHandCards).toHaveCount(4);
  });
});
