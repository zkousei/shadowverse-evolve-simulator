import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { getImportedDeckRuleConfig, type DeckRuleConfig } from '../models/deckRule';
import type { DeckState } from '../models/deckState';
import { sanitizeImportedDeckState } from './deckBuilderRules';
import { resolveImportedDeckName } from './deckFile';
import {
  createDeckSnapshot,
  restoreDraftToSnapshot,
  restoreSavedDeckToSnapshot,
  type DeckBuilderDraftV1,
  type DeckBuilderSnapshot,
  type SavedDeckRecordV1,
} from './deckStorage';
import { DeckLogImportError, type DeckLogImportResult } from './decklogImport';

type ImportedDeckLike = {
  deckName?: unknown;
  rule?: unknown;
  identityType?: unknown;
  selectedClass?: unknown;
  selectedTitle?: unknown;
  selectedClasses?: unknown;
  mainDeck?: DeckBuilderCardData[];
  evolveDeck?: DeckBuilderCardData[];
  leaderCards?: DeckBuilderCardData[];
  leader?: DeckBuilderCardData[];
  tokenDeck?: DeckBuilderCardData[];
};

export type DeckBuilderFeedback = {
  kind: 'success' | 'warning';
  message: string;
};

export type DeckBuilderFeedbackTranslator = (
  key: string,
  params?: Record<string, string | number>
) => string;

export type ImportedDeckBuilderState = {
  deckName: string | null;
  ruleConfig: DeckRuleConfig;
  deckState: DeckState;
};

export type RestoredSavedDeckBuilderState = {
  deckName: string;
  ruleConfig: DeckRuleConfig;
  deckState: DeckState;
  selectedSavedDeckId: string;
  savedBaselineSnapshot: DeckBuilderSnapshot;
};

export type PendingDraftRestoreState = {
  snapshot: DeckBuilderSnapshot;
  selectedDeckId: string | null;
  baselineSnapshot: DeckBuilderSnapshot | null;
};

const buildSanitizedSnapshot = (
  snapshot: DeckBuilderSnapshot,
  cards: DeckBuilderCardData[]
): DeckBuilderSnapshot => {
  const sanitizedDeckState = sanitizeImportedDeckState(
    snapshot.deckState,
    cards,
    snapshot.ruleConfig
  );

  return createDeckSnapshot(snapshot.name, snapshot.ruleConfig, sanitizedDeckState);
};

export const buildJsonImportedDeckState = (
  data: ImportedDeckLike,
  fileName: string,
  cards: DeckBuilderCardData[]
): ImportedDeckBuilderState => {
  const ruleConfig = getImportedDeckRuleConfig(data);

  return {
    deckName: resolveImportedDeckName(data, fileName),
    ruleConfig,
    deckState: sanitizeImportedDeckState(data, cards, ruleConfig),
  };
};

export const buildDeckLogImportedDeckState = (
  importedDeck: DeckLogImportResult,
  cards: DeckBuilderCardData[]
): ImportedDeckBuilderState => ({
  deckName: importedDeck.deckName,
  ruleConfig: importedDeck.ruleConfig,
  deckState: sanitizeImportedDeckState(importedDeck.deckState, cards, importedDeck.ruleConfig),
});

export const buildSavedDeckLoadState = (
  savedDeck: SavedDeckRecordV1,
  cards: DeckBuilderCardData[]
): RestoredSavedDeckBuilderState => {
  const restoredDeck = restoreSavedDeckToSnapshot(savedDeck, cards);
  const savedBaselineSnapshot = buildSanitizedSnapshot(restoredDeck.snapshot, cards);

  return {
    deckName: savedBaselineSnapshot.name,
    ruleConfig: savedBaselineSnapshot.ruleConfig,
    deckState: savedBaselineSnapshot.deckState,
    selectedSavedDeckId: savedDeck.id,
    savedBaselineSnapshot,
  };
};

export const buildPendingDraftRestoreState = (
  draft: DeckBuilderDraftV1,
  cards: DeckBuilderCardData[],
  savedDeck: SavedDeckRecordV1 | null
): PendingDraftRestoreState => {
  const baselineSnapshot = savedDeck
    ? buildSavedDeckLoadState(savedDeck, cards).savedBaselineSnapshot
    : null;
  const restoredDraft = restoreDraftToSnapshot(draft, cards);

  return {
    snapshot: buildSanitizedSnapshot(restoredDraft.snapshot, cards),
    selectedDeckId: savedDeck?.id ?? null,
    baselineSnapshot,
  };
};

export const shouldDetachSavedDeckTracking = (
  selectedSavedDeckId: string | null,
  deletedDeckIds: string[]
): boolean => selectedSavedDeckId !== null && deletedDeckIds.includes(selectedSavedDeckId);

export const getDeckLogImportMessage = (
  error: unknown,
  t: DeckBuilderFeedbackTranslator
): string => {
  if (error instanceof DeckLogImportError) {
    switch (error.code) {
      case 'invalid-input':
        return t('deckBuilder.alerts.deckLogInvalidInput');
      case 'not-found':
        return t('deckBuilder.alerts.deckLogNotFound');
      case 'unsupported-game':
        return t('deckBuilder.alerts.deckLogUnsupportedGame');
      case 'fetch-failed':
        return t('deckBuilder.alerts.deckLogFetchFailed');
      case 'invalid-response':
      default:
        return t('deckBuilder.alerts.deckLogInvalidResponse');
    }
  }

  return t('deckBuilder.alerts.deckLogFetchFailed');
};

export const buildDeckLogImportFeedback = (
  importedDeck: DeckLogImportResult,
  t: DeckBuilderFeedbackTranslator
): DeckBuilderFeedback => ({
  kind: importedDeck.missingCardIds.length > 0 ? 'warning' : 'success',
  message: importedDeck.missingCardIds.length > 0
    ? t('deckBuilder.alerts.deckLogImportPartial', { count: importedDeck.missingCardIds.length })
    : t('deckBuilder.alerts.deckLogImportSuccess', { name: importedDeck.deckName }),
});
