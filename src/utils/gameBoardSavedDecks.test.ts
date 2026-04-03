import { describe, expect, it } from 'vitest';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { SavedDeckRecordV1 } from './deckStorage';
import { buildLegalSavedDeckOptions } from './gameBoardSavedDecks';

const t = (key: string, params?: Record<string, string | number>): string => {
  const messages: Record<string, string> = {
    'gameBoard.deckRules.constructedClass': 'Constructed Class: {{class}}',
    'gameBoard.deckRules.crossover': 'Crossover: {{firstClass}} / {{secondClass}}',
    'gameBoard.deckRules.other': 'Other',
    'gameBoard.deckRules.unselected': 'Unselected',
    'gameBoard.deckRules.main': 'Main',
    'gameBoard.deckRules.evolve': 'Evolve',
    'gameBoard.deckRules.leader': 'Leader',
    'gameBoard.deckRules.token': 'Token',
  };

  let value = messages[key] ?? key;
  if (!params) return value;

  Object.entries(params).forEach(([paramKey, paramValue]) => {
    value = value.replaceAll(`{{${paramKey}}}`, String(paramValue));
  });

  return value;
};

const mainCard: DeckBuilderCardData = {
  id: 'BP01-001',
  name: 'Alpha Knight',
  image: '/alpha.png',
  class: 'ロイヤル',
  title: 'Hero Tale',
  type: 'フォロワー',
  rarity: 'LG',
  product_name: 'Booster Pack',
  cost: '2',
  atk: '2',
  hp: '2',
  ability_text: '[Fanfare] Test ability.',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const leaderCard: DeckBuilderCardData = {
  id: 'LDR01-001',
  name: 'Leader Alice',
  image: '/leader.png',
  class: 'ロイヤル',
  title: 'Hero Tale',
  type: 'リーダー',
  rarity: 'PR',
  product_name: 'Leader Set',
  cost: '-',
  card_kind_normalized: 'leader',
  deck_section: 'leader',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const createDeck = (overrides: Partial<SavedDeckRecordV1> = {}): SavedDeckRecordV1 => ({
  schemaVersion: 1,
  id: 'deck-1',
  name: 'Hero Tale',
  createdAt: '2026-04-04T00:00:00.000Z',
  updatedAt: '2026-04-04T00:00:00.000Z',
  ruleConfig: {
    format: 'other',
    identityType: 'class',
    selectedClass: null,
    selectedTitle: null,
    selectedClasses: [null, null],
  },
  sections: {
    main: [{ cardId: mainCard.id, count: 50 }],
    evolve: [],
    leader: [{ cardId: leaderCard.id, count: 1 }],
    token: [],
  },
  ...overrides,
});

describe('gameBoardSavedDecks', () => {
  it('builds legal saved deck options with restored deck data and summaries', () => {
    const [option] = buildLegalSavedDeckOptions([createDeck()], [mainCard, leaderCard], t);

    expect(option.deck.name).toBe('Hero Tale');
    expect(option.deckData.mainDeck).toHaveLength(3);
    expect(option.deckData.leaderCards).toEqual([leaderCard]);
    expect(option.summary).toBe('Other');
    expect(option.counts).toBe('Main 50 / Evolve 0 / Leader 1 / Token 0');
  });

  it('filters out saved decks that reference missing cards', () => {
    const deck = createDeck({
      sections: {
        main: [{ cardId: 'MISSING-001', count: 50 }],
        evolve: [],
        leader: [{ cardId: leaderCard.id, count: 1 }],
        token: [],
      },
    });

    expect(buildLegalSavedDeckOptions([deck], [mainCard, leaderCard], t)).toEqual([]);
  });

  it('filters out saved decks that fail validation after restore', () => {
    const deck = createDeck({
      ruleConfig: {
        format: 'constructed',
        identityType: 'class',
        selectedClass: 'ロイヤル',
        selectedTitle: null,
        selectedClasses: [null, null],
      },
      sections: {
        main: [{ cardId: mainCard.id, count: 40 }],
        evolve: [],
        leader: [{ cardId: leaderCard.id, count: 1 }],
        token: [],
      },
    });

    expect(buildLegalSavedDeckOptions([deck], [mainCard, leaderCard], t)).toEqual([]);
  });
});
