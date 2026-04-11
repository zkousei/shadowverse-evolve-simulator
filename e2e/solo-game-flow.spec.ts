import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Solo Game Flow', () => {
    test('home page displays correctly', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('navigates to solo mode via direct URL', async ({ page }) => {
        await page.goto('/game?mode=solo');
        await expect(page).toHaveURL(/mode=solo/);
        await page.waitForLoadState('networkidle');
    });

    test('full solo game setup and drag-and-drop flow', async ({ page }) => {
        await page.goto('/game?mode=solo');
        // Listen to console and dialogs
        page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
        page.on('dialog', dialog => {
            console.log(`[Browser Dialog] ${dialog.message()}`);
            dialog.accept();
        });

        // 1. Upload Deck for 1P (Bottom Panel)
        const dummyDeckPath = path.resolve(process.cwd(), 'e2e/fixtures/dummy-deck.json');
        
        // Find the bottom panel file input (1P) and top panel file input (2P)
        const inputs = page.locator('input[type="file"]');
        await expect(inputs).toHaveCount(2);
        
        // Upload to both 1P and 2P to ensure both have decks
        await inputs.last().setInputFiles(dummyDeckPath); 
        await page.waitForTimeout(500); // Give React time to process the file
        await inputs.first().setInputFiles(dummyDeckPath);
        await page.waitForTimeout(500); // Give React time to process the file

        // 2. Preparation Phase interactions (Draw Hand & Ready)
        // Draw hands (1P -> bottomRole - FIRST in DOM)
        const drawHandBtn1 = page.locator('button', { hasText: /初期手札を引く|Draw Hand/ }).first();
        await expect(drawHandBtn1).toBeVisible({ timeout: 10000 });
        await drawHandBtn1.click();

        // 1P Ready
        const readyBtn1p = page.locator('button', { hasText: /1P 準備完了|Ready/ }).first();
        await expect(readyBtn1p).toBeVisible();
        await readyBtn1p.click();

        // 2P Draw Hand (SECOND in DOM)
        const drawHandBtn2 = page.locator('button', { hasText: /初期手札を引く|Draw Hand/ }).last();
        await expect(drawHandBtn2).toBeVisible();
        await drawHandBtn2.click();

        // 2P Ready
        const readyBtn2p = page.locator('button', { hasText: /2P 準備完了|Ready/ }).last();
        await expect(readyBtn2p).toBeVisible();
        await readyBtn2p.click();

        // 3. Start Game
        const startGameBtn = page.locator('button', { hasText: /ゲーム開始|Start Game/ });
        await expect(startGameBtn).toBeEnabled();
        await startGameBtn.click();

        // Wait for preparing phase to transition to playing phase
        // The preparation controls should disappear
        await expect(page.getByTestId('preparation-controls')).not.toBeVisible();

        // 4. Verify turn state
        // Look for the "1P ターン" or similar indicator (class or text)
        await expect(page.locator('text=1P').first()).toBeVisible();

        // 5. Card Draw from Deck (Test UI Buttons)
        // Click the Draw button in 1P's control panel
        const drawBtn1p = page.locator('[data-testid="board-section-bottom"] button', { hasText: /カードを引く|Draw/ });
        await drawBtn1p.click();
        await page.waitForTimeout(500); // Give it a moment to animate/sync

        // 6. UI Parameter manipulation (Leader stats)
        // Click the + button on 1P's tracker (HP usually comes first)
        const tracker1p = page.getByTestId('player-tracker-host'); // Bottom is host in solo
        const plusButton = tracker1p.locator('button', { hasText: '+' }).first();
        await plusButton.click();

        // 7. Drag and Drop Card from Hand to Field
        // Get the first card from 1P's hand
        const handZone = page.getByTestId('zone-hand-host'); // Bottom role is usually 'host' in solo mode
        const firstCardInHand = handZone.locator('[data-card-id], [data-testid="mock-card"]').first();
        
        // Ensure card is visible before dragging
        await expect(firstCardInHand).toBeVisible();
        
        const fieldZone = page.getByTestId('zone-field-host');
        await expect(fieldZone).toBeVisible();

        // Perform drag and drop into the field zone
        await firstCardInHand.dragTo(fieldZone);
        await page.waitForTimeout(500); // Wait for drop animation/sync

        // Verify the card was moved (the field zone should now contain a card)
        const cardsInField = fieldZone.locator('[data-card-id], [data-testid="mock-card"]');
        await expect(cardsInField).toHaveCount(1);
    });
});
