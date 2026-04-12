import { describe, expect, it, vi } from 'vitest';
import { buildSavedDeckPickerViewModel, buildTokenSpawnViewModel } from './gameBoardDialogViewModel';
import type { LegalSavedDeckOption } from '../utils/gameBoardSavedDecks';
import type { SavedDeckRecordV1 } from '../utils/deckStorage';
import type { TokenOption } from '../types/game';

vi.mock('../utils/gameBoardPresentation', () => ({
    filterSavedDeckOptionsBySearch: vi.fn((options: LegalSavedDeckOption[], search: string) =>
        options.filter(o => o.deck.name.toLowerCase().includes(search.toLowerCase()))
    ),
}));

vi.mock('../utils/soloMode', () => ({
    getPlayerLabel: vi.fn((_role: string, _isSolo: boolean, self: string, opponent: string) =>
        _role === 'host' ? self : opponent
    ),
}));

vi.mock('../utils/gameBoardTokens', () => ({
    getTotalTokenSpawnCount: vi.fn((options: TokenOption[], counts: Record<string, number>) =>
        options.reduce((sum, o) => sum + (counts[o.name] ?? 0), 0)
    ),
}));

const t = (key: string) => key;

describe('gameBoardDialogViewModel', () => {
    describe('buildSavedDeckPickerViewModel', () => {
        const baseDeckOptions: LegalSavedDeckOption[] = [
            {
                deck: { name: 'Dragon Deck', id: 'd1' } as unknown as SavedDeckRecordV1,
                deckData: { mainDeck: [], evolveDeck: [], leaderCards: [], tokenDeck: [] },
                summary: '',
                counts: '',
            },
            {
                deck: { name: 'Elf Deck', id: 'd2' } as unknown as SavedDeckRecordV1,
                deckData: { mainDeck: [], evolveDeck: [], leaderCards: [], tokenDeck: [] },
                summary: '',
                counts: '',
            },
        ];

        it('filters saved deck options by search', () => {
            const vm = buildSavedDeckPickerViewModel({
                savedDeckOptions: baseDeckOptions,
                savedDeckSearch: 'dragon',
                savedDeckImportTargetRole: null,
                isSoloMode: false,
                role: 'host',
                t,
            });

            expect(vm.filteredSavedDeckOptions).toHaveLength(1);
            expect(vm.filteredSavedDeckOptions[0].deck.name).toBe('Dragon Deck');
        });

        it('returns all decks with empty search', () => {
            const vm = buildSavedDeckPickerViewModel({
                savedDeckOptions: baseDeckOptions,
                savedDeckSearch: '',
                savedDeckImportTargetRole: null,
                isSoloMode: false,
                role: 'host',
                t,
            });

            expect(vm.filteredSavedDeckOptions).toHaveLength(2);
        });

        it('returns target label when import target role is set', () => {
            const vm = buildSavedDeckPickerViewModel({
                savedDeckOptions: [],
                savedDeckSearch: '',
                savedDeckImportTargetRole: 'host',
                isSoloMode: false,
                role: 'host',
                t,
            });

            expect(vm.savedDeckPickerTargetLabel).not.toBeNull();
        });

        it('returns null target label when no import target role', () => {
            const vm = buildSavedDeckPickerViewModel({
                savedDeckOptions: [],
                savedDeckSearch: '',
                savedDeckImportTargetRole: null,
                isSoloMode: false,
                role: 'host',
                t,
            });

            expect(vm.savedDeckPickerTargetLabel).toBeNull();
        });
    });

    describe('buildTokenSpawnViewModel', () => {
        const mockTokenOptions: TokenOption[] = [
            { name: 'Token A', image: '/a.png', cardId: 'T1' },
            { name: 'Token B', image: '/b.png', cardId: 'T2' },
        ];

        it('returns token options for the target role', () => {
            const vm = buildTokenSpawnViewModel({
                tokenSpawnTargetRole: 'host',
                tokenSpawnCounts: { 'Token A': 2 },
                getTokenOptions: () => mockTokenOptions,
            });

            expect(vm.tokenSpawnOptions).toEqual(mockTokenOptions);
            expect(vm.totalTokenSpawnCount).toBe(2);
        });

        it('returns empty options when target role is null', () => {
            const vm = buildTokenSpawnViewModel({
                tokenSpawnTargetRole: null,
                tokenSpawnCounts: { 'Token A': 3 },
                getTokenOptions: () => mockTokenOptions,
            });

            expect(vm.tokenSpawnOptions).toEqual([]);
            expect(vm.totalTokenSpawnCount).toBe(0);
        });
    });
});
