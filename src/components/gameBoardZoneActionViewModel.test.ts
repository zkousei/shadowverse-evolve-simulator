import { describe, expect, it, vi } from 'vitest';
import {
    buildRandomDiscardHandZoneActions,
    buildRevealHandZoneActions,
    buildMainDeckZoneActions,
} from './gameBoardZoneActionViewModel';

const t = (key: string) => key;

describe('gameBoardZoneActionViewModel', () => {
    describe('buildRandomDiscardHandZoneActions', () => {
        it('builds config with player-specific menuId', () => {
            const onClick = vi.fn();
            const config = buildRandomDiscardHandZoneActions('host', onClick, t);

            expect(config.menuId).toBe('hand-random-discard-host');
            expect(config.actionsLabel).toBe('gameBoard.board.actions');
            expect(config.actions).toHaveLength(1);
            expect(config.actions[0].label).toBe('gameBoard.zones.randomDiscardHand');
        });
    });

    describe('buildRevealHandZoneActions', () => {
        it('builds config with player-specific menuId', () => {
            const onClick = vi.fn();
            const config = buildRevealHandZoneActions('guest', onClick, t);

            expect(config.menuId).toBe('hand-reveal-guest');
            expect(config.actionsLabel).toBe('gameBoard.board.actions');
            expect(config.actions).toHaveLength(1);
            expect(config.actions[0].label).toBe('gameBoard.zones.revealHand');
        });
    });

    describe('buildMainDeckZoneActions', () => {
        it('builds config with search only', () => {
            const onSearch = vi.fn();
            const config = buildMainDeckZoneActions({ playerRole: 'host', onSearch, t });

            expect(config.menuId).toBe('mainDeck-host');
            expect(config.actionsLabel).toBe('gameBoard.board.actions');
            expect(config.actions).toHaveLength(1);
        });

        it('includes shuffle and lookTop when provided', () => {
            const config = buildMainDeckZoneActions({
                playerRole: 'guest',
                onSearch: vi.fn(),
                onShuffle: vi.fn(),
                onLookTop: vi.fn(),
                t,
            });

            expect(config.menuId).toBe('mainDeck-guest');
            expect(config.actions).toHaveLength(3);
        });
    });
});
