import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeckBuilderDeckPane from '../components/deckBuilder/DeckBuilderDeckPane';
import DeckBuilderDeckLogImportDialog from '../components/deckBuilder/DeckBuilderDeckLogImportDialog';
import DeckBuilderDeleteSavedDecksDialog from '../components/deckBuilder/DeckBuilderDeleteSavedDecksDialog';
import DeckBuilderDraftRestoreDialog from '../components/deckBuilder/DeckBuilderDraftRestoreDialog';
import DeckBuilderHoverPreview from '../components/deckBuilder/DeckBuilderHoverPreview';
import DeckBuilderLibraryPane from '../components/deckBuilder/DeckBuilderLibraryPane';
import DeckBuilderMyDecksModal from '../components/deckBuilder/DeckBuilderMyDecksModal';
import DeckBuilderPreviewModal from '../components/deckBuilder/DeckBuilderPreviewModal';
import DeckBuilderResetDialog from '../components/deckBuilder/DeckBuilderResetDialog';
import DeckBuilderSaveFeedback from '../components/deckBuilder/DeckBuilderSaveFeedback';
import DeckBuilderSavedDeckConfirmDialog from '../components/deckBuilder/DeckBuilderSavedDeckConfirmDialog';
import {
  getAvailableExpansions,
  getAvailableProductNames,
  getAvailableRarities,
  getAvailableSubtypeTags,
  getAvailableTitles,
  type DeckBuilderCardData,
} from '../models/deckBuilderCard';
import type { ClassFilter } from '../models/class';
import {
  createDefaultDeckRuleConfig,
  type DeckRuleConfig,
  type DeckFormat,
} from '../models/deckRule';
import { createEmptyDeckState, type DeckState } from '../models/deckState';
import {
  appendRelatedTokensToDeckState,
  canAddCardToDeckState,
  DECK_LIMITS,
  getDeckLimit,
  getAllowedSections,
  getDeckValidationMessages,
  isRuleConfigured,
  type DeckTargetSection,
} from '../utils/deckBuilder/deckBuilderRules';
import {
  isCompactDeckBuilderViewport,
  type DeckBuilderMobileTab,
} from '../utils/deckBuilder/deckBuilderResponsiveLayout';
import { buildCardDetailLookup } from '../utils/card/cardDetails';
import {
  buildDeckBuilderCatalogView,
  getCrossoverClassOptions,
} from '../utils/deckBuilder/deckBuilderCatalog';
import {
  type DeckBuilderCardTypeFilter,
  type DeckBuilderDeckSectionFilter,
} from '../utils/deckBuilder/deckBuilderFilters';
import {
  buildCompletedDeleteAllSavedDecksUiState,
  buildCompletedDeleteSelectedSavedDecksUiState,
  buildCompletedSavedDeckLoadUiState,
  buildDismissedDeleteAllSavedDecksUiState,
  buildDismissedDeleteSelectedSavedDecksUiState,
  buildDismissedPendingSavedDeckDeleteUiState,
  buildDismissedPendingSavedDeckLoadUiState,
  buildOpenedDeleteAllSavedDecksUiState,
  buildOpenedDeleteSelectedSavedDecksUiState,
  buildOpenedMyDecksUiState,
  buildOpenedPendingSavedDeckDeleteUiState,
  buildOpenedPendingSavedDeckLoadUiState,
} from '../utils/deckBuilder/deckBuilderMyDecksState';
import {
  buildDismissedDeckLogImportUiState,
  buildDismissedResetBuilderDialogUiState,
  buildDismissedResetDeckDialogUiState,
  buildFinishedDeckLogImportUiState,
  buildOpenedDeckLogImportUiState,
  buildOpenedResetBuilderDialogUiState,
  buildOpenedResetDeckDialogUiState,
  buildStartedDeckLogImportUiState,
} from '../utils/deckBuilder/deckBuilderModalState';
import {
  buildConstructedClassUpdatedRuleConfig,
  buildConstructedTitleUpdatedRuleConfig,
  buildCrossoverClassUpdatedRuleConfig,
  buildDeckFormatUpdatedRuleConfig,
  buildDeckIdentityTypeUpdatedRuleConfig,
} from '../utils/deckBuilder/deckBuilderRuleConfig';
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
  restoreSavedDeckToSnapshot,
  saveDeck,
  saveDraft,
  type SavedDeckRecordV1,
} from '../utils/deck/deckStorage';
import {
  buildExportableDeckPayload,
  downloadDeckJson,
} from '../utils/deck/deckFile';
import { addCardToDeckState, removeCardFromDeckState } from '../utils/deckBuilder/deckBuilderMutations';
import {
  buildClearedSavedDeckTrackingState,
  buildDeckBuilderSaveState,
  buildDeckLogImportFeedback,
  buildDeckLogImportedDeckState,
  buildDetachedDeckBuilderTrackingState,
  buildDraftPersistencePayload,
  buildImportedDeckSessionState,
  buildJsonImportedDeckState,
  buildLoadedSavedDeckSessionState,
  buildSavedDeckPersistedSessionState,
  buildSavedDeckLoadState,
  getDraftPersistenceAction,
  getDeckLogImportMessage,
  shouldDetachSavedDeckTracking,
  type DeckBuilderSessionState,
} from '../utils/deckBuilder/deckBuilderPersistence';
import {
  canAddSubtypeTag,
} from '../utils/deckBuilder/deckBuilderSelections';
import {
  DECK_HOVER_PREVIEW_MAX_HEIGHT,
  DECK_HOVER_PREVIEW_VIEWPORT_PADDING,
  DECK_HOVER_PREVIEW_WIDTH,
  getDeckHoverPreviewPosition,
  groupDeckCardsForDisplay,
  resolveDeckName,
  sortDeckCardsForDisplay,
  type DeckSortMode,
} from '../utils/deckBuilder/deckBuilderDisplay';
import { useDeckBuilderGeneratedCatalog } from '../hooks/deckBuilder/useDeckBuilderGeneratedCatalog';
import { useDeckBuilderGeneratedCardDetails } from '../hooks/deckBuilder/useDeckBuilderGeneratedCardDetails';
import { useDeckBuilderCatalogAction } from '../hooks/deckBuilder/useDeckBuilderCatalogAction';
import { createGeneratedDeckBuilderCatalog, getImportedCatalogIds, getSavedCatalogIds } from '../utils/deckBuilder/generatedDeckBuilderCatalog';
import { reloadDeckBuilderPreservingDraft } from '../utils/deckBuilder/reloadDeckBuilder';
import { fetchDeckLogImport } from '../utils/deck/decklogImport';
import { useDeckBuilderPreviewUi } from '../hooks/deckBuilder/useDeckBuilderPreviewUi';
import { useDeckBuilderModalUi } from '../hooks/deckBuilder/useDeckBuilderModalUi';
import { useDeckBuilderSavedDeckUi } from '../hooks/deckBuilder/useDeckBuilderSavedDeckUi';
import { useDeckBuilderLibraryFilters } from '../hooks/deckBuilder/useDeckBuilderLibraryFilters';
import { useDeckBuilderSessionTracking } from '../hooks/deckBuilder/useDeckBuilderSessionTracking';

