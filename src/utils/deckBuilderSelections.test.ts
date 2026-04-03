import { describe, expect, it } from 'vitest';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { createDefaultDeckRuleConfig } from '../models/deckRule';
import { serializeDeckState, type SavedDeckRecordV1 } from './deckStorage';
import {
  addSubtypeTagSelection,
  areAllShownSavedDecksSelected,
  buildFilteredSavedDecks,
  canAddSubtypeTag,
  getFilteredSubtypeOptions,
  getSavedDeckSelectionUiState,
  getShownSavedDeckIds,
  removeSubtypeTagSelection,
  toggleSavedDeckSelectionId,
  toggleShownSavedDeckIds,
} from './deckBuilderSelections';

const mockCards: DeckBuilderCardData[] = [
  {
    id: 'BP01-001',
    name: 'Alpha Knight',
    image: '/alpha.png',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'フォロワー',
    subtype: '兵士',
    cost: '1',
    atk: '2',
    hp: '2',
    ability_text: 'Ability',
    card_kind_normalized: 'follower',
    deck_section: 'main',
    is_token: false,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
  {
    id: 'BP02-001',
    name: 'Beta Mage',
    image: '/beta.png',
    class: 'ウィッチ',
    title: 'Mage Tale',
    type: 'スペル',
    subtype: '学院',
    cost: '2',
    ability_text: 'Ability',
    card_kind_normalized: 'spell',
    deck_section: 'main',
    is_token: false,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
];

const otherRuleConfig = {
  ...createDefaultDeckRuleConfig(),
  format: 'other' as const,
};

const createSavedDeckRecord = (
  id: string,
  name: string,
  deckState: {
    mainDeck: DeckBuilderCardData[];
    evolveDeck: DeckBuilderCardData[];
    leaderCards: DeckBuilderCardData[];
    tokenDeck: DeckBuilderCardData[];
  },
  ruleConfig = otherRuleConfig
): SavedDeckRecordV1 => ({
  schemaVersion: 1,
  id,
  name,
  createdAt: '2026-04-04T00:00:00.000Z',
  updatedAt: '2026-04-04T00:00:00.000Z',
  ruleConfig,
  sections: serializeDeckState(deckState),
});

describe('deckBuilderSelections', () => {
  it('filters saved decks by search and computes export availability', () => {
    const validDeck = createSavedDeckRecord('a', 'Alpha Deck', {
      mainDeck: [mockCards[0]],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    });
    const invalidDeck = createSavedDeckRecord('b', 'Beta Deck', {
      mainDeck: [],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    }, createDefaultDeckRuleConfig());

    expect(buildFilteredSavedDecks([validDeck, invalidDeck], mockCards, '  beta ')).toEqual([
      { savedDeck: invalidDeck, canExport: false },
    ]);
    expect(buildFilteredSavedDecks([validDeck, invalidDeck], mockCards, '').map(entry => entry.canExport)).toEqual([
      true,
      false,
    ]);
  });

  it('derives shown ids and selection state for My Decks bulk actions', () => {
    const filteredSavedDecks = [
      { savedDeck: createSavedDeckRecord('a', 'Alpha Deck', { mainDeck: [mockCards[0]], evolveDeck: [], leaderCards: [], tokenDeck: [] }), canExport: true },
      { savedDeck: createSavedDeckRecord('b', 'Beta Deck', { mainDeck: [mockCards[1]], evolveDeck: [], leaderCards: [], tokenDeck: [] }), canExport: true },
    ];

    const shownIds = getShownSavedDeckIds(filteredSavedDecks);
    expect(shownIds).toEqual(['a', 'b']);
    expect(areAllShownSavedDecksSelected(shownIds, ['a', 'b', 'c'])).toBe(true);
    expect(areAllShownSavedDecksSelected(shownIds, ['a'])).toBe(false);
    expect(toggleSavedDeckSelectionId(['a'], 'a')).toEqual([]);
    expect(toggleSavedDeckSelectionId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleShownSavedDeckIds(['x'], shownIds)).toEqual(['x', 'a', 'b']);
    expect(toggleShownSavedDeckIds(['a', 'b', 'x'], shownIds)).toEqual(['x']);
    expect(getSavedDeckSelectionUiState({
      filteredSavedDeckCount: filteredSavedDecks.length,
      savedDeckCount: filteredSavedDecks.length,
      isSavedDeckSelectMode: false,
      selectedSavedDeckCount: 0,
      areAllShownSavedDecksSelected: false,
    })).toEqual({
      showSelectionToggle: true,
      selectionToggleAction: 'enter-selection',
      showDeleteAll: true,
      showBulkActions: false,
      hasSelectedDecks: false,
      bulkSelectionAction: 'select-all-shown',
    });
    expect(getSavedDeckSelectionUiState({
      filteredSavedDeckCount: filteredSavedDecks.length,
      savedDeckCount: filteredSavedDecks.length,
      isSavedDeckSelectMode: true,
      selectedSavedDeckCount: 2,
      areAllShownSavedDecksSelected: true,
    })).toEqual({
      showSelectionToggle: true,
      selectionToggleAction: 'cancel-selection',
      showDeleteAll: true,
      showBulkActions: true,
      hasSelectedDecks: true,
      bulkSelectionAction: 'clear-selection',
    });
  });

  it('filters subtype options and updates subtype tag selections safely', () => {
    const subtypeTags = ['兵士', '学院', '指揮官'];

    expect(getFilteredSubtypeOptions(subtypeTags, '')).toEqual(subtypeTags);
    expect(getFilteredSubtypeOptions(subtypeTags, ' がく ')).toEqual([]);
    expect(getFilteredSubtypeOptions(subtypeTags, '学')).toEqual(['学院']);
    expect(canAddSubtypeTag(subtypeTags, [], ' 兵士 ')).toBe(true);
    expect(canAddSubtypeTag(subtypeTags, ['兵士'], '兵士')).toBe(false);
    expect(canAddSubtypeTag(subtypeTags, [], 'unknown')).toBe(false);
    expect(addSubtypeTagSelection([], subtypeTags, ' 兵士 ')).toEqual(['兵士']);
    expect(addSubtypeTagSelection(['兵士'], subtypeTags, '兵士')).toEqual(['兵士']);
    expect(removeSubtypeTagSelection(['兵士', '学院'], '兵士')).toEqual(['学院']);
  });
});
