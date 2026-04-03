import { describe, expect, it } from 'vitest';
import type { SavedDeckRecordV1 } from './deckStorage';
import { formatSavedDeckCountSummary, formatSavedDeckRuleSummary } from './savedDeckPresentation';

const t = (key: string, params?: Record<string, string | number>): string => {
  const messages: Record<string, string> = {
    'gameBoard.deckRules.constructedTitle': 'Constructed Title: {{title}}',
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

const createDeck = (overrides: Partial<SavedDeckRecordV1> = {}): SavedDeckRecordV1 => ({
  schemaVersion: 1,
  id: 'deck-1',
  name: 'Test Deck',
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
    main: [{ cardId: 'MAIN-1', count: 40 }],
    evolve: [{ cardId: 'EVOLVE-1', count: 10 }],
    leader: [{ cardId: 'LEADER-1', count: 1 }],
    token: [{ cardId: 'TOKEN-1', count: 3 }],
  },
  ...overrides,
});

describe('savedDeckPresentation', () => {
  it('formats constructed title decks', () => {
    const deck = createDeck({
      ruleConfig: {
        format: 'constructed',
        identityType: 'title',
        selectedClass: null,
        selectedTitle: 'Hero Tale',
        selectedClasses: [null, null],
      },
    });

    expect(formatSavedDeckRuleSummary(deck, t)).toBe('Constructed Title: Hero Tale');
  });

  it('formats constructed class decks and falls back to the untranslated selection label', () => {
    const selectedDeck = createDeck({
      ruleConfig: {
        format: 'constructed',
        identityType: 'class',
        selectedClass: 'Royal',
        selectedTitle: null,
        selectedClasses: [null, null],
      },
    });
    const unselectedDeck = createDeck({
      ruleConfig: {
        format: 'constructed',
        identityType: 'class',
        selectedClass: null,
        selectedTitle: null,
        selectedClasses: [null, null],
      },
    });

    expect(formatSavedDeckRuleSummary(selectedDeck, t)).toBe('Constructed Class: Royal');
    expect(formatSavedDeckRuleSummary(unselectedDeck, t)).toBe('Constructed Class: Unselected');
  });

  it('formats crossover and other decks', () => {
    const crossoverDeck = createDeck({
      ruleConfig: {
        format: 'crossover',
        identityType: 'class',
        selectedClass: null,
        selectedTitle: null,
        selectedClasses: ['Royal', 'Witch'],
      },
    });

    expect(formatSavedDeckRuleSummary(crossoverDeck, t)).toBe('Crossover: Royal / Witch');
    expect(formatSavedDeckRuleSummary(createDeck(), t)).toBe('Other');
  });

  it('formats section counts using saved card reference totals', () => {
    const deck = createDeck({
      sections: {
        main: [{ cardId: 'MAIN-1', count: 32 }, { cardId: 'MAIN-2', count: 8 }],
        evolve: [{ cardId: 'EVOLVE-1', count: 5 }, { cardId: 'EVOLVE-2', count: 5 }],
        leader: [{ cardId: 'LEADER-1', count: 2 }],
        token: [{ cardId: 'TOKEN-1', count: 1 }, { cardId: 'TOKEN-2', count: 2 }],
      },
    });

    expect(formatSavedDeckCountSummary(deck, t)).toBe('Main 40 / Evolve 10 / Leader 2 / Token 3');
  });
});
