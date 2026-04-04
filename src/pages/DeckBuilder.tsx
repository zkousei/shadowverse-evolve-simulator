import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClassFilter } from '../models/class';
import DeckBuilderDeckPane from '../components/DeckBuilderDeckPane';
import DeckBuilderDeckLogImportDialog from '../components/DeckBuilderDeckLogImportDialog';
import DeckBuilderDeleteSavedDecksDialog from '../components/DeckBuilderDeleteSavedDecksDialog';
import DeckBuilderDraftRestoreDialog from '../components/DeckBuilderDraftRestoreDialog';
import DeckBuilderHoverPreview from '../components/DeckBuilderHoverPreview';
import DeckBuilderLibraryPane from '../components/DeckBuilderLibraryPane';
import DeckBuilderMyDecksModal from '../components/DeckBuilderMyDecksModal';
import DeckBuilderPreviewModal from '../components/DeckBuilderPreviewModal';
import DeckBuilderResetDialog from '../components/DeckBuilderResetDialog';
import DeckBuilderSaveFeedback from '../components/DeckBuilderSaveFeedback';
import DeckBuilderSavedDeckConfirmDialog from '../components/DeckBuilderSavedDeckConfirmDialog';
import {
  getAvailableExpansions,
  getAvailableProductNames,
  getAvailableRarities,
  getAvailableSubtypeTags,
  getAvailableTitles,
  type DeckBuilderCardData,
} from '../models/deckBuilderCard';
import {
  createDefaultDeckRuleConfig,
  type DeckRuleConfig,
  type DeckFormat,
} from '../models/deckRule';
import { createEmptyDeckState, type DeckState } from '../models/deckState';
import {
  appendRelatedTokensToDeckState,
  canAddCardToDeckState,
  getDeckLimit,
  getAllowedSections,
  getDeckValidationMessages,
  isRuleConfigured,
  type DeckTargetSection,
} from '../utils/deckBuilderRules';
import { buildCardDetailLookup } from '../utils/cardDetails';
import {
  buildDeckBuilderCatalogView,
  getCrossoverClassOptions,
} from '../utils/deckBuilderCatalog';
import {
  type DeckBuilderCardTypeFilter,
  type DeckBuilderDeckSectionFilter,
  type DeckBuilderLibraryFilterState,
  buildDefaultDeckBuilderLibraryFilterState,
  buildSubtypeAddedDeckBuilderLibraryFilterState,
  buildSubtypeRemovedDeckBuilderLibraryFilterState,
  buildUpdatedDeckBuilderLibraryFilterState,
  buildUpdatedDeckBuilderLibraryFilterStateWithPageReset,
} from '../utils/deckBuilderFilters';
import {
  type DeckBuilderMyDecksUiStatePatch,
  buildClearedSavedDeckSelectionUiState,
  buildClosedMyDecksUiState,
  buildCompletedDeleteAllSavedDecksUiState,
  buildCompletedDeleteSelectedSavedDecksUiState,
  buildCompletedSavedDeckLoadUiState,
  buildDismissedDeleteAllSavedDecksUiState,
  buildDismissedDeleteSelectedSavedDecksUiState,
  buildDismissedPendingSavedDeckDeleteUiState,
  buildDismissedPendingSavedDeckLoadUiState,
  buildEnteredSavedDeckSelectionUiState,
  buildOpenedDeleteAllSavedDecksUiState,
  buildOpenedDeleteSelectedSavedDecksUiState,
  buildOpenedMyDecksUiState,
  buildOpenedPendingSavedDeckDeleteUiState,
  buildOpenedPendingSavedDeckLoadUiState,
  buildToggledSavedDeckSelectionUiState,
  buildToggledShownSavedDeckSelectionUiState,
  buildUpdatedSavedDeckSearchUiState,
} from '../utils/deckBuilderMyDecksState';
import {
  type DeckBuilderModalUiStatePatch,
  buildDismissedDeckLogImportUiState,
  buildDismissedResetBuilderDialogUiState,
  buildDismissedResetDeckDialogUiState,
  buildFinishedDeckLogImportUiState,
  buildOpenedDeckLogImportUiState,
  buildOpenedResetBuilderDialogUiState,
  buildOpenedResetDeckDialogUiState,
  buildStartedDeckLogImportUiState,
} from '../utils/deckBuilderModalState';
import {
  type DeckBuilderPreviewUiStatePatch,
  buildClosedPreviewUiState,
  buildDeckHoverPointerPosition,
  buildEndedDeckHoverUiState,
  buildMovedDeckHoverUiState,
  buildOpenedPreviewUiState,
  buildStartedDeckHoverUiState,
} from '../utils/deckBuilderPreviewState';
import {
  buildConstructedClassUpdatedRuleConfig,
  buildConstructedTitleUpdatedRuleConfig,
  buildCrossoverClassUpdatedRuleConfig,
  buildDeckFormatUpdatedRuleConfig,
  buildDeckIdentityTypeUpdatedRuleConfig,
} from '../utils/deckBuilderRuleConfig';
import {
  clearDraft,
  createDeckSnapshot,
  createPristineDeckSnapshot,
  deleteAllSavedDecks,
  deleteSavedDeck,
  deleteSavedDecks,
  duplicateSavedDeck,
  getSavedDeckById,
  HARD_SAVED_DECK_LIMIT,
  listSavedDecks,
  loadDraft,
  restoreSavedDeckToSnapshot,
  saveDeck,
  saveDraft,
  type DeckBuilderSnapshot,
  type SavedDeckRecordV1,
} from '../utils/deckStorage';
import {
  buildExportableDeckPayload,
  downloadDeckJson,
} from '../utils/deckFile';
import { addCardToDeckState, removeCardFromDeckState } from '../utils/deckBuilderMutations';
import {
  type DeckBuilderSessionState,
  type DeckBuilderTrackingStatePatch,
  type PendingDraftRestoreState,
  buildClearedSavedDeckTrackingState,
  buildContinuedDraftRestoreSessionState,
  buildDeckBuilderSaveState,
  buildDeckLogImportFeedback,
  buildDeckLogImportedDeckState,
  buildDetachedDeckBuilderTrackingState,
  buildDraftPersistencePayload,
  buildImportedDeckSessionState,
  buildJsonImportedDeckState,
  buildLoadedSavedDeckSessionState,
  buildPendingDraftRestoreState,
  buildResetDeckBuilderSessionState,
  buildSavedDeckPersistedSessionState,
  buildSavedDeckLoadState,
  getDraftPersistenceAction,
  getDeckLogImportMessage,
  shouldDetachSavedDeckTracking,
} from '../utils/deckBuilderPersistence';
import {
  areAllShownSavedDecksSelected,
  buildFilteredSavedDecks,
  canAddSubtypeTag,
  getFilteredSubtypeOptions,
  getSavedDeckSelectionUiState,
  getShownSavedDeckIds,
} from '../utils/deckBuilderSelections';
import {
  DECK_HOVER_PREVIEW_MAX_HEIGHT,
  DECK_HOVER_PREVIEW_VIEWPORT_PADDING,
  DECK_HOVER_PREVIEW_WIDTH,
  getDeckHoverPreviewPosition,
  groupDeckCardsForDisplay,
  resolveDeckName,
  sortDeckCardsForDisplay,
  type DeckSortMode,
} from '../utils/deckBuilderDisplay';
import { loadCardCatalog } from '../utils/cardCatalog';
import { fetchDeckLogImport } from '../utils/decklogImport';

