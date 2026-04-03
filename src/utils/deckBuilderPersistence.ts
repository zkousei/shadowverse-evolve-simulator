import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import {
  createDefaultDeckRuleConfig,
  getImportedDeckRuleConfig,
  type DeckRuleConfig,
} from '../models/deckRule';
import { createEmptyDeckState, type DeckState } from '../models/deckState';
import { resolveDeckName } from './deckBuilderDisplay';
import { sanitizeImportedDeckState } from './deckBuilderRules';
import { resolveImportedDeckName } from './deckFile';
import {
  areDeckSnapshotsEqual,
  createDeckSnapshot,
  hasReachedHardSavedDeckLimit,
  hasReachedSoftSavedDeckLimit,
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

export type DeckBuilderSaveState = {
  hasReachedSoftLimit: boolean;
  hasReachedHardLimit: boolean;
  wouldCreateNewSavedDeck: boolean;
  canCreateNewSavedDeck: boolean;
  canSaveCurrentDeck: boolean;
  isDirty: boolean;
  hasBuilderState: boolean;
  saveStateMessage: string;
};

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

export type DeckBuilderSessionState = {
  deckName?: string;
  ruleConfig: DeckRuleConfig;
  deckState: DeckState;
  selectedSavedDeckId: string | null;
  savedBaselineSnapshot: DeckBuilderSnapshot | null;
  draftRestored: boolean;
  pendingDraftRestore: PendingDraftRestoreState | null;
};

export type DraftPersistenceAction = 'skip' | 'clear' | 'save';

export const buildDeckBuilderSaveState = (
  currentSnapshot: DeckBuilderSnapshot,
  pristineSnapshot: DeckBuilderSnapshot,
  savedBaselineSnapshot: DeckBuilderSnapshot | null,
  selectedSavedDeckId: string | null,
  savedDeckCount: number,
  t: DeckBuilderFeedbackTranslator
): DeckBuilderSaveState => {
  const hasReachedSoftLimit = hasReachedSoftSavedDeckLimit(savedDeckCount);
  const hasReachedHardLimit = hasReachedHardSavedDeckLimit(savedDeckCount);
  const wouldCreateNewSavedDeck = selectedSavedDeckId === null;
  const canCreateNewSavedDeck = !hasReachedHardLimit;
  const canSaveCurrentDeck = !wouldCreateNewSavedDeck || canCreateNewSavedDeck;
  const isDirty = savedBaselineSnapshot
    ? !areDeckSnapshotsEqual(currentSnapshot, savedBaselineSnapshot)
    : !areDeckSnapshotsEqual(currentSnapshot, pristineSnapshot);
  const hasBuilderState = !areDeckSnapshotsEqual(currentSnapshot, pristineSnapshot);

  return {
    hasReachedSoftLimit,
    hasReachedHardLimit,
    wouldCreateNewSavedDeck,
    canCreateNewSavedDeck,
    canSaveCurrentDeck,
    isDirty,
    hasBuilderState,
    saveStateMessage: selectedSavedDeckId
      ? (isDirty ? t('deckBuilder.status.unsavedChanges') : t('deckBuilder.status.saved'))
      : t('deckBuilder.status.notSaved'),
  };
};

export const getDraftPersistenceAction = (
  cardsLength: number,
  hasInitializedDraft: boolean,
  hasPendingDraftRestore: boolean,
  hasBuilderState: boolean
): DraftPersistenceAction => {
  if (cardsLength === 0 || !hasInitializedDraft || hasPendingDraftRestore) {
    return 'skip';
  }

  return hasBuilderState ? 'save' : 'clear';
};

export const buildDraftPersistencePayload = (
  selectedDeckId: string | null,
  deckName: string,
  ruleConfig: DeckRuleConfig,
  deckState: DeckState
): DeckBuilderDraftV1 => ({
  schemaVersion: 1,
  selectedDeckId,
  lastEditedAt: new Date().toISOString(),
  name: resolveDeckName(deckName),
  ruleConfig,
  deckState,
});

export const buildDetachedDeckBuilderTrackingState = (): Pick<
  DeckBuilderSessionState,
  'selectedSavedDeckId' | 'savedBaselineSnapshot' | 'draftRestored' | 'pendingDraftRestore'
> => ({
  selectedSavedDeckId: null,
  savedBaselineSnapshot: null,
  draftRestored: false,
  pendingDraftRestore: null,
});

export const buildResetDeckBuilderSessionState = (): DeckBuilderSessionState => ({
  deckName: '',
  ruleConfig: createDefaultDeckRuleConfig(),
  deckState: createEmptyDeckState(),
  ...buildDetachedDeckBuilderTrackingState(),
});

export const buildImportedDeckSessionState = (
  importedDeckState: ImportedDeckBuilderState
): DeckBuilderSessionState => ({
  ...(importedDeckState.deckName ? { deckName: importedDeckState.deckName } : {}),
  ruleConfig: importedDeckState.ruleConfig,
  deckState: importedDeckState.deckState,
  ...buildDetachedDeckBuilderTrackingState(),
});

export const buildContinuedDraftRestoreSessionState = (
  pendingDraftRestore: PendingDraftRestoreState
): DeckBuilderSessionState => ({
  deckName: pendingDraftRestore.snapshot.name,
  ruleConfig: pendingDraftRestore.snapshot.ruleConfig,
  deckState: pendingDraftRestore.snapshot.deckState,
  selectedSavedDeckId: pendingDraftRestore.selectedDeckId,
  savedBaselineSnapshot: pendingDraftRestore.baselineSnapshot,
  draftRestored: true,
  pendingDraftRestore: null,
});

export const buildLoadedSavedDeckSessionState = (
  restoredDeck: RestoredSavedDeckBuilderState
): DeckBuilderSessionState => ({
  deckName: restoredDeck.deckName,
  ruleConfig: restoredDeck.ruleConfig,
  deckState: restoredDeck.deckState,
  selectedSavedDeckId: restoredDeck.selectedSavedDeckId,
  savedBaselineSnapshot: restoredDeck.savedBaselineSnapshot,
  draftRestored: false,
  pendingDraftRestore: null,
});

export const buildSavedDeckPersistedSessionState = (
  savedDeck: SavedDeckRecordV1,
  snapshot: DeckBuilderSnapshot
): DeckBuilderSessionState => ({
  deckName: savedDeck.name,
  ruleConfig: snapshot.ruleConfig,
  deckState: snapshot.deckState,
  selectedSavedDeckId: savedDeck.id,
  savedBaselineSnapshot: createDeckSnapshot(
    savedDeck.name,
    snapshot.ruleConfig,
    snapshot.deckState
  ),
  draftRestored: false,
  pendingDraftRestore: null,
});

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
