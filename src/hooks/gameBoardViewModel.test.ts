import { describe, expect, it, vi } from 'vitest';
import { buildGameBoardViewModel } from './gameBoardViewModel';
import { buildSyncState } from './__tests__/gameBoardTestUtils';

vi.mock('../utils/gameRules', () => ({
    canImportDeck: vi.fn(() => true),
    canUndoLastTurn: vi.fn(() => false),
    isHandCardMovementLocked: vi.fn(() => false),
}));

vi.mock('../utils/soloMode', () => ({
    getPlayerLabel: vi.fn((role: string) => `label-${role}`),
    getZoneOwner: vi.fn((zoneId: string) => {
        const match = zoneId.match(/-(host|guest)$/);
        return match ? match[1] : null;
    }),
}));

vi.mock('../utils/gameBoardPresentation', () => ({
    getConnectionBadgeTone: vi.fn(() => ({ tone: 'neutral' as const, label: 'ok' })),
    getInteractionBlockedTitle: vi.fn(() => undefined),
}));

import { canImportDeck, canUndoLastTurn, isHandCardMovementLocked } from '../utils/gameRules';

const t = (key: string) => key;

const buildDefaultArgs = (overrides: Record<string, unknown> = {}) => ({
    allCardsLength: 10,
    role: 'host' as const,
    isSoloMode: false,
    isHost: true,
    isSpectator: false,
    canInteract: true,
    connectionState: 'connected' as const,
    gameState: buildSyncState({ gameStatus: 'playing', turnPlayer: 'host', turnCount: 2, phase: 'Main' }),
    canUndoTurn: false,
    searchZoneId: null,
    t,
    ...overrides,
});

