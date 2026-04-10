import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
} from '../utils/deckBuilderFilters';
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
} from '../utils/deckBuilderMyDecksState';
import {
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
  restoreSavedDeckToSnapshot,
  saveDeck,
  saveDraft,
  type SavedDeckRecordV1,
} from '../utils/deckStorage';
import {
  buildExportableDeckPayload,
  downloadDeckJson,
} from '../utils/deckFile';
import { addCardToDeckState, removeCardFromDeckState } from '../utils/deckBuilderMutations';
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
} from '../utils/deckBuilderPersistence';
import {
  canAddSubtypeTag,
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
import { useDeckBuilderPreviewUi } from '../hooks/useDeckBuilderPreviewUi';
import { useDeckBuilderModalUi } from '../hooks/useDeckBuilderModalUi';
import { useDeckBuilderSavedDeckUi } from '../hooks/useDeckBuilderSavedDeckUi';
import { useDeckBuilderLibraryFilters } from '../hooks/useDeckBuilderLibraryFilters';
import { useDeckBuilderSessionTracking } from '../hooks/useDeckBuilderSessionTracking';

const PAGE_SIZE = 50;
const COST_FILTER_VALUES = ['All', '0', '1', '2', '3', '4', '5', '6', '7+'] as const;
const DECK_SECTION_FILTER_VALUES: readonly DeckBuilderDeckSectionFilter[] = ['All', 'main', 'evolve', 'leader', 'token'];
const CARD_TYPE_FILTER_VALUES: readonly DeckBuilderCardTypeFilter[] = ['All', 'follower', 'spell', 'amulet'];

const DeckBuilder: React.FC = () => {
  const { t } = useTranslation();
  const [cards, setCards] = useState<DeckBuilderCardData[]>([]);
  const [deckName, setDeckName] = useState('');
  const [deckRuleConfig, setDeckRuleConfig] = useState(createDefaultDeckRuleConfig());
  const [deckState, setDeckState] = useState<DeckState>(createEmptyDeckState());
  const [deckSortMode, setDeckSortMode] = useState<DeckSortMode>('added');
  const [savedDecks, setSavedDecks] = useState<SavedDeckRecordV1[]>(() => listSavedDecks());
  const subtypeTags = getAvailableSubtypeTags(cards);
  const {
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
    cards,
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
    page,
    filteredSubtypeOptions,
    resetLibraryFilters,
    updateLibraryFilters,
    updateLibraryFiltersWithPageReset,
    addSubtypeTag,
    removeSubtypeTag,
  } = useDeckBuilderLibraryFilters({
    subtypeTags,
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
    cards,
  });

  useEffect(() => {
    loadCardCatalog()
      .then(data => setCards(data))
      .catch(err => console.error("Could not load cards", err));
  }, []);

  // Extract unique expansions (prefix before hyphen)
  const expansions = getAvailableExpansions(cards);
  const rarities = getAvailableRarities(cards);
  const productNames = getAvailableProductNames(cards);
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

  const refreshSavedDecks = () => {
    setSavedDecks(listSavedDecks());
  };

  const updateDeckRuleConfig = (
    updater: (current: DeckRuleConfig) => DeckRuleConfig
  ) => {
    setDeckRuleConfig(current => updater(current));
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

  const libraryPaneProps = {
    isLoading: cards.length === 0,
    paginatedCards,
    cardDetailLookup,
    search,
    hideSameNameVariants,
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
    canAddSubtype: canAddSubtypeTag(subtypeTags, selectedSubtypeTags, subtypeSearch),
    page,
    totalPages,
    canGoPrev: page > 0,
    canGoNext: page < totalPages - 1,
    getAllowedSections,
    canAddToSection: (card: DeckBuilderCardData, section: DeckTargetSection) => (
      canAddCardToDeckState(card, section, deckState, deckRuleConfig)
    ),
    onSearchChange: (value: string) => updateLibraryFiltersWithPageReset({ search: value }),
    onHideSameNameVariantsChange: (checked: boolean) => (
      updateLibraryFiltersWithPageReset({ hideSameNameVariants: checked })
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
  };

  const deckPaneProps = {
    deckName,
    canSaveCurrentDeck,
    canExportDeck,
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
    onDeckNameChange: setDeckName,
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
    canAddMainCard: (card: DeckBuilderCardData) => canAddCardToDeckState(card, 'main', deckState, deckRuleConfig),
    canAddEvolveCard: (card: DeckBuilderCardData) => canAddCardToDeckState(card, 'evolve', deckState, deckRuleConfig),
    canAddTokenCard: (card: DeckBuilderCardData) => canAddCardToDeckState(card, 'token', deckState, deckRuleConfig),
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
  };

  const myDecksModalProps = {
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
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {saveFeedback && (
        <DeckBuilderSaveFeedback
          kind={saveFeedback.kind}
          message={saveFeedback.message}
        />
      )}

      <DeckBuilderLibraryPane {...libraryPaneProps} />

      <DeckBuilderDeckPane {...deckPaneProps} />

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
