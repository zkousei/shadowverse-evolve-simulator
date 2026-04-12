import { describe, expect, it, vi } from 'vitest';
import {
    buildRandomDiscardHandAction,
    buildRevealHandAction,
    buildMainDeckActions,
} from './gameBoardMenuActions';

const t = (key: string) => key;

describe('gameBoardMenuActions', () => {
    describe('buildRandomDiscardHandAction', () => {
        it('returns a single accent action with the translation key', () => {
            const onClick = vi.fn();
            const actions = buildRandomDiscardHandAction(onClick, t);

            expect(actions).toHaveLength(1);
            expect(actions[0]).toEqual({
                label: 'gameBoard.zones.randomDiscardHand',
                onClick,
                tone: 'accent',
            });
        });
    });

    describe('buildRevealHandAction', () => {
        it('returns a single accent action with the translation key', () => {
            const onClick = vi.fn();
            const actions = buildRevealHandAction(onClick, t);

            expect(actions).toHaveLength(1);
            expect(actions[0]).toEqual({
                label: 'gameBoard.zones.revealHand',
                onClick,
                tone: 'accent',
            });
        });
    });

    describe('buildMainDeckActions', () => {
        it('includes search only when shuffle and lookTop are omitted', () => {
            const onSearch = vi.fn();
            const actions = buildMainDeckActions({ onSearch, t });

            expect(actions).toHaveLength(1);
            expect(actions[0]).toEqual({ label: 'gameBoard.zones.search', onClick: onSearch });
        });

        it('includes shuffle when provided', () => {
            const onSearch = vi.fn();
            const onShuffle = vi.fn();
            const actions = buildMainDeckActions({ onSearch, onShuffle, t });

            expect(actions).toHaveLength(2);
            expect(actions[1]).toEqual({ label: 'gameBoard.zones.shuffle', onClick: onShuffle });
        });

        it('includes lookTop as accent when provided', () => {
            const onSearch = vi.fn();
            const onLookTop = vi.fn();
            const actions = buildMainDeckActions({ onSearch, onLookTop, t });

            expect(actions).toHaveLength(2);
            expect(actions[1]).toEqual({ label: 'gameBoard.zones.lookTop', onClick: onLookTop, tone: 'accent' });
        });

        it('includes all three actions when all callbacks provided', () => {
            const onSearch = vi.fn();
            const onShuffle = vi.fn();
            const onLookTop = vi.fn();
            const actions = buildMainDeckActions({ onSearch, onShuffle, onLookTop, t });

            expect(actions).toHaveLength(3);
            expect(actions.map(a => a.label)).toEqual([
                'gameBoard.zones.search',
                'gameBoard.zones.shuffle',
                'gameBoard.zones.lookTop',
            ]);
        });
    });
});
