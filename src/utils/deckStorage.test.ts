import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyDeckState } from '../models/deckState';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckRuleConfig } from '../models/deckRule';
import {
  areDeckSnapshotsEqual,
  clearDraft,
  createDeckSnapshot,
  DECK_BUILDER_DRAFT_KEY,
  deleteSavedDeck,
  duplicateSavedDeck,
  getSavedDeckById,
  listSavedDecks,
  loadDraft,
  renameSavedDeck,
  restoreDraftToSnapshot,
  restoreSavedDeckToSnapshot,
  saveDeck,
  saveDraft,
  SAVED_DECKS_KEY,
} from './deckStorage';

const mockCards: DeckBuilderCardData[] = [
  {
    id: 'BP01-001',
    name: 'Alpha Knight',
    image: '/alpha.png',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'フォロワー',
    card_kind_normalized: 'follower',
    deck_section: 'main',
    related_cards: [
      {
        id: 'TK01-001',
        name: 'Knight Token',
      },
    ],
  },
  {
    id: 'EV01-001',
    name: 'Evolve Angel',
    image: '/evolve.png',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'フォロワー・エボルヴ',
    card_kind_normalized: 'evolve_follower',
    deck_section: 'evolve',
    is_evolve_card: true,
  },
];

const otherRuleConfig: DeckRuleConfig = {
  format: 'other',
  identityType: 'class',
  selectedClass: null,
  selectedTitle: null,
  selectedClasses: [null, null] as [null, null],
};

describe('deckStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T00:00:00.000Z'));
  });

  it('saves and overwrites a deck without changing exportable content', () => {
    const first = saveDeck({
      name: 'Royal Test',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    vi.setSystemTime(new Date('2026-03-20T01:00:00.000Z'));

    const second = saveDeck({
      id: first.id,
      name: 'Royal Test Updated',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [mockCards[1]],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).not.toBe(first.updatedAt);
    expect(listSavedDecks()).toHaveLength(1);
    expect(getSavedDeckById(first.id)?.sections.evolve).toEqual([{ cardId: 'EV01-001', count: 1 }]);
  });

  it('restores saved decks and drafts while reporting missing cards', () => {
    const saved = saveDeck({
      name: 'Royal Test',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [mockCards[1]],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    const savedPayload = JSON.parse(window.localStorage.getItem(SAVED_DECKS_KEY) ?? '{}');
    savedPayload.decks[0].sections.main.push({ cardId: 'UNKNOWN-001', count: 2 });
    window.localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(savedPayload));

    const restoredSaved = restoreSavedDeckToSnapshot(getSavedDeckById(saved.id)!, mockCards);
    expect(restoredSaved.snapshot.deckState.mainDeck).toEqual([mockCards[0]]);
    expect(restoredSaved.missingCardIds).toEqual(['UNKNOWN-001']);

    saveDraft({
      selectedDeckId: saved.id,
      name: 'Draft Royal',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0], mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    const draft = loadDraft();
    expect(draft?.selectedDeckId).toBe(saved.id);
    const restoredDraft = restoreDraftToSnapshot(draft!, mockCards);
    expect(restoredDraft.snapshot.deckState.mainDeck).toEqual([mockCards[0], mockCards[0]]);
  });

  it('stores only card references while restoring catalog metadata such as related cards', () => {
    saveDeck({
      name: 'Royal Related Test',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    saveDraft({
      selectedDeckId: null,
      name: 'Draft Related Test',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    const savedDecksPayload = window.localStorage.getItem(SAVED_DECKS_KEY) ?? '';
    const draftPayload = window.localStorage.getItem(DECK_BUILDER_DRAFT_KEY) ?? '';

    expect(savedDecksPayload).not.toContain('related_cards');
    expect(draftPayload).not.toContain('related_cards');

    const savedDeck = listSavedDecks()[0];
    const restoredSaved = restoreSavedDeckToSnapshot(savedDeck, mockCards);
    const restoredDraft = restoreDraftToSnapshot(loadDraft()!, mockCards);

    expect(restoredSaved.snapshot.deckState.mainDeck[0].related_cards).toEqual(mockCards[0].related_cards);
    expect(restoredDraft.snapshot.deckState.mainDeck[0].related_cards).toEqual(mockCards[0].related_cards);
  });

  it('ignores broken storage payloads and clears drafts safely', () => {
    window.localStorage.setItem(SAVED_DECKS_KEY, '{broken');
    window.localStorage.setItem(DECK_BUILDER_DRAFT_KEY, '{"broken":true}');

    expect(listSavedDecks()).toEqual([]);
    expect(loadDraft()).toBeNull();

    clearDraft();
    expect(window.localStorage.getItem(DECK_BUILDER_DRAFT_KEY)).toBeNull();
  });

  it('compares snapshots using normalized saved content', () => {
    const emptySnapshot = createDeckSnapshot('  My Deck  ', otherRuleConfig, createEmptyDeckState());
    const sameSnapshot = createDeckSnapshot('My Deck', otherRuleConfig, createEmptyDeckState());
    const differentSnapshot = createDeckSnapshot('Other', otherRuleConfig, createEmptyDeckState());

    expect(areDeckSnapshotsEqual(emptySnapshot, sameSnapshot)).toBe(true);
    expect(areDeckSnapshotsEqual(emptySnapshot, differentSnapshot)).toBe(false);
  });

  it('deletes saved decks cleanly', () => {
    const saved = saveDeck({
      name: 'Delete Me',
      ruleConfig: otherRuleConfig,
      deckState: createEmptyDeckState(),
    });

    deleteSavedDeck(saved.id);
    expect(getSavedDeckById(saved.id)).toBeNull();
    expect(listSavedDecks()).toEqual([]);
  });

  it('duplicates saved decks with a new id and copied sections', () => {
    const saved = saveDeck({
      name: 'Base Deck',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0], mockCards[0]],
        evolveDeck: [mockCards[1]],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    vi.setSystemTime(new Date('2026-03-20T02:00:00.000Z'));

    const duplicated = duplicateSavedDeck(saved.id);

    expect(duplicated).not.toBeNull();
    expect(duplicated?.id).not.toBe(saved.id);
    expect(duplicated?.name).toBe('Base Deck copy');
    expect(duplicated?.createdAt).toBe('2026-03-20T02:00:00.000Z');
    expect(duplicated?.updatedAt).toBe('2026-03-20T02:00:00.000Z');
    expect(duplicated?.sections).toEqual(saved.sections);
    expect(listSavedDecks()).toHaveLength(2);
    expect(listSavedDecks()[0].id).toBe(duplicated?.id);
    expect(duplicateSavedDeck('missing-id')).toBeNull();
  });

  it('renames saved decks with normalized names and returns null for missing ids', () => {
    const saved = saveDeck({
      name: 'Rename Me',
      ruleConfig: otherRuleConfig,
      deckState: createEmptyDeckState(),
    });

    vi.setSystemTime(new Date('2026-03-20T03:00:00.000Z'));

    const renamed = renameSavedDeck(saved.id, '   ');

    expect(renamed).not.toBeNull();
    expect(renamed?.name).toBe('My Deck');
    expect(renamed?.updatedAt).toBe('2026-03-20T03:00:00.000Z');
    expect(getSavedDeckById(saved.id)?.name).toBe('My Deck');
    expect(renameSavedDeck('missing-id', 'Ignored')).toBeNull();
  });
});