describe('gameBoardViewModel', () => {
    // ─── Role & Layout ────────────────────────────────────────────
    describe('role and layout', () => {
        it('sets viewerRole based on isSpectator and isSoloMode', () => {
            expect(buildGameBoardViewModel(buildDefaultArgs()).viewerRole).toBe('host');
            expect(buildGameBoardViewModel(buildDefaultArgs({ isSpectator: true })).viewerRole).toBe('spectator');
            expect(buildGameBoardViewModel(buildDefaultArgs({ isSoloMode: true })).viewerRole).toBe('all');
        });

        it('sets topRole=guest and bottomRole=host for host player', () => {
            const vm = buildGameBoardViewModel(buildDefaultArgs({ role: 'host' }));
            expect(vm.topRole).toBe('guest');
            expect(vm.bottomRole).toBe('host');
        });

        it('sets topRole=host and bottomRole=guest for guest player', () => {
            const vm = buildGameBoardViewModel(buildDefaultArgs({ role: 'guest', isHost: false }));
            expect(vm.topRole).toBe('host');
            expect(vm.bottomRole).toBe('guest');
        });

        it('forces topRole=guest and bottomRole=host in solo mode', () => {
            const vm = buildGameBoardViewModel(buildDefaultArgs({ isSoloMode: true }));
            expect(vm.topRole).toBe('guest');
            expect(vm.bottomRole).toBe('host');
        });
    });

    // ─── Deck Import ──────────────────────────────────────────────
    describe('deck import', () => {
        it('allows import for both when canInteract is true', () => {
            const vm = buildGameBoardViewModel(buildDefaultArgs());
            expect(vm.canImportTopDeck).toBe(true);
            expect(vm.canImportBottomDeck).toBe(true);
        });

        it('blocks import when canInteract is false', () => {
            const vm = buildGameBoardViewModel(buildDefaultArgs({ canInteract: false }));
            expect(vm.canImportTopDeck).toBe(false);
            expect(vm.canImportBottomDeck).toBe(false);
        });

        it('blocks import when canImportDeck returns false', () => {
            vi.mocked(canImportDeck).mockReturnValue(false);
            const vm = buildGameBoardViewModel(buildDefaultArgs());
            expect(vm.canImportTopDeck).toBe(false);
            expect(vm.canImportBottomDeck).toBe(false);
            vi.mocked(canImportDeck).mockReturnValue(true);
        });
    });

    // ─── Saved Deck Picker ────────────────────────────────────────
    describe('saved deck picker', () => {
        it('enables saved deck picker when cards exist', () => {
            expect(buildGameBoardViewModel(buildDefaultArgs({ allCardsLength: 5 })).canOpenSavedDeckPicker).toBe(true);
        });

        it('disables saved deck picker when no cards', () => {
            expect(buildGameBoardViewModel(buildDefaultArgs({ allCardsLength: 0 })).canOpenSavedDeckPicker).toBe(false);
        });
    });

    // ─── Hand Visibility ─────────────────────────────────────────
    describe('hand visibility', () => {
        it('hides top hand in normal multiplayer mode', () => {
            expect(buildGameBoardViewModel(buildDefaultArgs()).shouldHideTopHand).toBe(true);
        });

        it('shows top hand in solo mode', () => {
            expect(buildGameBoardViewModel(buildDefaultArgs({ isSoloMode: true })).shouldHideTopHand).toBe(false);
        });

        it('shows top hand for spectators', () => {
            expect(buildGameBoardViewModel(buildDefaultArgs({ isSpectator: true })).shouldHideTopHand).toBe(false);
        });

        it('shows top hand when revealHandsMode is on', () => {
            const gameState = buildSyncState({ gameStatus: 'playing', revealHandsMode: true });
            expect(buildGameBoardViewModel(buildDefaultArgs({ gameState })).shouldHideTopHand).toBe(false);
        });
    });

    // ─── Turn & Highlight ────────────────────────────────────────
    describe('turn activity', () => {
        it('marks bottom turn active when turnPlayer matches bottom', () => {
            const gameState = buildSyncState({ gameStatus: 'playing', turnPlayer: 'host' });
            const vm = buildGameBoardViewModel(buildDefaultArgs({ gameState, role: 'host' }));
            expect(vm.isBottomTurnActive).toBe(true);
            expect(vm.isTopTurnActive).toBe(false);
        });

        it('highlights top board in solo mode when top turn is active', () => {
            const gameState = buildSyncState({ gameStatus: 'playing', turnPlayer: 'guest' });
            const vm = buildGameBoardViewModel(buildDefaultArgs({ gameState, isSoloMode: true }));
            expect(vm.shouldHighlightTopBoard).toBe(true);
        });

        it('does not highlight top board for normal host', () => {
            const gameState = buildSyncState({ gameStatus: 'playing', turnPlayer: 'guest' });
            const vm = buildGameBoardViewModel(buildDefaultArgs({ gameState }));
            expect(vm.shouldHighlightTopBoard).toBe(false);
        });
    });

    // ─── Reset & Undo ────────────────────────────────────────────
    describe('reset and undo', () => {
        it('allows reset for host', () => {
            expect(buildGameBoardViewModel(buildDefaultArgs({ isHost: true })).canResetGame).toBe(true);
        });

        it('allows reset in solo mode', () => {
            expect(buildGameBoardViewModel(buildDefaultArgs({ isSoloMode: true })).canResetGame).toBe(true);
        });

        it('blocks reset for guest', () => {
            expect(buildGameBoardViewModel(buildDefaultArgs({ isHost: false, isSoloMode: false })).canResetGame).toBe(false);
        });

        it('shows undo turn when canUndoLastTurn returns true', () => {
            vi.mocked(canUndoLastTurn).mockReturnValue(true);
            const vm = buildGameBoardViewModel(buildDefaultArgs());
            expect(vm.canShowUndoTurn).toBe(true);
            vi.mocked(canUndoLastTurn).mockReturnValue(false);
        });
    });

    // ─── Search Zone ──────────────────────────────────────────────
    describe('search target role', () => {
        it('derives search target role from zone ID', () => {
            const vm = buildGameBoardViewModel(buildDefaultArgs({ searchZoneId: 'hand-guest' }));
            expect(vm.searchTargetRole).toBe('guest');
        });

        it('defaults to own role when no search zone', () => {
            const vm = buildGameBoardViewModel(buildDefaultArgs({ searchZoneId: null }));
            expect(vm.searchTargetRole).toBe('host');
        });
    });

    // ─── Guest Connection Blocked ─────────────────────────────────
    describe('guest connection blocked', () => {
        it('detects blocked guest connection', () => {
            const vm = buildGameBoardViewModel(buildDefaultArgs({
                isHost: false, isSoloMode: false, isSpectator: false, canInteract: false,
            }));
            expect(vm.isGuestConnectionBlocked).toBe(true);
        });

        it('not blocked when canInteract is true', () => {
            const vm = buildGameBoardViewModel(buildDefaultArgs({
                isHost: false, isSoloMode: false, isSpectator: false, canInteract: true,
            }));
            expect(vm.isGuestConnectionBlocked).toBe(false);
        });
    });

    // ─── End Stop ─────────────────────────────────────────────────
    describe('end stop', () => {
        it('detects own end stop when active', () => {
            const gameState = buildSyncState({ gameStatus: 'playing', endStop: { host: true, guest: false } });
            const vm = buildGameBoardViewModel(buildDefaultArgs({ gameState, role: 'host' }));
            expect(vm.isOwnEndStopActive).toBe(true);
            expect(vm.isOpponentEndStopActive).toBe(false);
        });

        it('shows end stop toggle when not own turn and playing', () => {
            const gameState = buildSyncState({ gameStatus: 'playing', turnPlayer: 'guest' });
            const vm = buildGameBoardViewModel(buildDefaultArgs({ gameState, role: 'host' }));
            expect(vm.canShowEndStopToggle).toBe(true);
        });

        it('hides end stop toggle when own turn', () => {
            const gameState = buildSyncState({ gameStatus: 'playing', turnPlayer: 'host' });
            const vm = buildGameBoardViewModel(buildDefaultArgs({ gameState, role: 'host' }));
            expect(vm.canShowEndStopToggle).toBe(false);
        });

        it('hides end stop in solo mode', () => {
            const gameState = buildSyncState({ gameStatus: 'playing', turnPlayer: 'guest' });
            const vm = buildGameBoardViewModel(buildDefaultArgs({ gameState, isSoloMode: true }));
            expect(vm.isOwnEndStopActive).toBe(false);
            expect(vm.canShowEndStopToggle).toBe(false);
        });

        it('blocks end turn when opponent end stop is active on own turn', () => {
            const gameState = buildSyncState({ gameStatus: 'playing', turnPlayer: 'host', endStop: { host: false, guest: true } });
            const vm = buildGameBoardViewModel(buildDefaultArgs({ gameState, role: 'host' }));
            expect(vm.endTurnBlockedByEndStop).toBe(true);
        });
    });

    // ─── Preparing State ─────────────────────────────────────────
    describe('preparation state', () => {
        it('reports hand movement locked from game rules', () => {
            vi.mocked(isHandCardMovementLocked).mockReturnValue(true);
            const vm = buildGameBoardViewModel(buildDefaultArgs());
            expect(vm.isPreparingHandMoveLocked).toBe(true);
            vi.mocked(isHandCardMovementLocked).mockReturnValue(false);
        });
    });
});
