import { describe, expect, expectTypeOf, it } from 'vitest';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import type { GeneratedCardIndexEntry } from '../card/generatedCardCatalog';
import type { SavedDeckRecordV1 } from '../deck/deckStorage';
import { buildLegalSavedDeckOptions, buildSavedDeckPickerOptions } from './gameBoardSavedDecks';

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
  it.each([1, 200])('bounds full-catalog indexing when validating %i saved decks', count => {
    let unrelatedIdReads = 0;
    const unrelated: DeckBuilderCardData = {
      ...mainCard,
      get id() { unrelatedIdReads++; return 'UNUSED-001'; },
    };
    const options = buildLegalSavedDeckOptions(
      Array.from({ length: count }, (_, index) => createDeck({ id: `deck-${index}` })),
      [mainCard, leaderCard, unrelated], t
    );
    expect(options).toHaveLength(count);
    expect(options.every(option => option.deckData.mainDeck.length === 3)).toBe(true);
    // Index construction must be independent of the number of saved decks.
    // An unrelated card is never read by deck validation or token expansion.
    expect(unrelatedIdReads).toBeLessThanOrEqual(2);
  });

  it('skips sanitization indexing if every saved deck references missing cards', () => {
    let reads = 0;
    const unused: DeckBuilderCardData = { ...mainCard, get id() { reads++; return 'UNUSED-001'; } };
    expect(buildLegalSavedDeckOptions([createDeck()], [unused], t)).toEqual([]);
    expect(reads).toBeLessThanOrEqual(1);
  });

  it('does not scan the catalog if there are no saved decks', () => {
    const unread: DeckBuilderCardData = { ...mainCard, get id(): string { throw new Error('Unexpected catalog scan'); } };
    expect(buildLegalSavedDeckOptions([], [unread], t)).toEqual([]);
  });

  it('builds a fresh index for each list refresh, including changes to the same array', () => {
    const catalog = [mainCard, leaderCard];
    const deck = createDeck();
    const first = buildLegalSavedDeckOptions([deck], catalog, t);
    catalog[0] = { ...mainCard, ability_text: 'Updated ability' };
    const second = buildLegalSavedDeckOptions([deck], catalog, t);
    expect(first[0].deckData.mainDeck[0]).toBe(mainCard);
    expect(second[0].deckData.mainDeck[0].ability_text).toBe('Updated ability');
    catalog.splice(0, 1);
    expect(buildLegalSavedDeckOptions([deck], catalog, t)).toEqual([]);
  });

  it('restores complete card details and automatically includes a related token outside saved sections', () => {
    const token: DeckBuilderCardData = {
      id: 'TOKEN-001', name: 'Related Token', image: '/token.png',
      deck_section: 'token', card_kind_normalized: 'token_follower', is_token: true,
      atk: '1', hp: '2', ability_text: 'Token ability',
    };
    const detailedMain: DeckBuilderCardData = {
      ...mainCard, related_cards: [{ id: token.id, name: token.name }],
      faces: [{ side: 'back', name: 'Back Knight', ability_text: 'Back ability', atk: '5', hp: '6' }],
    };
    const [option] = buildLegalSavedDeckOptions([createDeck()], [detailedMain, leaderCard, token], t);
    expect(option.deckData.mainDeck).toHaveLength(3);
    for (const card of option.deckData.mainDeck) expect(card).toEqual(detailedMain);
    expect(option.deckData.tokenDeck).toEqual([token]);
    expect(option.deckData.leaderCards).toEqual([leaderCard]);
    expect(option.deck.sections.token).toEqual([]);
  });

  it.each(['main', 'evolve', 'leader', 'token'] as const)(
    'excludes a saved deck with a missing %s ID without hiding another valid deck', section => {
      const valid = createDeck({ id: 'valid' });
      const missing = createDeck({
        id: 'missing', sections: { ...valid.sections, [section]: [{ cardId: 'MISSING', count: 1 }] },
      });
      const options = buildLegalSavedDeckOptions([missing, valid], [mainCard, leaderCard], t);
      expect(options.map(option => option.deck.id)).toEqual(['valid']);
      expect(options[0].deckData.mainDeck).toHaveLength(3);
    }
  );

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