const PAGE_SIZE = 50;
const COST_FILTER_VALUES = ['All', '0', '1', '2', '3', '4', '5', '6', '7+'] as const;
const DECK_SECTION_FILTER_VALUES: readonly DeckBuilderDeckSectionFilter[] = ['All', 'main', 'evolve', 'leader', 'token'];
const CARD_TYPE_FILTER_VALUES: readonly DeckBuilderCardTypeFilter[] = ['All', 'follower', 'spell', 'amulet'];

type SaveFeedback = {
  kind: 'success' | 'warning';
  message: string;
};

const DeckBuilder: React.FC = () => {
  const { t } = useTranslation();
  const [cards, setCards] = useState<DeckBuilderCardData[]>([]);
  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState('All');
  const [expansionFilter, setExpansionFilter] = useState('All');
  const [classFilter, setClassFilter] = useState<ClassFilter>('All');
  const [cardTypeFilter, setCardTypeFilter] = useState<DeckBuilderCardTypeFilter>('All');
  const [rarityFilter, setRarityFilter] = useState('All');
  const [productNameFilter, setProductNameFilter] = useState('All');
  const [subtypeSearch, setSubtypeSearch] = useState('');
  const [selectedSubtypeTags, setSelectedSubtypeTags] = useState<string[]>([]);
  const [deckSectionFilter, setDeckSectionFilter] = useState<DeckBuilderDeckSectionFilter>('All');
  const [hideSameNameVariants, setHideSameNameVariants] = useState(false);
  const [page, setPage] = useState(0);

  const [deckName, setDeckName] = useState('');
  const [deckRuleConfig, setDeckRuleConfig] = useState(createDefaultDeckRuleConfig());
  const [deckState, setDeckState] = useState<DeckState>(createEmptyDeckState());
  const [deckSortMode, setDeckSortMode] = useState<DeckSortMode>('added');
  const [showResetDeckDialog, setShowResetDeckDialog] = useState(false);
  const [previewCard, setPreviewCard] = useState<DeckBuilderCardData | null>(null);
  const [hoveredDeckCard, setHoveredDeckCard] = useState<DeckBuilderCardData | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [savedDecks, setSavedDecks] = useState<SavedDeckRecordV1[]>(() => listSavedDecks());
  const [selectedSavedDeckId, setSelectedSavedDeckId] = useState<string | null>(null);
  const [savedBaselineSnapshot, setSavedBaselineSnapshot] = useState<DeckBuilderSnapshot | null>(null);
  const [isMyDecksOpen, setIsMyDecksOpen] = useState(false);
  const [savedDeckSearch, setSavedDeckSearch] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [hasInitializedDraft, setHasInitializedDraft] = useState(false);
  const [pendingDraftRestore, setPendingDraftRestore] = useState<PendingDraftRestoreState | null>(null);
  const [pendingDeleteDeckId, setPendingDeleteDeckId] = useState<string | null>(null);
  const [showDeleteAllSavedDecksDialog, setShowDeleteAllSavedDecksDialog] = useState(false);
  const [showDeleteSelectedSavedDecksDialog, setShowDeleteSelectedSavedDecksDialog] = useState(false);
  const [pendingLoadDeckId, setPendingLoadDeckId] = useState<string | null>(null);
  const [showResetBuilderDialog, setShowResetBuilderDialog] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);
  const [isSavedDeckSelectMode, setIsSavedDeckSelectMode] = useState(false);
  const [selectedSavedDeckIds, setSelectedSavedDeckIds] = useState<string[]>([]);
  const [isDeckLogImportOpen, setIsDeckLogImportOpen] = useState(false);
  const [deckLogInput, setDeckLogInput] = useState('');
  const [isImportingDeckLog, setIsImportingDeckLog] = useState(false);

  const applyDeckBuilderPreviewUiState = (state: DeckBuilderPreviewUiStatePatch) => {
    if (state.previewCard !== undefined) {
      setPreviewCard(state.previewCard);
    }
    if (state.hoveredDeckCard !== undefined) {
      setHoveredDeckCard(state.hoveredDeckCard);
    }
    if (state.hoverPos !== undefined) {
      setHoverPos(state.hoverPos);
    }
  };

  useEffect(() => {
    loadCardCatalog()
      .then(data => setCards(data))
      .catch(err => console.error("Could not load cards", err));
  }, []);

  useEffect(() => {
    if (!previewCard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        applyDeckBuilderPreviewUiState(buildClosedPreviewUiState());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewCard]);

  useEffect(() => {
    if (cards.length === 0 || hasInitializedDraft) return;

    const draft = loadDraft();
    if (!draft) {
      setHasInitializedDraft(true);
      return;
    }

    const savedDeck = draft.selectedDeckId ? getSavedDeckById(draft.selectedDeckId) : null;
    setPendingDraftRestore(buildPendingDraftRestoreState(draft, cards, savedDeck));
    setHasInitializedDraft(true);
  }, [cards, hasInitializedDraft]);

  // Extract unique expansions (prefix before hyphen)
  const expansions = getAvailableExpansions(cards);
  const rarities = getAvailableRarities(cards);
  const productNames = getAvailableProductNames(cards);
  const subtypeTags = getAvailableSubtypeTags(cards);
  const titles = getAvailableTitles(cards);
  const cardDetailLookup = React.useMemo(() => buildCardDetailLookup(cards), [cards]);
  const isRuleReady = isRuleConfigured(deckRuleConfig);
  const leaderLimit = getDeckLimit('leader', deckRuleConfig);
  const {
    paginatedCards,
    totalPages,
  } = buildDeckBuilderCatalogView(cards, deckRuleConfig, {
    search,
    costFilter,
    expansionFilter,
    classFilter,
    cardTypeFilter,
    rarityFilter,
    productNameFilter,
    selectedSubtypeTags,
    deckSectionFilter,
    hideSameNameVariants,
    page,
    pageSize: PAGE_SIZE,
  });
  const { mainDeck, evolveDeck, leaderCards, tokenDeck } = deckState;
  const deckIssueMessages = getDeckValidationMessages(deckState, deckRuleConfig);
  const sortedLeaderCards = sortDeckCardsForDisplay(leaderCards, deckSortMode);
  const sortedMainDeck = sortDeckCardsForDisplay(mainDeck, deckSortMode);
  const sortedEvolveDeck = sortDeckCardsForDisplay(evolveDeck, deckSortMode);
  const sortedTokenDeck = sortDeckCardsForDisplay(tokenDeck, deckSortMode);
  const groupedLeaderCards = groupDeckCardsForDisplay(sortedLeaderCards);
  const groupedMainDeck = groupDeckCardsForDisplay(sortedMainDeck);
  const groupedEvolveDeck = groupDeckCardsForDisplay(sortedEvolveDeck);
  const groupedTokenDeck = groupDeckCardsForDisplay(sortedTokenDeck);
  const { firstOptions: crossoverClassOptionsA, secondOptions: crossoverClassOptionsB } = getCrossoverClassOptions(
    deckRuleConfig.selectedClasses
  );
  const canExportDeck = deckIssueMessages.length === 0;
  const currentSnapshot = createDeckSnapshot(deckName, deckRuleConfig, deckState);
  const pristineSnapshot = React.useMemo(() => createPristineDeckSnapshot(createDefaultDeckRuleConfig()), []);
  const savedDeckCount = savedDecks.length;
  const {
    hasReachedSoftLimit,
    hasReachedHardLimit,
    canCreateNewSavedDeck,
    canSaveCurrentDeck,
    isDirty,
    hasBuilderState,
    saveStateMessage,
  } = buildDeckBuilderSaveState(
    currentSnapshot,
    pristineSnapshot,
    savedBaselineSnapshot,
    selectedSavedDeckId,
    savedDeckCount,
    t
  );
  const filteredSavedDecks = React.useMemo(
    () => buildFilteredSavedDecks(savedDecks, cards, savedDeckSearch),
    [cards, savedDeckSearch, savedDecks]
  );
  const shownSavedDeckIds = React.useMemo(() => getShownSavedDeckIds(filteredSavedDecks), [filteredSavedDecks]);
  const areAllShownSavedDecksSelectedValue = areAllShownSavedDecksSelected(
    shownSavedDeckIds,
    selectedSavedDeckIds
  );
  const savedDeckSelectionUiState = getSavedDeckSelectionUiState({
    filteredSavedDeckCount: filteredSavedDecks.length,
    savedDeckCount,
    isSavedDeckSelectMode,
    selectedSavedDeckCount: selectedSavedDeckIds.length,
    areAllShownSavedDecksSelected: areAllShownSavedDecksSelectedValue,
  });

  useEffect(() => {
    const draftPersistenceAction = getDraftPersistenceAction(
      cards.length,
      hasInitializedDraft,
      pendingDraftRestore !== null,
      hasBuilderState
    );
    if (draftPersistenceAction === 'skip') return;

    if (draftPersistenceAction === 'clear') {
      clearDraft();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveDraft(buildDraftPersistencePayload(selectedSavedDeckId, deckName, deckRuleConfig, deckState));
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [cards.length, deckName, deckRuleConfig, deckState, hasBuilderState, hasInitializedDraft, pendingDraftRestore, selectedSavedDeckId]);

  useEffect(() => {
    if (!saveFeedback) return;

    const timeoutId = window.setTimeout(() => {
      setSaveFeedback(null);
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [saveFeedback]);

  const refreshSavedDecks = () => {
    setSavedDecks(listSavedDecks());
  };

  const applyDeckBuilderTrackingState = (state: DeckBuilderTrackingStatePatch) => {
    if (state.selectedSavedDeckId !== undefined) {
      setSelectedSavedDeckId(state.selectedSavedDeckId);
    }
    if (state.savedBaselineSnapshot !== undefined) {
      setSavedBaselineSnapshot(state.savedBaselineSnapshot);
    }
    if (state.draftRestored !== undefined) {
      setDraftRestored(state.draftRestored);
    }
    if (state.pendingDraftRestore !== undefined) {
      setPendingDraftRestore(state.pendingDraftRestore);
    }
  };

  const applyDeckBuilderSessionState = (state: DeckBuilderSessionState) => {
    if (state.deckName !== undefined) {
      setDeckName(state.deckName);
    }

    setDeckRuleConfig(state.ruleConfig);
    setDeckState(state.deckState);
    applyDeckBuilderTrackingState(state);
  };

  const updateDeckRuleConfig = (
    updater: (current: DeckRuleConfig) => DeckRuleConfig
  ) => {
    setDeckRuleConfig(current => updater(current));
  };

  const applyDeckBuilderMyDecksUiState = (state: DeckBuilderMyDecksUiStatePatch) => {
    if (state.isMyDecksOpen !== undefined) {
      setIsMyDecksOpen(state.isMyDecksOpen);
    }
    if (state.pendingLoadDeckId !== undefined) {
      setPendingLoadDeckId(state.pendingLoadDeckId);
    }
    if (state.pendingDeleteDeckId !== undefined) {
      setPendingDeleteDeckId(state.pendingDeleteDeckId);
    }
    if (state.showDeleteAllSavedDecksDialog !== undefined) {
      setShowDeleteAllSavedDecksDialog(state.showDeleteAllSavedDecksDialog);
    }
    if (state.showDeleteSelectedSavedDecksDialog !== undefined) {
      setShowDeleteSelectedSavedDecksDialog(state.showDeleteSelectedSavedDecksDialog);
    }
    if (state.isSavedDeckSelectMode !== undefined) {
      setIsSavedDeckSelectMode(state.isSavedDeckSelectMode);
    }
    if (state.selectedSavedDeckIds !== undefined) {
      setSelectedSavedDeckIds(state.selectedSavedDeckIds);
    }
    if (state.savedDeckSearch !== undefined) {
      setSavedDeckSearch(state.savedDeckSearch);
    }
  };

  const clearSavedDeckSelection = () => {
    applyDeckBuilderMyDecksUiState(buildClearedSavedDeckSelectionUiState());
  };

  const applyDeckBuilderModalUiState = (state: DeckBuilderModalUiStatePatch) => {
    if (state.showResetDeckDialog !== undefined) {
      setShowResetDeckDialog(state.showResetDeckDialog);
    }
    if (state.showResetBuilderDialog !== undefined) {
      setShowResetBuilderDialog(state.showResetBuilderDialog);
    }
    if (state.isDeckLogImportOpen !== undefined) {
      setIsDeckLogImportOpen(state.isDeckLogImportOpen);
    }
    if (state.deckLogInput !== undefined) {
      setDeckLogInput(state.deckLogInput);
    }
    if (state.isImportingDeckLog !== undefined) {
      setIsImportingDeckLog(state.isImportingDeckLog);
    }
  };

  const buildCurrentLibraryFilterState = (): DeckBuilderLibraryFilterState => ({
    search,
    costFilter,
    expansionFilter,
    classFilter,
    cardTypeFilter,
    rarityFilter,
    productNameFilter,
    subtypeSearch,
    selectedSubtypeTags,
    deckSectionFilter,
    hideSameNameVariants,
    page,
  });

  const applyDeckBuilderLibraryFilterState = (state: DeckBuilderLibraryFilterState) => {
    setSearch(state.search);
    setCostFilter(state.costFilter);
    setExpansionFilter(state.expansionFilter);
    setClassFilter(state.classFilter);
    setCardTypeFilter(state.cardTypeFilter);
    setRarityFilter(state.rarityFilter);
    setProductNameFilter(state.productNameFilter);
    setSubtypeSearch(state.subtypeSearch);
    setSelectedSubtypeTags(state.selectedSubtypeTags);
    setDeckSectionFilter(state.deckSectionFilter);
    setHideSameNameVariants(state.hideSameNameVariants);
    setPage(state.page);
  };

  const resetBuilderState = () => {
    applyDeckBuilderSessionState(buildResetDeckBuilderSessionState());
  };

  const handleStartFresh = () => {
    clearDraft();
    resetBuilderState();
  };

  const handleContinueDraftRestore = () => {
    if (!pendingDraftRestore) return;

    applyDeckBuilderSessionState(buildContinuedDraftRestoreSessionState(pendingDraftRestore));
  };

  const resetLibraryFilters = () => {
    applyDeckBuilderLibraryFilterState(buildDefaultDeckBuilderLibraryFilterState());
  };

  const updateLibraryFilters = (
    patch: Partial<DeckBuilderLibraryFilterState>
  ) => {
    applyDeckBuilderLibraryFilterState(
      buildUpdatedDeckBuilderLibraryFilterState(buildCurrentLibraryFilterState(), patch)
    );
  };

  const updateLibraryFiltersWithPageReset = (
    patch: Omit<Partial<DeckBuilderLibraryFilterState>, 'page'>
  ) => {
    applyDeckBuilderLibraryFilterState(
      buildUpdatedDeckBuilderLibraryFilterStateWithPageReset(
        buildCurrentLibraryFilterState(),
        patch
      )
    );
  };

  const addSubtypeTag = (tag: string) => {
    applyDeckBuilderLibraryFilterState(
      buildSubtypeAddedDeckBuilderLibraryFilterState(
        buildCurrentLibraryFilterState(),
        subtypeTags,
        tag
      )
    );
  };

  const removeSubtypeTag = (tag: string) => {
    applyDeckBuilderLibraryFilterState(
      buildSubtypeRemovedDeckBuilderLibraryFilterState(buildCurrentLibraryFilterState(), tag)
    );
  };

  const filteredSubtypeOptions = getFilteredSubtypeOptions(subtypeTags, subtypeSearch);
  const previewDetail = previewCard ? cardDetailLookup[previewCard.id] ?? null : null;
  const hoveredDetail = hoveredDeckCard ? cardDetailLookup[hoveredDeckCard.id] ?? null : null;
  const hoveredPreviewPosition = hoveredDeckCard
    ? getDeckHoverPreviewPosition(hoverPos, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    : null;

  const handleOpenPreview = (card: DeckBuilderCardData) => {
    applyDeckBuilderPreviewUiState(buildOpenedPreviewUiState(card));
  };

  const handleClosePreview = () => {
    applyDeckBuilderPreviewUiState(buildClosedPreviewUiState());
  };

  const handleDeckCardMouseEnter = (
    card: DeckBuilderCardData,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    applyDeckBuilderPreviewUiState(
      buildStartedDeckHoverUiState(
        card,
        buildDeckHoverPointerPosition(event.clientX, event.clientY)
      )
    );
  };

  const handleDeckCardMouseMove = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    applyDeckBuilderPreviewUiState(
      buildMovedDeckHoverUiState(
        buildDeckHoverPointerPosition(event.clientX, event.clientY)
      )
    );
  };

  const handleDeckCardMouseLeave = () => {
    applyDeckBuilderPreviewUiState(buildEndedDeckHoverUiState());
  };

  const addToDeck = (card: DeckBuilderCardData, targetSection: DeckTargetSection) => {
    if (!canAddCardToDeckState(card, targetSection, deckState, deckRuleConfig)) return;

    setDeckState(current => {
      const nextDeckState = addCardToDeckState(current, card, targetSection, {
        deckRuleConfig,
        leaderLimit,
      });

      return appendRelatedTokensToDeckState(nextDeckState, cards, deckRuleConfig);
    });
  };

  const removeFromDeck = (targetSection: DeckTargetSection, cardId?: string) => {
    setDeckState(current => removeCardFromDeckState(current, targetSection, cardId));
  };

  const resetDeckContents = () => {
    setDeckState(createEmptyDeckState());
    applyDeckBuilderModalUiState(buildDismissedResetDeckDialogUiState());
  };

  const resetBuilder = () => {
    clearDraft();
    resetBuilderState();
    applyDeckBuilderModalUiState(buildDismissedResetBuilderDialogUiState());
  };

  const exportDeck = () => {
    downloadDeckJson(
      resolveDeckName(deckName),
      buildExportableDeckPayload(resolveDeckName(deckName), deckRuleConfig, deckState)
    );
  };

  const handleImportDeck = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as Record<string, unknown>;
        applyDeckBuilderSessionState(
          buildImportedDeckSessionState(buildJsonImportedDeckState(data, file.name, cards))
        );
      } catch {
        alert(t('deckBuilder.alerts.importFailed'));
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again if needed
    event.target.value = '';
  };

  const handleImportDeckLog = async () => {
    if (cards.length === 0) {
      setSaveFeedback({
        kind: 'warning',
        message: t('deckBuilder.alerts.deckLogCardsLoading'),
      });
      return;
    }

    applyDeckBuilderModalUiState(buildStartedDeckLogImportUiState());

    try {
      const importedDeck = await fetchDeckLogImport(deckLogInput, cards);
      applyDeckBuilderSessionState(
        buildImportedDeckSessionState(buildDeckLogImportedDeckState(importedDeck, cards))
      );
      applyDeckBuilderModalUiState(buildDismissedDeckLogImportUiState());
      setSaveFeedback(buildDeckLogImportFeedback(importedDeck, t));
    } catch (error) {
      setSaveFeedback({
        kind: 'warning',
        message: getDeckLogImportMessage(error, t),
      });
    } finally {
      applyDeckBuilderModalUiState(buildFinishedDeckLogImportUiState());
    }
  };

  const handleSaveDeck = (saveAsNew = false) => {
    // An entirely empty builder is treated as "nothing to save" to avoid
    // cluttering My Decks with placeholder entries that carry no deck content.
    if (!hasBuilderState) {
      setSaveFeedback({
        kind: 'warning',
        message: t('deckBuilder.alerts.emptyBuilder'),
      });
      return;
    }

    if ((saveAsNew || selectedSavedDeckId === null) && !canCreateNewSavedDeck) {
      return;
    }

    const snapshot = createDeckSnapshot(resolveDeckName(deckName), deckRuleConfig, deckState);
    const savedDeck = saveDeck({
      id: saveAsNew ? undefined : (selectedSavedDeckId ?? undefined),
      name: snapshot.name,
      ruleConfig: snapshot.ruleConfig,
      deckState: snapshot.deckState,
    });

    applyDeckBuilderSessionState(buildSavedDeckPersistedSessionState(savedDeck, snapshot));
    setSaveFeedback({
      kind: 'success',
      message: saveAsNew
        ? t('deckBuilder.alerts.saveAsNewSuccess', { name: savedDeck.name })
        : t('deckBuilder.alerts.saveSuccess', { name: savedDeck.name }),
    });
    refreshSavedDecks();
  };

  const handleMakeUnsavedCopy = () => {
    // Keep the current builder exactly as-is, but stop tracking it against the
    // loaded My Decks record so subsequent saves create/update a new baseline.
    applyDeckBuilderTrackingState(buildDetachedDeckBuilderTrackingState());
    setSaveFeedback({
      kind: 'success',
      message: t('deckBuilder.alerts.unsavedCopySuccess'),
    });
  };

  const handleLoadSavedDeck = (deckId: string) => {
    const savedDeck = getSavedDeckById(deckId);
    if (!savedDeck) return;

    applyDeckBuilderSessionState(
      buildLoadedSavedDeckSessionState(buildSavedDeckLoadState(savedDeck, cards))
    );
    applyDeckBuilderMyDecksUiState(buildCompletedSavedDeckLoadUiState());
  };

  const handleDeleteSavedDeck = (deckId: string) => {
    const savedDeck = getSavedDeckById(deckId);
    if (!savedDeck) return;
    deleteSavedDeck(deckId);
    if (shouldDetachSavedDeckTracking(selectedSavedDeckId, [deckId])) {
      applyDeckBuilderTrackingState(buildClearedSavedDeckTrackingState());
    }
    refreshSavedDecks();
    applyDeckBuilderMyDecksUiState(buildDismissedPendingSavedDeckDeleteUiState());
  };

  const handleDeleteAllSavedDecks = () => {
    deleteAllSavedDecks();
    // Deleting saved records never wipes the current builder. It only removes
    // My Decks entries and drops tracking if the loaded baseline was deleted.
    if (selectedSavedDeckId !== null) {
      applyDeckBuilderTrackingState(buildClearedSavedDeckTrackingState());
    }
    refreshSavedDecks();
    applyDeckBuilderMyDecksUiState(buildCompletedDeleteAllSavedDecksUiState());
  };

  const handleDeleteSelectedSavedDecks = () => {
    if (selectedSavedDeckIds.length === 0) return;

    deleteSavedDecks(selectedSavedDeckIds);
    // Selected deletion follows the same rule as Delete All: preserve the live
    // builder and only detach it if its saved baseline is among the deletions.
    if (shouldDetachSavedDeckTracking(selectedSavedDeckId, selectedSavedDeckIds)) {
      applyDeckBuilderTrackingState(buildClearedSavedDeckTrackingState());
    }
    refreshSavedDecks();
    applyDeckBuilderMyDecksUiState(buildCompletedDeleteSelectedSavedDecksUiState());
  };

  const toggleSavedDeckSelection = (deckId: string) => {
    setSelectedSavedDeckIds(current => (
      buildToggledSavedDeckSelectionUiState(current, deckId).selectedSavedDeckIds ?? current
    ));
  };

  const handleToggleShownSavedDeckSelection = () => {
    setSelectedSavedDeckIds(current => (
      buildToggledShownSavedDeckSelectionUiState(current, shownSavedDeckIds).selectedSavedDeckIds ?? current
    ));
  };

  const handleCloseMyDecks = () => {
    applyDeckBuilderMyDecksUiState(buildClosedMyDecksUiState());
  };

  const handleToggleSavedDeckSelectionMode = () => {
    if (isSavedDeckSelectMode) {
      clearSavedDeckSelection();
      return;
    }

    applyDeckBuilderMyDecksUiState(buildEnteredSavedDeckSelectionUiState());
  };

  const handleSavedDeckSearchChange = (value: string) => {
    applyDeckBuilderMyDecksUiState(buildUpdatedSavedDeckSearchUiState(value));
  };

  const handleDeckFormatChange = (nextFormat: DeckFormat) => {
    updateDeckRuleConfig(current => buildDeckFormatUpdatedRuleConfig(current, nextFormat));
  };

  const handleDeckIdentityTypeChange = (identityType: 'class' | 'title') => {
    updateDeckRuleConfig(current => buildDeckIdentityTypeUpdatedRuleConfig(current, identityType));
  };

  const handleConstructedClassChange = (nextValue: string) => {
    updateDeckRuleConfig(current => buildConstructedClassUpdatedRuleConfig(current, nextValue));
  };

  const handleConstructedTitleChange = (nextValue: string) => {
    updateDeckRuleConfig(current => buildConstructedTitleUpdatedRuleConfig(current, nextValue));
  };

  const handleCrossoverClassChange = (index: 0 | 1, nextValue: string) => {
    updateDeckRuleConfig(current => buildCrossoverClassUpdatedRuleConfig(current, index, nextValue));
  };

  const pendingDeleteDeck = pendingDeleteDeckId ? getSavedDeckById(pendingDeleteDeckId) : null;
  const pendingLoadDeck = pendingLoadDeckId ? getSavedDeckById(pendingLoadDeckId) : null;

  const handleDuplicateSavedDeck = (deckId: string) => {
    if (!canCreateNewSavedDeck) return;
    if (!duplicateSavedDeck(deckId)) return;
    refreshSavedDecks();
  };

  const handleExportSavedDeck = (deckId: string) => {
    const savedDeck = getSavedDeckById(deckId);
    if (!savedDeck) return;

    const restoredDeck = restoreSavedDeckToSnapshot(savedDeck, cards);
    downloadDeckJson(
      restoredDeck.snapshot.name,
      buildExportableDeckPayload(
        restoredDeck.snapshot.name,
        restoredDeck.snapshot.ruleConfig,
        restoredDeck.snapshot.deckState,
      ),
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {saveFeedback && (
        <DeckBuilderSaveFeedback
          kind={saveFeedback.kind}
          message={saveFeedback.message}
        />
      )}

      <DeckBuilderLibraryPane
        isLoading={cards.length === 0}
        paginatedCards={paginatedCards}
        cardDetailLookup={cardDetailLookup}
        search={search}
        hideSameNameVariants={hideSameNameVariants}
        deckSectionFilter={deckSectionFilter}
        classFilter={classFilter}
        cardTypeFilter={cardTypeFilter}
        costFilter={costFilter}
        expansionFilter={expansionFilter}
        rarityFilter={rarityFilter}
        productNameFilter={productNameFilter}
        subtypeSearch={subtypeSearch}
        selectedSubtypeTags={selectedSubtypeTags}
        filteredSubtypeOptions={filteredSubtypeOptions}
        costFilterValues={COST_FILTER_VALUES}
        deckSectionFilterValues={DECK_SECTION_FILTER_VALUES}
        cardTypeFilterValues={CARD_TYPE_FILTER_VALUES}
        expansions={expansions}
        rarities={rarities}
        productNames={productNames}
        canAddSubtype={canAddSubtypeTag(subtypeTags, selectedSubtypeTags, subtypeSearch)}
        page={page}
        totalPages={totalPages}
        canGoPrev={page > 0}
        canGoNext={page < totalPages - 1}
        getAllowedSections={getAllowedSections}
        canAddToSection={(card, section) => canAddCardToDeckState(card, section, deckState, deckRuleConfig)}
        onSearchChange={(value) => updateLibraryFiltersWithPageReset({ search: value })}
        onHideSameNameVariantsChange={(checked) => updateLibraryFiltersWithPageReset({ hideSameNameVariants: checked })}
        onReset={resetLibraryFilters}
        onDeckSectionFilterChange={(value) => updateLibraryFiltersWithPageReset({ deckSectionFilter: value })}
        onClassFilterChange={(value) => updateLibraryFiltersWithPageReset({ classFilter: value })}
        onCardTypeFilterChange={(value) => updateLibraryFiltersWithPageReset({ cardTypeFilter: value })}
        onCostFilterChange={(value) => updateLibraryFiltersWithPageReset({ costFilter: value })}
        onExpansionFilterChange={(value) => updateLibraryFiltersWithPageReset({ expansionFilter: value })}
        onRarityFilterChange={(value) => updateLibraryFiltersWithPageReset({ rarityFilter: value })}
        onProductNameFilterChange={(value) => updateLibraryFiltersWithPageReset({ productNameFilter: value })}
        onSubtypeSearchChange={(value) => updateLibraryFilters({ subtypeSearch: value })}
        onAddSubtype={() => addSubtypeTag(subtypeSearch)}
        onRemoveSubtype={removeSubtypeTag}
        onPrev={() => updateLibraryFilters({ page: Math.max(0, page - 1) })}
        onNext={() => updateLibraryFilters({ page: Math.min(totalPages - 1, page + 1) })}
        onOpenPreview={handleOpenPreview}
        onAddToSection={addToDeck}
      />

      <DeckBuilderDeckPane
        deckName={deckName}
        canSaveCurrentDeck={canSaveCurrentDeck}
        canExportDeck={canExportDeck}
        selectedSavedDeckId={selectedSavedDeckId}
        saveStateMessage={saveStateMessage}
        draftRestored={draftRestored}
        hasReachedSoftLimit={hasReachedSoftLimit}
        hasReachedHardLimit={hasReachedHardLimit}
        savedDeckCount={savedDeckCount}
        hardSavedDeckLimit={HARD_SAVED_DECK_LIMIT}
        deckRuleConfig={deckRuleConfig}
        titles={titles}
        crossoverClassOptionsA={crossoverClassOptionsA}
        crossoverClassOptionsB={crossoverClassOptionsB}
        isRuleReady={isRuleReady}
        deckIssueMessages={deckIssueMessages}
        deckSortMode={deckSortMode}
        leaderCount={leaderCards.length}
        leaderLimit={leaderLimit}
        groupedLeaderCards={groupedLeaderCards}
        mainDeckCount={mainDeck.length}
        groupedMainDeck={groupedMainDeck}
        evolveDeckCount={evolveDeck.length}
        groupedEvolveDeck={groupedEvolveDeck}
        tokenDeckCount={tokenDeck.length}
        groupedTokenDeck={groupedTokenDeck}
        onDeckNameChange={setDeckName}
        onSave={() => handleSaveDeck(false)}
        onMakeUnsavedCopy={handleMakeUnsavedCopy}
        onOpenMyDecks={() => applyDeckBuilderMyDecksUiState(buildOpenedMyDecksUiState())}
        onImportDeck={handleImportDeck}
        onOpenDeckLogImport={() => applyDeckBuilderModalUiState(buildOpenedDeckLogImportUiState())}
        onExportDeck={exportDeck}
        onDeckFormatChange={handleDeckFormatChange}
        onDeckIdentityTypeChange={handleDeckIdentityTypeChange}
        onConstructedClassChange={handleConstructedClassChange}
        onConstructedTitleChange={handleConstructedTitleChange}
        onCrossoverClassChange={handleCrossoverClassChange}
        onDeckSortModeChange={setDeckSortMode}
        onOpenResetDeckDialog={() => applyDeckBuilderModalUiState(buildOpenedResetDeckDialogUiState())}
        onOpenResetBuilderDialog={() => applyDeckBuilderModalUiState(buildOpenedResetBuilderDialogUiState())}
        canAddMainCard={(card) => canAddCardToDeckState(card, 'main', deckState, deckRuleConfig)}
        canAddEvolveCard={(card) => canAddCardToDeckState(card, 'evolve', deckState, deckRuleConfig)}
        canAddTokenCard={(card) => canAddCardToDeckState(card, 'token', deckState, deckRuleConfig)}
        onRemoveLeader={(cardId) => removeFromDeck('leader', cardId)}
        onRemoveMain={(cardId) => removeFromDeck('main', cardId)}
        onAddMain={(card) => addToDeck(card, 'main')}
        onRemoveEvolve={(cardId) => removeFromDeck('evolve', cardId)}
        onAddEvolve={(card) => addToDeck(card, 'evolve')}
        onRemoveToken={(cardId) => removeFromDeck('token', cardId)}
        onAddToken={(card) => addToDeck(card, 'token')}
        onDeckCardMouseEnter={handleDeckCardMouseEnter}
        onDeckCardMouseMove={handleDeckCardMouseMove}
        onDeckCardMouseLeave={handleDeckCardMouseLeave}
      />

      {isMyDecksOpen && (
        <DeckBuilderMyDecksModal
          canCreateNewSavedDeck={canCreateNewSavedDeck}
          hardSavedDeckLimit={HARD_SAVED_DECK_LIMIT}
          isSavedDeckSelectMode={isSavedDeckSelectMode}
          savedDeckSelectionUiState={savedDeckSelectionUiState}
          savedDeckSearch={savedDeckSearch}
          filteredSavedDecks={filteredSavedDecks}
          selectedSavedDeckIds={selectedSavedDeckIds}
          selectedSavedDeckId={selectedSavedDeckId}
          onClose={handleCloseMyDecks}
          onSaveAsNew={() => handleSaveDeck(true)}
          onToggleSelectionMode={handleToggleSavedDeckSelectionMode}
          onDeleteAll={() => applyDeckBuilderMyDecksUiState(buildOpenedDeleteAllSavedDecksUiState())}
          onSearchChange={handleSavedDeckSearchChange}
          onToggleShownSelection={handleToggleShownSavedDeckSelection}
          onDeleteSelected={() => applyDeckBuilderMyDecksUiState(buildOpenedDeleteSelectedSavedDecksUiState())}
          onToggleSelection={toggleSavedDeckSelection}
          onLoad={(deckId) => {
            if (isDirty) {
              applyDeckBuilderMyDecksUiState(buildOpenedPendingSavedDeckLoadUiState(deckId));
              return;
            }

            handleLoadSavedDeck(deckId);
          }}
          onDuplicate={handleDuplicateSavedDeck}
          onExport={handleExportSavedDeck}
          onDelete={(deckId) => applyDeckBuilderMyDecksUiState(buildOpenedPendingSavedDeckDeleteUiState(deckId))}
        />
      )}

      {pendingLoadDeck && (
        <DeckBuilderSavedDeckConfirmDialog
          kind="load"
          deckName={pendingLoadDeck.name}
          onCancel={() => applyDeckBuilderMyDecksUiState(buildDismissedPendingSavedDeckLoadUiState())}
          onConfirm={() => handleLoadSavedDeck(pendingLoadDeck.id)}
        />
      )}

      {pendingDeleteDeck && (
        <DeckBuilderSavedDeckConfirmDialog
          kind="delete"
          deckName={pendingDeleteDeck.name}
          onCancel={() => applyDeckBuilderMyDecksUiState(buildDismissedPendingSavedDeckDeleteUiState())}
          onConfirm={() => handleDeleteSavedDeck(pendingDeleteDeck.id)}
        />
      )}

      {isDeckLogImportOpen && (
        <DeckBuilderDeckLogImportDialog
          deckLogInput={deckLogInput}
          isImportingDeckLog={isImportingDeckLog}
          onDeckLogInputChange={setDeckLogInput}
          onCancel={() => {
            if (isImportingDeckLog) return;
            applyDeckBuilderModalUiState(buildDismissedDeckLogImportUiState());
          }}
          onImport={handleImportDeckLog}
        />
      )}

      {showDeleteSelectedSavedDecksDialog && (
        <DeckBuilderDeleteSavedDecksDialog
          kind="selected"
          count={selectedSavedDeckIds.length}
          onCancel={() => applyDeckBuilderMyDecksUiState(buildDismissedDeleteSelectedSavedDecksUiState())}
          onConfirm={handleDeleteSelectedSavedDecks}
        />
      )}

      {showDeleteAllSavedDecksDialog && (
        <DeckBuilderDeleteSavedDecksDialog
          kind="all"
          count={savedDecks.length}
          onCancel={() => applyDeckBuilderMyDecksUiState(buildDismissedDeleteAllSavedDecksUiState())}
          onConfirm={handleDeleteAllSavedDecks}
        />
      )}

      {previewCard && (
        <DeckBuilderPreviewModal
          previewCard={previewCard}
          previewDetail={previewDetail}
          onClose={handleClosePreview}
        />
      )}

      {showResetDeckDialog && (
        <DeckBuilderResetDialog
          kind="deck"
          onCancel={() => applyDeckBuilderModalUiState(buildDismissedResetDeckDialogUiState())}
          onConfirm={resetDeckContents}
        />
      )}

      {showResetBuilderDialog && (
        <DeckBuilderResetDialog
          kind="builder"
          onCancel={() => applyDeckBuilderModalUiState(buildDismissedResetBuilderDialogUiState())}
          onConfirm={resetBuilder}
        />
      )}

      {hoveredDeckCard && (
        <DeckBuilderHoverPreview
          hoveredDeckCard={hoveredDeckCard}
          hoveredDetail={hoveredDetail}
          left={hoveredPreviewPosition?.left ?? DECK_HOVER_PREVIEW_VIEWPORT_PADDING}
          top={hoveredPreviewPosition?.top ?? DECK_HOVER_PREVIEW_VIEWPORT_PADDING}
          width={DECK_HOVER_PREVIEW_WIDTH}
          maxHeight={DECK_HOVER_PREVIEW_MAX_HEIGHT}
        />
      )}


      {pendingDraftRestore && (
        <DeckBuilderDraftRestoreDialog
          onStartFresh={handleStartFresh}
          onContinue={handleContinueDraftRestore}
        />
      )}
    </div>
  );
};

export default DeckBuilder;
