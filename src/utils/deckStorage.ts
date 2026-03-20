import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckState } from '../models/deckState';
import type { DeckRuleConfig } from '../models/deckRule';
import { createEmptyDeckState } from '../models/deckState';
import { uuid } from './helpers';

export type SavedDeckCardRef = {
  cardId: string;
  count: number;
};

export type SavedDeckSections = {
  main: SavedDeckCardRef[];
  evolve: SavedDeckCardRef[];
  leader: SavedDeckCardRef[];
  token: SavedDeckCardRef[];
};

export type SavedDeckRecordV1 = {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  ruleConfig: DeckRuleConfig;
  sections: SavedDeckSections;
};

export type DeckBuilderDraftV1 = {
  schemaVersion: 1;
  selectedDeckId: string | null;
  lastEditedAt: string;
  name: string;
  ruleConfig: DeckRuleConfig;
  sections: SavedDeckSections;
};

export type DeckBuilderSnapshot = {
  name: string;
  ruleConfig: DeckRuleConfig;
  deckState: DeckState;
};

export type RestoreDeckResult = {
  snapshot: DeckBuilderSnapshot;
  missingCardIds: string[];
};

export type SaveDeckInput = {
  id?: string;
  name: string;
  ruleConfig: DeckRuleConfig;
  deckState: DeckState;
};

export const SAVED_DECKS_KEY = 'sve.savedDecks.v1';
export const DECK_BUILDER_DRAFT_KEY = 'sve.deckBuilderDraft.v1';
export const SOFT_SAVED_DECK_LIMIT = 100;
export const HARD_SAVED_DECK_LIMIT = 200;

const SCHEMA_VERSION = 1 as const;

type SavedDeckCollectionV1 = {
  schemaVersion: 1;
  decks: SavedDeckRecordV1[];
};

const EMPTY_SECTIONS: SavedDeckSections = {
  main: [],
  evolve: [],
  leader: [],
  token: [],
};

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
};

const normalizeDeckName = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : 'My Deck';
};

const compactCardsToRefs = (cards: DeckBuilderCardData[]): SavedDeckCardRef[] => {
  const counts = new Map<string, number>();

  cards.forEach(card => {
    counts.set(card.id, (counts.get(card.id) ?? 0) + 1);
  });

  return Array.from(counts.entries()).map(([cardId, count]) => ({ cardId, count }));
};

const expandCardRefs = (
  refs: SavedDeckCardRef[],
  cardCatalogById: Map<string, DeckBuilderCardData>
): { cards: DeckBuilderCardData[]; missingCardIds: string[] } => {
  const cards: DeckBuilderCardData[] = [];
  const missingCardIds = new Set<string>();

  refs.forEach(ref => {
    const card = cardCatalogById.get(ref.cardId);
    if (!card) {
      missingCardIds.add(ref.cardId);
      return;
    }

    const copyCount = Number.isFinite(ref.count) && ref.count > 0 ? Math.floor(ref.count) : 0;
    for (let index = 0; index < copyCount; index += 1) {
      cards.push(card);
    }
  });

  return { cards, missingCardIds: Array.from(missingCardIds) };
};

const isSavedDeckCardRef = (value: unknown): value is SavedDeckCardRef => (
  typeof value === 'object'
  && value !== null
  && typeof (value as SavedDeckCardRef).cardId === 'string'
  && typeof (value as SavedDeckCardRef).count === 'number'
);

const isSavedDeckSections = (value: unknown): value is SavedDeckSections => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as SavedDeckSections;
  return ['main', 'evolve', 'leader', 'token'].every(section => (
    Array.isArray(candidate[section as keyof SavedDeckSections])
    && candidate[section as keyof SavedDeckSections].every(isSavedDeckCardRef)
  ));
};

const isDeckRuleConfig = (value: unknown): value is DeckRuleConfig => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as DeckRuleConfig;
  return (
    (candidate.format === 'constructed' || candidate.format === 'crossover' || candidate.format === 'other')
    && (candidate.identityType === 'class' || candidate.identityType === 'title')
    && Array.isArray(candidate.selectedClasses)
    && candidate.selectedClasses.length === 2
  );
};

const isSavedDeckRecordV1 = (value: unknown): value is SavedDeckRecordV1 => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as SavedDeckRecordV1;
  return (
    candidate.schemaVersion === SCHEMA_VERSION
    && typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.createdAt === 'string'
    && typeof candidate.updatedAt === 'string'
    && isDeckRuleConfig(candidate.ruleConfig)
    && isSavedDeckSections(candidate.sections)
  );
};