describe('saved deck picker options', () => {
  const metadataCatalog = (): readonly GeneratedCardIndexEntry[] => Object.freeze([mainCard, leaderCard].map(card => {
    const { image, ability_text, faces, ...metadata } = card;
    void image; void ability_text; void faces;
    return Object.freeze({ ...metadata, detail_group: card.id.split('-')[0] });
  }));

  it('accepts a frozen generated index without converting summaries to complete import cards', () => {
    const cards = metadataCatalog();
    const deck = createDeck();
    expect(buildSavedDeckPickerOptions([deck], cards, t)).toEqual(buildSavedDeckPickerOptions([deck], [mainCard, leaderCard], t));
    expectTypeOf<GeneratedCardIndexEntry>().not.toExtend<DeckBuilderCardData>();
    // The full import API must still require full-card inputs with an image.
    expectTypeOf<GeneratedCardIndexEntry>().not.toExtend<Parameters<typeof buildLegalSavedDeckOptions>[1][number]>();
    expect(cards.every(card => !('image' in card) && !('ability_text' in card) && !('faces' in card))).toBe(true);
  });

  it.each(['main', 'evolve', 'leader', 'token'] as const)('preserves missing %s ID exclusion with frozen summary data', section => {
    const valid = createDeck({ id: 'valid' });
    const missing = createDeck({ id: 'missing', sections: { ...valid.sections, [section]: [{ cardId: 'MISSING', count: 1 }] } });
    const result = buildSavedDeckPickerOptions([missing, valid], metadataCatalog(), t);
    expect(result.map(option => option.deck.id)).toEqual(['valid']);
    expect(result).toEqual(buildSavedDeckPickerOptions([missing, valid], [mainCard, leaderCard], t));
  });

  it('keeps existing validation and stored summaries for metadata-only inputs instead of trusting saved counts', () => {
    const valid = createDeck({ id: 'valid' });
    const invalid = createDeck({ id: 'too-small-after-copy-limit', ruleConfig: { ...valid.ruleConfig, format: 'constructed', selectedClass: 'ロイヤル' } });
    const options = buildSavedDeckPickerOptions([invalid, valid], metadataCatalog(), t);
    expect(options).toEqual([{ deck: valid, summary: 'Other', counts: 'Main 50 / Evolve 0 / Leader 1 / Token 0' }]);
  });

  it('never reads image, ability text or faces to determine picker eligibility', () => {
    const unreadDetails: DeckBuilderCardData = { ...mainCard,
      get image(): string { throw new Error('Image not needed for rules'); },
      get ability_text(): string { throw new Error('Ability not needed for rules'); },
      get faces(): never { throw new Error('Faces not needed for rules'); },
    };
    Object.freeze(unreadDetails);
    expect(buildSavedDeckPickerOptions([createDeck()], [unreadDetails, leaderCard], t))
      .toEqual(buildSavedDeckPickerOptions([createDeck()], metadataCatalog(), t));
  });

  it('keeps summary catalogs immutable and bounds indexing for 200 options with recursive token references', () => {
    let scans = 0;
    const source = Object.freeze({ ...metadataCatalog()[0], related_cards: Object.freeze([Object.freeze({ id: 'TOKEN-1', name: 'Token' })]) });
    const token = Object.freeze({ id: 'TOKEN-1', name: 'Token', deck_section: 'token' as const, related_cards: Object.freeze([Object.freeze({ id: source.id, name: source.name })]) });
    const unused = Object.freeze({ get id() { scans++; return 'UNUSED'; }, name: 'Unused' });
    const catalog = Object.freeze([source, metadataCatalog()[1], token, unused]);
    const options = buildSavedDeckPickerOptions(Array.from({ length: 200 }, (_, i) => createDeck({ id: `deck-${i}` })), catalog, t);
    expect(options).toHaveLength(200);
    expect(scans).toBeLessThanOrEqual(2);
    expect(options.every(option => !('deckData' in option))).toBe(true);
    expect(source.related_cards).toEqual([{ id: 'TOKEN-1', name: 'Token' }]);
    expect(token.related_cards).toEqual([{ id: source.id, name: source.name }]);
  });

  it('returns compact saved-record metadata without expanded card arrays', () => {
    const deck = createDeck();
    const complete = { ...mainCard, ability_text: 'DETAIL_NOT_FOR_LIST', faces: [{ side: 'back', name: 'Back', ability_text: 'BACK_NOT_FOR_LIST' }] };
    const options = buildSavedDeckPickerOptions([deck], [complete, leaderCard], t);
    expect(options).toEqual([{
      deck, summary: 'Other', counts: 'Main 50 / Evolve 0 / Leader 1 / Token 0',
    }]);
    expect(options[0].deck).toBe(deck);
    expect(options[0]).not.toHaveProperty('deckData');
    expect(JSON.stringify(options)).not.toContain('DETAIL_NOT_FOR_LIST');
    expect(JSON.stringify(options)).not.toContain('BACK_NOT_FOR_LIST');
  });

  it.each(['main', 'evolve', 'leader', 'token'] as const)('keeps valid options and rejects missing %s IDs', section => {
    const valid = createDeck({ id: 'valid' });
    const missing = createDeck({ id: 'missing', sections: { ...valid.sections, [section]: [{ cardId: 'MISSING', count: 1 }] } });
    const options = buildSavedDeckPickerOptions([missing, valid], [mainCard, leaderCard], t);
    expect(options.map(option => option.deck.id)).toEqual(['valid']);
  });

  it('keeps legality checks and stored count summaries consistent with full restoration', () => {
    const valid = createDeck({ id: 'valid' });
    const invalid = createDeck({ id: 'invalid', ruleConfig: { ...valid.ruleConfig, format: 'constructed', selectedClass: 'ロイヤル' } });
    const catalog = [mainCard, leaderCard];
    const options = buildSavedDeckPickerOptions([invalid, valid], catalog, t);
    expect(options.map(option => option.deck.id)).toEqual(['valid']);
    expect(options).toEqual(buildLegalSavedDeckOptions([invalid, valid], catalog, t)
      .map(({ deck, summary, counts }) => ({ deck, summary, counts })));
  });

  it('keeps the bounded catalog scans for 200 metadata-only options', () => {
    let reads = 0;
    const unrelated: DeckBuilderCardData = { ...mainCard, get id() { reads++; return 'UNUSED-001'; } };
    const options = buildSavedDeckPickerOptions(Array.from({ length: 200 }, (_, i) => createDeck({ id: `deck-${i}` })), [mainCard, leaderCard, unrelated], t);
    expect(options).toHaveLength(200);
    expect(options.every(option => !('deckData' in option))).toBe(true);
    expect(reads).toBeLessThanOrEqual(2);
  });

  it('keeps empty lists free of catalog scans', () => {
    const unread: DeckBuilderCardData = { ...mainCard, get id(): string { throw new Error('Unexpected catalog scan'); } };
    expect(buildSavedDeckPickerOptions([], [unread], t)).toEqual([]);
  });
});