const EMPTY_CARDS: DeckBuilderCardData[] = [];
const PAGE_SIZE = 50;
const COST_FILTER_VALUES = ['All', '0', '1', '2', '3', '4', '5', '6', '7+'] as const;
const DECK_SECTION_FILTER_VALUES: readonly DeckBuilderDeckSectionFilter[] = ['All', 'main', 'evolve', 'leader', 'token'];
const CARD_TYPE_FILTER_VALUES: readonly DeckBuilderCardTypeFilter[] = ['All', 'follower', 'spell', 'amulet'];
type CardCatalogStatus = 'loading' | 'ready' | 'error';

const DeckBuilder: React.FC = () => {
  const { t } = useTranslation();
  const resource = useDeckBuilderGeneratedCatalog();
  const source = resource.status === 'ready' ? resource.catalog : null;
  const catalog = React.useMemo(() => source ? createGeneratedDeckBuilderCatalog(source) : null, [source]);
  const catalogSummaries = catalog?.summaries ?? EMPTY_CARDS;
  const actions = useDeckBuilderCatalogAction();
  const cardCatalogStatus: CardCatalogStatus = resource.status === 'ready' && catalogSummaries.length === 0 ? 'error' : resource.status;
  const [reloadFailed, setReloadFailed] = useState(false);
  const draftSaveTimer = React.useRef<number | null>(null);
  const resolveDraftCards = React.useCallback((draft: Parameters<typeof getSavedCatalogIds>[number], saved: Parameters<typeof getSavedCatalogIds>[number]) => {
    if (!catalog) return Promise.reject(new Error('Catalog is not ready'));
    return catalog.loadAvailable(getSavedCatalogIds(draft, saved));
  }, [catalog]);
  const [deckName, setDeckName] = useState('');
  const [deckRuleConfig, setDeckRuleConfig] = useState(createDefaultDeckRuleConfig());
  const [deckState, setDeckState] = useState<DeckState>(createEmptyDeckState());
  const [deckSortMode, setDeckSortMode] = useState<DeckSortMode>('added');
  const [savedDecks, setSavedDecks] = useState<SavedDeckRecordV1[]>(() => listSavedDecks());
  const [isCompact, setIsCompact] = useState(() => (
    typeof window !== 'undefined' ? isCompactDeckBuilderViewport(window.innerWidth) : false
  ));
  const [mobileTab, setMobileTab] = useState<DeckBuilderMobileTab>('library');
  useEffect(() => {
    const handleResize = () => {
      setIsCompact(isCompactDeckBuilderViewport(window.innerWidth));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const subtypeTags = getAvailableSubtypeTags(catalogSummaries);
  const releasedCards = React.useMemo(
    () => catalogSummaries.filter(card => card.catalog_status !== 'preview'),
    [catalogSummaries]
  );
  const releasedSubtypeTags = React.useMemo(
    () => getAvailableSubtypeTags(releasedCards),
    [releasedCards]
  );
  const {
    draftRestoreFailure,
    selectedSavedDeckId,
    savedBaselineSnapshot,
    draftRestored,
    hasInitializedDraft,
    pendingDraftRestore,
    applyDeckBuilderTrackingState,
    applyDeckBuilderSessionState,
    resetBuilderState,
    handleStartFresh,
    handleContinueDraftRestore,
  } = useDeckBuilderSessionTracking({
    cards: catalogSummaries,
    resolveDraftCards,
    setDeckName,
    setDeckRuleConfig,
    setDeckState,
  });
  const {
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
    showPreviewCards,
    page,
    filteredSubtypeOptions,
    resetLibraryFilters,
    resetLibraryPage,
    updateLibraryFilters,
    updateLibraryFiltersWithPageReset,
    addSubtypeTag,
    removeSubtypeTag,
  } = useDeckBuilderLibraryFilters({
    subtypeTags,
    releasedSubtypeTags,
  });
  const {
    previewCard,
    hoveredDeckCard,
    hoverPos,
    handleOpenPreview,
    handleClosePreview,
    handleDeckCardMouseEnter,
    handleDeckCardMouseMove,
    handleDeckCardMouseLeave,
  } = useDeckBuilderPreviewUi();
  const {
    showResetDeckDialog,
    showResetBuilderDialog,
    saveFeedback,
    setSaveFeedback,
    isDeckLogImportOpen,
    deckLogInput,
    setDeckLogInput,
    isImportingDeckLog,
    applyDeckBuilderModalUiState,
  } = useDeckBuilderModalUi();
  const {
    isMyDecksOpen,
    savedDeckSearch,
    pendingDeleteDeckId,
    showDeleteAllSavedDecksDialog,
    showDeleteSelectedSavedDecksDialog,
    pendingLoadDeckId,
    isSavedDeckSelectMode,
    selectedSavedDeckIds,
    filteredSavedDecks,
    savedDeckSelectionUiState,
    applyDeckBuilderMyDecksUiState,
    toggleSavedDeckSelection,
    handleToggleShownSavedDeckSelection,
    handleCloseMyDecks,
    handleToggleSavedDeckSelectionMode,
    handleSavedDeckSearchChange,
  } = useDeckBuilderSavedDeckUi({
    savedDecks,
    cards: catalogSummaries,
  });

  // Extract unique expansions (prefix before hyphen)
  const filterOptionCards = showPreviewCards ? catalogSummaries : releasedCards;
  const activeSubtypeTags = showPreviewCards ? subtypeTags : releasedSubtypeTags;
  const expansions = getAvailableExpansions(filterOptionCards);
  const rarities = getAvailableRarities(filterOptionCards);
  const productNames = getAvailableProductNames(filterOptionCards);
  const titles = getAvailableTitles(filterOptionCards);
  const isCardCatalogReady = cardCatalogStatus === 'ready' && hasInitializedDraft && pendingDraftRestore === null && !actions.pending;
  const isRuleReady = isRuleConfigured(deckRuleConfig);
  const leaderLimit = getDeckLimit('leader', deckRuleConfig);
  const {
    paginatedCards: pageSummaries,
    totalPages,
  } = buildDeckBuilderCatalogView(catalogSummaries, deckRuleConfig, {
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
    showPreviewCards,
    page,
    pageSize: PAGE_SIZE,
  });
  const pageDetails = useDeckBuilderGeneratedCardDetails(catalog?.catalog ?? null, pageSummaries.map(card => card.id), true);
  const knownCards = catalog?.knownCards() ?? EMPTY_CARDS;
  const fullById = React.useMemo(() => new Map(knownCards.map(card => [card.id, card])), [knownCards]);
  const pageAvailable = catalog?.hasAvailable(pageSummaries.map(card => card.id)) ?? false;
  const paginatedCards = pageAvailable
    ? pageSummaries.map(card => fullById.get(card.id)!) : EMPTY_CARDS;
  const cardDetailLookup = React.useMemo(() => buildCardDetailLookup([
    ...knownCards, ...deckState.mainDeck, ...deckState.evolveDeck, ...deckState.leaderCards, ...deckState.tokenDeck,
  ]), [knownCards, deckState]);
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
  useEffect(() => {
    const draftPersistenceAction = getDraftPersistenceAction(
      catalogSummaries.length,
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
      draftSaveTimer.current = null;
      saveDraft(buildDraftPersistencePayload(selectedSavedDeckId, deckName, deckRuleConfig, deckState));
    }, 400);

    draftSaveTimer.current = timeoutId;
    return () => {
      window.clearTimeout(timeoutId);
      if (draftSaveTimer.current === timeoutId) draftSaveTimer.current = null;
    };
  }, [catalogSummaries.length, deckName, deckRuleConfig, deckState, hasBuilderState, hasInitializedDraft, pendingDraftRestore, selectedSavedDeckId]);

  const refreshSavedDecks = () => {
    setSavedDecks(listSavedDecks());
  };

  const cancelCatalogAction = () => {
    actions.cancel();
    applyDeckBuilderModalUiState(buildFinishedDeckLogImportUiState());
  };

  const updateDeckRuleConfig = (
    updater: (current: DeckRuleConfig) => DeckRuleConfig
  ) => {
    cancelCatalogAction();
    setDeckRuleConfig(current => updater(current));
    resetLibraryPage();
  };

  // Only committed deck replacements reset pagination. Saving/tracking, failed
  // loads and canceled async actions keep the current library position.
  const applyReplacementDeckSession = (state: DeckBuilderSessionState) => {
    applyDeckBuilderSessionState(state);
    resetLibraryPage();
  };

  const previewDetail = previewCard ? cardDetailLookup[previewCard.id] ?? null : null;
  const hoveredDetail = hoveredDeckCard ? cardDetailLookup[hoveredDeckCard.id] ?? null : null;
  const hoveredPreviewPosition = hoveredDeckCard
    ? getDeckHoverPreviewPosition(hoverPos, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    : null;

  const addToDeck = (card: DeckBuilderCardData, targetSection: DeckTargetSection) => {
    if (!hasInitializedDraft || actions.isPending()) return;
    actions.cancel();

    setDeckState(current => {
      if (!canAddCardToDeckState(card, targetSection, current, deckRuleConfig)) return current;
      const nextDeckState = addCardToDeckState(current, card, targetSection, {
        deckRuleConfig,
        leaderLimit,
      });

      return appendRelatedTokensToDeckState(nextDeckState, catalog?.knownCards() ?? EMPTY_CARDS, deckRuleConfig);
    });
  };

  const removeFromDeck = (targetSection: DeckTargetSection, cardId?: string) => {
    cancelCatalogAction();
    setDeckState(current => removeCardFromDeckState(current, targetSection, cardId));
  };

  const resetDeckContents = () => {
    if (!hasInitializedDraft) return;
    cancelCatalogAction();
    setDeckState(createEmptyDeckState());
    applyDeckBuilderModalUiState(buildDismissedResetDeckDialogUiState());
  };

  const resetBuilder = () => {
    cancelCatalogAction();
    clearDraft();
    resetBuilderState();
    applyDeckBuilderModalUiState(buildDismissedResetBuilderDialogUiState());
  };

  const exportDeck = () => {
    if (actions.isPending()) return;
    downloadDeckJson(
      resolveDeckName(deckName),
      buildExportableDeckPayload(resolveDeckName(deckName), deckRuleConfig, deckState)
    );
  };

  const handleImportDeck = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCardCatalogReady) {
      event.target.value = '';
      setSaveFeedback({
        kind: 'warning',
        message: t('deckBuilder.alerts.cardCatalogLoading'),
      });
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (!catalog || actions.isPending()) return;
    actions.run(async () => {
      const data = await new Promise<unknown>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => { try { resolve(JSON.parse(e.target?.result as string)); } catch (error) { reject(error); } };
        reader.onerror = () => reject(new Error('Could not read deck file'));
        reader.readAsText(file);
      });
      const full = await catalog.loadAvailable(getImportedCatalogIds(data));
      return buildJsonImportedDeckState(data as Record<string, unknown>, file.name, full);
    }, imported => applyReplacementDeckSession(buildImportedDeckSessionState(imported)),
    () => alert(t('deckBuilder.alerts.importFailed')));
    // Reset input so the same file can be uploaded again if needed
    event.target.value = '';
  };

  const handleImportDeckLog = async () => {
    if (!isCardCatalogReady) {
      setSaveFeedback({
        kind: 'warning',
        message: t('deckBuilder.alerts.deckLogCardsLoading'),
      });
      return;
    }

    if (!catalog || actions.isPending()) return;
    applyDeckBuilderModalUiState(buildStartedDeckLogImportUiState());
    actions.run(async () => {
      const imported = await fetchDeckLogImport(deckLogInput, catalogSummaries);
      const full = await catalog.loadAvailable(getImportedCatalogIds(imported.deckState));
      return { imported, state: buildDeckLogImportedDeckState(imported, full) };
    }, ({ imported, state }) => {
      applyReplacementDeckSession(buildImportedDeckSessionState(state));
      applyDeckBuilderModalUiState(buildDismissedDeckLogImportUiState());
      applyDeckBuilderModalUiState(buildFinishedDeckLogImportUiState());
      setSaveFeedback(buildDeckLogImportFeedback(imported, t));
    }, error => {
      applyDeckBuilderModalUiState(buildFinishedDeckLogImportUiState());
      setSaveFeedback({ kind: 'warning', message: getDeckLogImportMessage(error, t) });
    });
  };

  const handleSaveDeck = (saveAsNew = false) => {
    if (actions.isPending() || !hasInitializedDraft) return;
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
    cancelCatalogAction();
    // Keep the current builder exactly as-is, but stop tracking it against the
    // loaded My Decks record so subsequent saves create/update a new baseline.
    applyDeckBuilderTrackingState(buildDetachedDeckBuilderTrackingState());
    setSaveFeedback({
      kind: 'success',
      message: t('deckBuilder.alerts.unsavedCopySuccess'),
    });
  };

  const handleLoadSavedDeck = (deckId: string) => {
    if (!isCardCatalogReady) return;
    const savedDeck = getSavedDeckById(deckId);
    if (!savedDeck) return;

    if (!catalog || actions.isPending()) return;
    actions.run(async () => {
      const full = await catalog.loadAvailable(getSavedCatalogIds(savedDeck));
      return buildSavedDeckLoadState(savedDeck, full);
    }, restored => {
      // A record deleted while loading must not become the active saved deck.
      if (JSON.stringify(getSavedDeckById(deckId)) !== JSON.stringify(savedDeck)) {
        throw new Error('Saved deck changed while loading; retry');
      }
      applyReplacementDeckSession(buildLoadedSavedDeckSessionState(restored));
      applyDeckBuilderMyDecksUiState(buildCompletedSavedDeckLoadUiState());
    });
  };

  const handleDeleteSavedDeck = (deckId: string) => {
    cancelCatalogAction();
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
    cancelCatalogAction();
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
    cancelCatalogAction();
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
    if (!isCardCatalogReady) return;
    const savedDeck = getSavedDeckById(deckId);
    if (!savedDeck) return;

    if (!catalog || actions.isPending()) return;
    actions.run(async () => {
      const full = await catalog.loadAvailable(getSavedCatalogIds(savedDeck));
      return restoreSavedDeckToSnapshot(savedDeck, full);
    }, restored => downloadDeckJson(restored.snapshot.name,
      buildExportableDeckPayload(restored.snapshot.name, restored.snapshot.ruleConfig, restored.snapshot.deckState)));
  };

  const catalogFailed = cardCatalogStatus === 'error' || pageDetails.status === 'error' ||
    draftRestoreFailure !== null || actions.failure !== null;
  const reloadCatalog = () => {
    cancelCatalogAction();
    // The explicit flush must be the last write before navigation.
    if (draftSaveTimer.current !== null) window.clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = null;
    try {
      reloadDeckBuilderPreservingDraft({ initialized: hasInitializedDraft,
        pendingRestore: pendingDraftRestore !== null, hasBuilderState,
        payload: buildDraftPersistencePayload(selectedSavedDeckId, deckName, deckRuleConfig, deckState),
      }, () => window.location.reload());
    } catch { setReloadFailed(true); }
  };

  const libraryPaneProps = {
    isLoading: cardCatalogStatus === 'loading' || (!pageAvailable && pageDetails.status === 'loading') || (!hasInitializedDraft && !draftRestoreFailure),
    paginatedCards,
    cardDetailLookup,
    search,
    hideSameNameVariants,
    showPreviewCards,
    deckSectionFilter,
    classFilter,
    cardTypeFilter,
    costFilter,
    expansionFilter,
    rarityFilter,
    productNameFilter,
    subtypeSearch,
    selectedSubtypeTags,
    filteredSubtypeOptions,
    costFilterValues: COST_FILTER_VALUES,
    deckSectionFilterValues: DECK_SECTION_FILTER_VALUES,
    cardTypeFilterValues: CARD_TYPE_FILTER_VALUES,
    expansions,
    rarities,
    productNames,
    canAddSubtype: canAddSubtypeTag(activeSubtypeTags, selectedSubtypeTags, subtypeSearch),
    page,
    totalPages,
    canGoPrev: page > 0,
    canGoNext: page < totalPages - 1,
    getAllowedSections,
    deckRuleConfig,
    deckState,
    canAddToSection: (card: DeckBuilderCardData, section: DeckTargetSection) => (
      !actions.pending && hasInitializedDraft && canAddCardToDeckState(card, section, deckState, deckRuleConfig)
    ),
    onSearchChange: (value: string) => updateLibraryFiltersWithPageReset({ search: value }),
    onHideSameNameVariantsChange: (checked: boolean) => (
      updateLibraryFiltersWithPageReset({ hideSameNameVariants: checked })
    ),
    onShowPreviewCardsChange: (checked: boolean) => (
      updateLibraryFiltersWithPageReset({ showPreviewCards: checked })
    ),
    onReset: resetLibraryFilters,
    onDeckSectionFilterChange: (value: DeckBuilderDeckSectionFilter) => (
      updateLibraryFiltersWithPageReset({ deckSectionFilter: value })
    ),
    onClassFilterChange: (value: ClassFilter) => updateLibraryFiltersWithPageReset({ classFilter: value }),
    onCardTypeFilterChange: (value: DeckBuilderCardTypeFilter) => (
      updateLibraryFiltersWithPageReset({ cardTypeFilter: value })
    ),
    onCostFilterChange: (value: string) => updateLibraryFiltersWithPageReset({ costFilter: value }),
    onExpansionFilterChange: (value: string) => updateLibraryFiltersWithPageReset({ expansionFilter: value }),
    onRarityFilterChange: (value: string) => updateLibraryFiltersWithPageReset({ rarityFilter: value }),
    onProductNameFilterChange: (value: string) => (
      updateLibraryFiltersWithPageReset({ productNameFilter: value })
    ),
    onSubtypeSearchChange: (value: string) => updateLibraryFilters({ subtypeSearch: value }),
    onAddSubtype: () => addSubtypeTag(subtypeSearch),
    onRemoveSubtype: removeSubtypeTag,
    onPrev: () => updateLibraryFilters({ page: Math.max(0, page - 1) }),
    onNext: () => updateLibraryFilters({ page: Math.min(totalPages - 1, page + 1) }),
    onOpenPreview: handleOpenPreview,
    onAddToSection: addToDeck,
    onRemoveFromSection: isCompact ? removeFromDeck : undefined,
    isCompact,
  };

  const deckPaneProps = {
    isCardCatalogReady,
    deckName,
    canSaveCurrentDeck: canSaveCurrentDeck && hasInitializedDraft && !actions.pending,
    canExportDeck: canExportDeck && !actions.pending,
    selectedSavedDeckId,
    saveStateMessage,
    draftRestored,
    hasReachedSoftLimit,
    hasReachedHardLimit,
    savedDeckCount,
    hardSavedDeckLimit: HARD_SAVED_DECK_LIMIT,
    deckRuleConfig,
    titles,
    crossoverClassOptionsA,
    crossoverClassOptionsB,
    isRuleReady,
    deckIssueMessages,
    deckSortMode,
    leaderCount: leaderCards.length,
    leaderLimit,
    groupedLeaderCards,
    mainDeckCount: mainDeck.length,
    groupedMainDeck,
    evolveDeckCount: evolveDeck.length,
    groupedEvolveDeck,
    tokenDeckCount: tokenDeck.length,
    groupedTokenDeck,
    onDeckNameChange: (value: string) => { cancelCatalogAction(); setDeckName(value); },
    onSave: () => handleSaveDeck(false),
    onMakeUnsavedCopy: handleMakeUnsavedCopy,
    onOpenMyDecks: () => applyDeckBuilderMyDecksUiState(buildOpenedMyDecksUiState()),
    onImportDeck: handleImportDeck,
    onOpenDeckLogImport: () => applyDeckBuilderModalUiState(buildOpenedDeckLogImportUiState()),
    onExportDeck: exportDeck,
    onDeckFormatChange: handleDeckFormatChange,
    onDeckIdentityTypeChange: handleDeckIdentityTypeChange,
    onConstructedClassChange: handleConstructedClassChange,
    onConstructedTitleChange: handleConstructedTitleChange,
    onCrossoverClassChange: handleCrossoverClassChange,
    onDeckSortModeChange: setDeckSortMode,
    onOpenResetDeckDialog: () => applyDeckBuilderModalUiState(buildOpenedResetDeckDialogUiState()),
    onOpenResetBuilderDialog: () => applyDeckBuilderModalUiState(buildOpenedResetBuilderDialogUiState()),
    canAddMainCard: (card: DeckBuilderCardData) => !actions.pending && hasInitializedDraft && canAddCardToDeckState(card, 'main', deckState, deckRuleConfig),
    canAddEvolveCard: (card: DeckBuilderCardData) => !actions.pending && hasInitializedDraft && canAddCardToDeckState(card, 'evolve', deckState, deckRuleConfig),
    canAddTokenCard: (card: DeckBuilderCardData) => !actions.pending && hasInitializedDraft && canAddCardToDeckState(card, 'token', deckState, deckRuleConfig),
    onRemoveLeader: (cardId: string) => removeFromDeck('leader', cardId),
    onRemoveMain: (cardId: string) => removeFromDeck('main', cardId),
    onAddMain: (card: DeckBuilderCardData) => addToDeck(card, 'main'),
    onRemoveEvolve: (cardId: string) => removeFromDeck('evolve', cardId),
    onAddEvolve: (card: DeckBuilderCardData) => addToDeck(card, 'evolve'),
    onRemoveToken: (cardId: string) => removeFromDeck('token', cardId),
    onAddToken: (card: DeckBuilderCardData) => addToDeck(card, 'token'),
    onDeckCardMouseEnter: handleDeckCardMouseEnter,
    onDeckCardMouseMove: handleDeckCardMouseMove,
    onDeckCardMouseLeave: handleDeckCardMouseLeave,
    onOpenPreview: handleOpenPreview,
    isCompact,
  };

  const myDecksModalProps = {
    isCardCatalogReady,
    canCreateNewSavedDeck,
    hardSavedDeckLimit: HARD_SAVED_DECK_LIMIT,
    isSavedDeckSelectMode,
    savedDeckSelectionUiState,
    savedDeckSearch,
    filteredSavedDecks,
    selectedSavedDeckIds,
    selectedSavedDeckId,
    onClose: handleCloseMyDecks,
    onSaveAsNew: () => handleSaveDeck(true),
    onToggleSelectionMode: handleToggleSavedDeckSelectionMode,
    onDeleteAll: () => applyDeckBuilderMyDecksUiState(buildOpenedDeleteAllSavedDecksUiState()),
    onSearchChange: handleSavedDeckSearchChange,
    onToggleShownSelection: handleToggleShownSavedDeckSelection,
    onDeleteSelected: () => applyDeckBuilderMyDecksUiState(buildOpenedDeleteSelectedSavedDecksUiState()),
    onToggleSelection: toggleSavedDeckSelection,
    onLoad: (deckId: string) => {
      if (!isCardCatalogReady) return;
      if (isDirty) {
        applyDeckBuilderMyDecksUiState(buildOpenedPendingSavedDeckLoadUiState(deckId));
        return;
      }

      handleLoadSavedDeck(deckId);
    },
    onDuplicate: handleDuplicateSavedDeck,
    onExport: handleExportSavedDeck,
    onDelete: (deckId: string) => applyDeckBuilderMyDecksUiState(buildOpenedPendingSavedDeckDeleteUiState(deckId)),
  };

  const pendingLoadDialogProps = pendingLoadDeck ? {
    kind: 'load' as const,
    deckName: pendingLoadDeck.name,
    onCancel: () => applyDeckBuilderMyDecksUiState(buildDismissedPendingSavedDeckLoadUiState()),
    onConfirm: () => handleLoadSavedDeck(pendingLoadDeck.id),
  } : null;

  const pendingDeleteDialogProps = pendingDeleteDeck ? {
    kind: 'delete' as const,
    deckName: pendingDeleteDeck.name,
    onCancel: () => applyDeckBuilderMyDecksUiState(buildDismissedPendingSavedDeckDeleteUiState()),
    onConfirm: () => handleDeleteSavedDeck(pendingDeleteDeck.id),
  } : null;

  const deckLogImportDialogProps = {
    deckLogInput,
    isImportingDeckLog,
    onDeckLogInputChange: setDeckLogInput,
    onCancel: () => {
      if (isImportingDeckLog) return;
      applyDeckBuilderModalUiState(buildDismissedDeckLogImportUiState());
    },
    onImport: handleImportDeckLog,
  };

  const deleteSelectedDialogProps = {
    kind: 'selected' as const,
    count: selectedSavedDeckIds.length,
    onCancel: () => applyDeckBuilderMyDecksUiState(buildDismissedDeleteSelectedSavedDecksUiState()),
    onConfirm: handleDeleteSelectedSavedDecks,
  };

  const deleteAllDialogProps = {
    kind: 'all' as const,
    count: savedDecks.length,
    onCancel: () => applyDeckBuilderMyDecksUiState(buildDismissedDeleteAllSavedDecksUiState()),
    onConfirm: handleDeleteAllSavedDecks,
  };

  const previewModalProps = previewCard ? {
    previewCard,
    previewDetail,
    onClose: handleClosePreview,
  } : null;

  const resetDeckDialogProps = {
    kind: 'deck' as const,
    onCancel: () => applyDeckBuilderModalUiState(buildDismissedResetDeckDialogUiState()),
    onConfirm: resetDeckContents,
  };

  const resetBuilderDialogProps = {
    kind: 'builder' as const,
    onCancel: () => applyDeckBuilderModalUiState(buildDismissedResetBuilderDialogUiState()),
    onConfirm: resetBuilder,
  };

  const hoverPreviewProps = hoveredDeckCard ? {
    hoveredDeckCard,
    hoveredDetail,
    left: hoveredPreviewPosition?.left ?? DECK_HOVER_PREVIEW_VIEWPORT_PADDING,
    top: hoveredPreviewPosition?.top ?? DECK_HOVER_PREVIEW_VIEWPORT_PADDING,
    width: DECK_HOVER_PREVIEW_WIDTH,
    maxHeight: DECK_HOVER_PREVIEW_MAX_HEIGHT,
  } : null;

  return (
    <div style={{ display: 'flex', flexDirection: isCompact ? 'column' : 'row', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {(catalogFailed || reloadFailed || actions.pending) && (
        <div role={catalogFailed || reloadFailed ? 'alert' : 'status'} style={{ position: 'absolute', top: 8, left: '20%', right: '20%', zIndex: 500, padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 8 }}>
          <p>{t(reloadFailed ? 'deckBuilder.catalog.storageFailed' : catalogFailed ? 'deckBuilder.catalog.failed' : 'deckBuilder.catalog.processing')}</p>
          {(catalogFailed || reloadFailed) && <button type="button" onClick={reloadCatalog}>{t('deckBuilder.catalog.reload')}</button>}
          {pageDetails.status === 'error' && !reloadFailed && <button type="button" onClick={pageDetails.retry}>{t('deckBuilder.catalog.retry')}</button>}
          {resource.status === 'error' && !reloadFailed && <button type="button" onClick={resource.retry}>{t('deckBuilder.catalog.retry')}</button>}
        </div>
      )}
      {saveFeedback && (
        <DeckBuilderSaveFeedback
          kind={saveFeedback.kind}
          message={saveFeedback.message}
        />
      )}

      {isCompact ? (
        <>
          <div
            role="tablist"
            aria-label={t('deckBuilder.mobileTabs.aria')}
            style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-light)',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'library'}
              onClick={() => setMobileTab('library')}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: mobileTab === 'library' ? '1px solid var(--brand-primary)' : '1px solid var(--border-light)',
                background: mobileTab === 'library' ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
                color: mobileTab === 'library' ? '#fff' : 'var(--text-main)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t('deckBuilder.mobileTabs.library')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'deck'}
              onClick={() => setMobileTab('deck')}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: mobileTab === 'deck' ? '1px solid var(--brand-primary)' : '1px solid var(--border-light)',
                background: mobileTab === 'deck' ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
                color: mobileTab === 'deck' ? '#fff' : 'var(--text-main)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t('deckBuilder.mobileTabs.deck', {
                mainCount: mainDeck.length,
                mainLimit: DECK_LIMITS.main,
              })}
            </button>
          </div>
          <div style={{ display: mobileTab === 'library' ? 'flex' : 'none', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <DeckBuilderLibraryPane {...libraryPaneProps} />
          </div>
          <div style={{ display: mobileTab === 'deck' ? 'flex' : 'none', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <DeckBuilderDeckPane {...deckPaneProps} />
          </div>
        </>
      ) : (
        <>
          <DeckBuilderLibraryPane {...libraryPaneProps} />

          <DeckBuilderDeckPane {...deckPaneProps} />
        </>
      )}

      {isMyDecksOpen && (
        <DeckBuilderMyDecksModal {...myDecksModalProps} />
      )}

      {pendingLoadDialogProps && <DeckBuilderSavedDeckConfirmDialog {...pendingLoadDialogProps} />}

      {pendingDeleteDialogProps && <DeckBuilderSavedDeckConfirmDialog {...pendingDeleteDialogProps} />}

      {isDeckLogImportOpen && (
        <DeckBuilderDeckLogImportDialog {...deckLogImportDialogProps} />
      )}

      {showDeleteSelectedSavedDecksDialog && (
        <DeckBuilderDeleteSavedDecksDialog {...deleteSelectedDialogProps} />
      )}

      {showDeleteAllSavedDecksDialog && (
        <DeckBuilderDeleteSavedDecksDialog {...deleteAllDialogProps} />
      )}

      {previewModalProps && <DeckBuilderPreviewModal {...previewModalProps} />}

      {showResetDeckDialog && (
        <DeckBuilderResetDialog {...resetDeckDialogProps} />
      )}

      {showResetBuilderDialog && (
        <DeckBuilderResetDialog {...resetBuilderDialogProps} />
      )}

      {hoverPreviewProps && <DeckBuilderHoverPreview {...hoverPreviewProps} />}


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