const isSavedDeckCollectionV1 = (value: unknown): value is SavedDeckCollectionV1 => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as SavedDeckCollectionV1;
  return candidate.schemaVersion === SCHEMA_VERSION
    && Array.isArray(candidate.decks)
    && candidate.decks.every(isSavedDeckRecordV1);
};

const isDeckBuilderDraftV1 = (value: unknown): value is DeckBuilderDraftV1 => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as DeckBuilderDraftV1;
  return (
    candidate.schemaVersion === SCHEMA_VERSION
    && (candidate.selectedDeckId === null || typeof candidate.selectedDeckId === 'string')
    && typeof candidate.lastEditedAt === 'string'
    && typeof candidate.name === 'string'
    && isDeckRuleConfig(candidate.ruleConfig)
    && isSavedDeckSections(candidate.sections)
  );
};

const readJson = (key: string): unknown => {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(key, JSON.stringify(value));
};

const writeSavedDecks = (decks: SavedDeckRecordV1[]): void => {
  writeJson(SAVED_DECKS_KEY, {
    schemaVersion: SCHEMA_VERSION,
    decks,
  } satisfies SavedDeckCollectionV1);
};

const getCurrentTimestamp = (): string => new Date().toISOString();

export const serializeDeckState = (deckState: DeckState): SavedDeckSections => ({
  main: compactCardsToRefs(deckState.mainDeck),
  evolve: compactCardsToRefs(deckState.evolveDeck),
  leader: compactCardsToRefs(deckState.leaderCards),
  token: compactCardsToRefs(deckState.tokenDeck),
});

export const restoreDeckState = (
  sections: SavedDeckSections,
  availableCards: DeckBuilderCardData[]
): { deckState: DeckState; missingCardIds: string[] } => {
  const cardCatalogById = new Map(availableCards.map(card => [card.id, card]));
  const main = expandCardRefs(sections.main, cardCatalogById);
  const evolve = expandCardRefs(sections.evolve, cardCatalogById);
  const leader = expandCardRefs(sections.leader, cardCatalogById);
  const token = expandCardRefs(sections.token, cardCatalogById);

  return {
    deckState: {
      mainDeck: main.cards,
      evolveDeck: evolve.cards,
      leaderCards: leader.cards,
      tokenDeck: token.cards,
    },
    missingCardIds: Array.from(new Set([
      ...main.missingCardIds,
      ...evolve.missingCardIds,
      ...leader.missingCardIds,
      ...token.missingCardIds,
    ])),
  };
};

export const createDeckSnapshot = (
  name: string,
  ruleConfig: DeckRuleConfig,
  deckState: DeckState
): DeckBuilderSnapshot => ({
  name: normalizeDeckName(name),
  ruleConfig,
  deckState,
});

const normalizeSnapshot = (snapshot: DeckBuilderSnapshot) => ({
  name: normalizeDeckName(snapshot.name),
  ruleConfig: snapshot.ruleConfig,
  sections: serializeDeckState(snapshot.deckState),
});

export const areDeckSnapshotsEqual = (
  left: DeckBuilderSnapshot,
  right: DeckBuilderSnapshot
): boolean => JSON.stringify(normalizeSnapshot(left)) === JSON.stringify(normalizeSnapshot(right));

export const listSavedDecks = (): SavedDeckRecordV1[] => {
  const parsed = readJson(SAVED_DECKS_KEY);
  if (!isSavedDeckCollectionV1(parsed)) return [];

  return [...parsed.decks].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

export const hasReachedSoftSavedDeckLimit = (savedDeckCount: number): boolean => (
  savedDeckCount >= SOFT_SAVED_DECK_LIMIT
);

export const hasReachedHardSavedDeckLimit = (savedDeckCount: number): boolean => (
  savedDeckCount >= HARD_SAVED_DECK_LIMIT
);

export const getSavedDeckById = (id: string): SavedDeckRecordV1 | null => (
  listSavedDecks().find(deck => deck.id === id) ?? null
);

export const saveDeck = (input: SaveDeckInput): SavedDeckRecordV1 => {
  const decks = listSavedDecks();
  const now = getCurrentTimestamp();
  const normalizedName = normalizeDeckName(input.name);
  const sections = serializeDeckState(input.deckState);
  const existingDeck = input.id ? decks.find(deck => deck.id === input.id) : null;

  const nextDeck: SavedDeckRecordV1 = {
    schemaVersion: SCHEMA_VERSION,
    id: existingDeck?.id ?? uuid(),
    name: normalizedName,
    createdAt: existingDeck?.createdAt ?? now,
    updatedAt: now,
    ruleConfig: input.ruleConfig,
    sections,
  };

  const nextDecks = existingDeck
    ? decks.map(deck => (deck.id === existingDeck.id ? nextDeck : deck))
    : [nextDeck, ...decks];

  writeSavedDecks(nextDecks);
  return nextDeck;
};

export const deleteSavedDeck = (id: string): void => {
  const nextDecks = listSavedDecks().filter(deck => deck.id !== id);
  writeSavedDecks(nextDecks);
};

export const deleteAllSavedDecks = (): void => {
  writeSavedDecks([]);
};

export const deleteSavedDecks = (ids: string[]): void => {
  if (ids.length === 0) return;
  const selectedIds = new Set(ids);
  const nextDecks = listSavedDecks().filter(deck => !selectedIds.has(deck.id));
  writeSavedDecks(nextDecks);
};

export const duplicateSavedDeck = (id: string): SavedDeckRecordV1 | null => {
  const existingDeck = getSavedDeckById(id);
  if (!existingDeck) return null;
  const now = getCurrentTimestamp();
  const duplicatedDeck: SavedDeckRecordV1 = {
    ...existingDeck,
    id: uuid(),
    name: `${existingDeck.name} copy`,
    createdAt: now,
    updatedAt: now,
    sections: {
      main: existingDeck.sections.main.map(ref => ({ ...ref })),
      evolve: existingDeck.sections.evolve.map(ref => ({ ...ref })),
      leader: existingDeck.sections.leader.map(ref => ({ ...ref })),
      token: existingDeck.sections.token.map(ref => ({ ...ref })),
    },
  };
  const decks = [duplicatedDeck, ...listSavedDecks()];
  writeSavedDecks(decks);
  return duplicatedDeck;
};

export const renameSavedDeck = (id: string, name: string): SavedDeckRecordV1 | null => {
  const existingDeck = getSavedDeckById(id);
  if (!existingDeck) return null;

  const decks = listSavedDecks();
  const nextDeck: SavedDeckRecordV1 = {
    ...existingDeck,
    name: normalizeDeckName(name),
    updatedAt: getCurrentTimestamp(),
  };

  writeSavedDecks(decks.map(deck => (deck.id === id ? nextDeck : deck)));
  return nextDeck;
};

export const saveDraft = (input: {
  selectedDeckId: string | null;
  name: string;
  ruleConfig: DeckRuleConfig;
  deckState: DeckState;
}): DeckBuilderDraftV1 => {
  const draft: DeckBuilderDraftV1 = {
    schemaVersion: SCHEMA_VERSION,
    selectedDeckId: input.selectedDeckId,
    lastEditedAt: getCurrentTimestamp(),
    name: normalizeDeckName(input.name),
    ruleConfig: input.ruleConfig,
    sections: serializeDeckState(input.deckState),
  };

  writeJson(DECK_BUILDER_DRAFT_KEY, draft);
  return draft;
};

export const loadDraft = (): DeckBuilderDraftV1 | null => {
  const parsed = readJson(DECK_BUILDER_DRAFT_KEY);
  return isDeckBuilderDraftV1(parsed) ? parsed : null;
};

export const clearDraft = (): void => {
  const storage = getStorage();
  storage?.removeItem(DECK_BUILDER_DRAFT_KEY);
};

export const restoreSavedDeckToSnapshot = (
  deck: SavedDeckRecordV1,
  availableCards: DeckBuilderCardData[]
): RestoreDeckResult => {
  const restored = restoreDeckState(deck.sections, availableCards);

  return {
    snapshot: createDeckSnapshot(deck.name, deck.ruleConfig, restored.deckState),
    missingCardIds: restored.missingCardIds,
  };
};

export const restoreDraftToSnapshot = (
  draft: DeckBuilderDraftV1,
  availableCards: DeckBuilderCardData[]
): RestoreDeckResult => {
  const restored = restoreDeckState(draft.sections, availableCards);

  return {
    snapshot: createDeckSnapshot(draft.name, draft.ruleConfig, restored.deckState),
    missingCardIds: restored.missingCardIds,
  };
};

export const createEmptySavedDeckSections = (): SavedDeckSections => EMPTY_SECTIONS;

export const createPristineDeckSnapshot = (ruleConfig: DeckRuleConfig): DeckBuilderSnapshot => (
  createDeckSnapshot('My Deck', ruleConfig, createEmptyDeckState())
);
