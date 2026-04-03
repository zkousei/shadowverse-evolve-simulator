import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Minus, Download, Upload } from 'lucide-react';
import { CLASS, CLASS_FILTER_VALUES, CLASS_VALUES, CONSTRUCTED_CLASS_VALUES } from '../models/class';
import type { ClassFilter } from '../models/class';
import { getBaseCardType } from '../models/cardClassification';
import {
  dedupeCardsByDisplayIdentity,
  getAvailableExpansions,
  getAvailableProductNames,
  getAvailableRarities,
  getAvailableSubtypeTags,
  getSubtypeTags,
  getAvailableTitles,
  type DeckBuilderCardData,
} from '../models/deckBuilderCard';
import {
  createDefaultDeckRuleConfig,
  DECK_FORMAT_VALUES,
  getImportedDeckRuleConfig,
} from '../models/deckRule';
import { createEmptyDeckState, type DeckState } from '../models/deckState';
import {
  appendRelatedTokensToDeckState,
  canAddCardToDeckState,
  DECK_LIMITS,
  getDeckLimit,
  getAllowedSections,
  getDeckValidationMessages,
  type DeckValidationMessage,
  isCardAllowedByRule,
  isRuleConfigured,
  sanitizeImportedDeckState,
  type DeckTargetSection,
} from '../utils/deckBuilderRules';
import { buildCardDetailLookup, buildCardDetailPresentation, formatAbilityText } from '../utils/cardDetails';
import {
  areDeckSnapshotsEqual,
  clearDraft,
  createDeckSnapshot,
  createPristineDeckSnapshot,
  DEFAULT_DECK_NAME,
  deleteAllSavedDecks,
  deleteSavedDeck,
  deleteSavedDecks,
  duplicateSavedDeck,
  getSavedDeckById,
  HARD_SAVED_DECK_LIMIT,
  hasReachedHardSavedDeckLimit,
  hasReachedSoftSavedDeckLimit,
  listSavedDecks,
  loadDraft,
  restoreDraftToSnapshot,
  restoreSavedDeckToSnapshot,
  saveDeck,
  saveDraft,
  type DeckBuilderSnapshot,
  type SavedDeckRecordV1,
} from '../utils/deckStorage';
import {
  buildExportableDeckPayload,
  downloadDeckJson,
  resolveImportedDeckName,
} from '../utils/deckFile';
import { addCardToDeckState, removeCardFromDeckState } from '../utils/deckBuilderMutations';
import {
  DECK_HOVER_PREVIEW_MAX_HEIGHT,
  DECK_HOVER_PREVIEW_VIEWPORT_PADDING,
  DECK_HOVER_PREVIEW_WIDTH,
  DECK_SORT_VALUES,
  formatSavedDeckUpdatedAt,
  getDeckHoverPreviewPosition,
  groupDeckCardsForDisplay,
  parseNullableStat,
  resolveDeckName,
  sortDeckCardsForDisplay,
  type DeckSortMode,
} from '../utils/deckBuilderDisplay';
import { loadCardCatalog } from '../utils/cardCatalog';
import { DeckLogImportError, fetchDeckLogImport } from '../utils/decklogImport';
import { formatSavedDeckCountSummary, formatSavedDeckRuleSummary } from '../utils/savedDeckPresentation';
import CardArtwork from '../components/CardArtwork';

type PendingDraftRestore = {
  snapshot: DeckBuilderSnapshot;
  selectedDeckId: string | null;
  baselineSnapshot: DeckBuilderSnapshot | null;
};

const PAGE_SIZE = 50;
const COST_FILTER_VALUES = ['All', '0', '1', '2', '3', '4', '5', '6', '7+'] as const;
const DECK_SECTION_FILTER_VALUES = ['All', 'main', 'evolve', 'leader', 'token'] as const;
const CARD_TYPE_FILTER_VALUES = ['All', 'follower', 'spell', 'amulet'] as const;

const ADD_ACTIONS: Record<DeckTargetSection, { background: string }> = {
  main: { background: 'var(--accent-primary)' },
  evolve: { background: 'var(--accent-secondary)' },
  leader: { background: '#f59e0b' },
  token: { background: 'var(--vivid-green-cyan)' },
};

type SaveFeedback = {
  kind: 'success' | 'warning';
  message: string;
};

const DeckBuilder: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [cards, setCards] = useState<DeckBuilderCardData[]>([]);
  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState('All');
  const [expansionFilter, setExpansionFilter] = useState('All');
  const [classFilter, setClassFilter] = useState<ClassFilter>('All');
  const [cardTypeFilter, setCardTypeFilter] = useState<(typeof CARD_TYPE_FILTER_VALUES)[number]>('All');
  const [rarityFilter, setRarityFilter] = useState('All');
  const [productNameFilter, setProductNameFilter] = useState('All');
  const [subtypeSearch, setSubtypeSearch] = useState('');
  const [selectedSubtypeTags, setSelectedSubtypeTags] = useState<string[]>([]);
  const [deckSectionFilter, setDeckSectionFilter] = useState<(typeof DECK_SECTION_FILTER_VALUES)[number]>('All');
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
  const [pendingDraftRestore, setPendingDraftRestore] = useState<PendingDraftRestore | null>(null);
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

  useEffect(() => {
    loadCardCatalog()
      .then(data => setCards(data))
      .catch(err => console.error("Could not load cards", err));
  }, []);

  useEffect(() => {
    if (!previewCard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewCard(null);
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

    const restoredDraft = restoreDraftToSnapshot(draft, cards);
    const savedDeck = draft.selectedDeckId ? getSavedDeckById(draft.selectedDeckId) : null;
    const baselineSnapshot = savedDeck
      ? (() => {
        const restoredSavedDeck = restoreSavedDeckToSnapshot(savedDeck, cards);
        const normalizedDeckState = sanitizeImportedDeckState(
          restoredSavedDeck.snapshot.deckState,
          cards,
          restoredSavedDeck.snapshot.ruleConfig,
        );

        return createDeckSnapshot(
          restoredSavedDeck.snapshot.name,
          restoredSavedDeck.snapshot.ruleConfig,
          normalizedDeckState,
        );
      })()
      : null;

    setPendingDraftRestore({
      snapshot: {
        ...restoredDraft.snapshot,
        deckState: sanitizeImportedDeckState(restoredDraft.snapshot.deckState, cards, restoredDraft.snapshot.ruleConfig),
      },
      selectedDeckId: savedDeck?.id ?? null,
      baselineSnapshot,
    });
    setHasInitializedDraft(true);
  }, [cards, hasInitializedDraft]);

  // Extract unique expansions (prefix before hyphen)
  const expansions = getAvailableExpansions(cards);
  const rarities = getAvailableRarities(cards);
  const productNames = getAvailableProductNames(cards);
  const subtypeTags = getAvailableSubtypeTags(cards);
  const titles = getAvailableTitles(cards);
  const cardDetailLookup = React.useMemo(() => buildCardDetailLookup(cards), [cards]);
  const isConstructed = deckRuleConfig.format === 'constructed';
  const isCrossover = deckRuleConfig.format === 'crossover';
  const isRuleReady = isRuleConfigured(deckRuleConfig);
  const leaderLimit = getDeckLimit('leader', deckRuleConfig);

  const filteredCards = cards.filter(c => {
    if ((isConstructed || isCrossover) && isRuleReady && !isCardAllowedByRule(c, deckRuleConfig)) return false;

    // 1. Name Filter
    if (!c.name.toLowerCase().includes(search.toLowerCase())) return false;

    // 2. Cost Filter
    if (costFilter !== 'All') {
      if (costFilter === '7+') {
        if (!c.cost || c.cost === '-' || parseInt(c.cost) < 7) return false;
      } else {
        if (c.cost !== costFilter) return false;
      }
    }

    // 3. Expansion Filter
    if (expansionFilter !== 'All') {
      if (!c.id.startsWith(expansionFilter + '-')) return false;
    }

    // 4. Class Filter
    if (classFilter !== 'All') {
      if (!c.class) return false;
      if (c.class !== classFilter) return false;
    }

    // 5. Card Type Filter
    if (cardTypeFilter !== 'All') {
      if (getBaseCardType(c.card_kind_normalized) !== cardTypeFilter) {
        return false;
      }
    }

    // 6. Rarity Filter
    if (rarityFilter !== 'All') {
      if (c.rarity !== rarityFilter) return false;
    }

    // 7. Product Filter
    if (productNameFilter !== 'All') {
      if (c.product_name !== productNameFilter) return false;
    }

    // 8. Subtype Filter
    if (selectedSubtypeTags.length > 0) {
      const cardSubtypeTags = getSubtypeTags(c);
      if (!selectedSubtypeTags.some(tag => cardSubtypeTags.includes(tag))) return false;
    }

    // 9. Deck Section Filter
    if (deckSectionFilter !== 'All') {
      if (c.deck_section !== deckSectionFilter) return false;
    }

    return true;
  });
  const displayCards = hideSameNameVariants
    ? dedupeCardsByDisplayIdentity(filteredCards)
    : filteredCards;
  const paginatedCards = displayCards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(displayCards.length / PAGE_SIZE) || 1;
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
  const crossoverClassOptionsA = CONSTRUCTED_CLASS_VALUES.filter(
    cardClass => cardClass === deckRuleConfig.selectedClasses[0] || cardClass !== deckRuleConfig.selectedClasses[1]
  );
  const crossoverClassOptionsB = CONSTRUCTED_CLASS_VALUES.filter(
    cardClass => cardClass === deckRuleConfig.selectedClasses[1] || cardClass !== deckRuleConfig.selectedClasses[0]
  );
  const canExportDeck = deckIssueMessages.length === 0;
  const currentSnapshot = createDeckSnapshot(deckName, deckRuleConfig, deckState);
  const pristineSnapshot = React.useMemo(() => createPristineDeckSnapshot(createDefaultDeckRuleConfig()), []);
  const savedDeckCount = savedDecks.length;
  const hasReachedSoftLimit = hasReachedSoftSavedDeckLimit(savedDeckCount);
  const hasReachedHardLimit = hasReachedHardSavedDeckLimit(savedDeckCount);
  const wouldCreateNewSavedDeck = selectedSavedDeckId === null;
  const canCreateNewSavedDeck = !hasReachedHardLimit;
  const canSaveCurrentDeck = !wouldCreateNewSavedDeck || canCreateNewSavedDeck;
  // "Saved" / "Unsaved changes" compare the current builder against the loaded
  // My Decks baseline. Session restore and local draft persistence are separate.
  const isDirty = savedBaselineSnapshot
    ? !areDeckSnapshotsEqual(currentSnapshot, savedBaselineSnapshot)
    : !areDeckSnapshotsEqual(currentSnapshot, pristineSnapshot);
  const hasBuilderState = !areDeckSnapshotsEqual(currentSnapshot, pristineSnapshot);
  const saveStateMessage = selectedSavedDeckId
    ? (isDirty ? t('deckBuilder.status.unsavedChanges') : t('deckBuilder.status.saved'))
    : t('deckBuilder.status.notSaved');
  const filteredSavedDecks = React.useMemo(() => (
    savedDecks
      .filter(deck => deck.name.toLowerCase().includes(savedDeckSearch.trim().toLowerCase()))
      .map(savedDeck => {
        const restoredDeck = restoreSavedDeckToSnapshot(savedDeck, cards);
        const sanitizedDeckState = sanitizeImportedDeckState(
          restoredDeck.snapshot.deckState,
          cards,
          restoredDeck.snapshot.ruleConfig
        );
        const savedDeckIssues = getDeckValidationMessages(sanitizedDeckState, restoredDeck.snapshot.ruleConfig);

        return {
          savedDeck,
          canExport: savedDeckIssues.length === 0,
        };
      })
  ), [cards, savedDeckSearch, savedDecks]);
  const shownSavedDeckIds = React.useMemo(
    () => filteredSavedDecks.map(({ savedDeck }) => savedDeck.id),
    [filteredSavedDecks]
  );
  const areAllShownSavedDecksSelected = shownSavedDeckIds.length > 0
    && shownSavedDeckIds.every(id => selectedSavedDeckIds.includes(id));

  useEffect(() => {
    if (cards.length === 0 || !hasInitializedDraft || pendingDraftRestore) return;

    // Persist any non-empty builder session, regardless of whether it already
    // matches a saved deck. Restore is based on "what was on screen last time".
    if (!hasBuilderState) {
      clearDraft();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveDraft({
        selectedDeckId: selectedSavedDeckId,
        name: resolveDeckName(deckName),
        ruleConfig: deckRuleConfig,
        deckState,
      });
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

  const clearSavedDeckSelection = () => {
    setIsSavedDeckSelectMode(false);
    setSelectedSavedDeckIds([]);
  };

  const resetBuilderState = () => {
    const defaultRuleConfig = createDefaultDeckRuleConfig();
    setDeckName('');
    setDeckRuleConfig(defaultRuleConfig);
    setDeckState(createEmptyDeckState());
    setSelectedSavedDeckId(null);
    setSavedBaselineSnapshot(null);
    setDraftRestored(false);
    setPendingDraftRestore(null);
  };

  const handleStartFresh = () => {
    clearDraft();
    resetBuilderState();
  };

  const handleContinueDraftRestore = () => {
    if (!pendingDraftRestore) return;

    setDeckName(pendingDraftRestore.snapshot.name);
    setDeckRuleConfig(pendingDraftRestore.snapshot.ruleConfig);
    setDeckState(pendingDraftRestore.snapshot.deckState);
    setSelectedSavedDeckId(pendingDraftRestore.selectedDeckId);
    setSavedBaselineSnapshot(pendingDraftRestore.baselineSnapshot);
    setDraftRestored(true);
    setPendingDraftRestore(null);
  };

  const resetLibraryFilters = () => {
    setSearch('');
    setCostFilter('All');
    setExpansionFilter('All');
    setClassFilter('All');
    setCardTypeFilter('All');
    setRarityFilter('All');
    setProductNameFilter('All');
    setSubtypeSearch('');
    setSelectedSubtypeTags([]);
    setDeckSectionFilter('All');
    setHideSameNameVariants(false);
    setPage(0);
  };

  const addSubtypeTag = (tag: string) => {
    const normalizedTag = tag.trim();
    if (!normalizedTag || !subtypeTags.includes(normalizedTag)) return;

    setSelectedSubtypeTags(current => (
      current.includes(normalizedTag) ? current : [...current, normalizedTag]
    ));
    setSubtypeSearch('');
    setPage(0);
  };

  const removeSubtypeTag = (tag: string) => {
    setSelectedSubtypeTags(current => current.filter(value => value !== tag));
    setPage(0);
  };

  const filteredSubtypeOptions = subtypeSearch.trim().length > 0
    ? subtypeTags.filter(tag => tag.toLowerCase().includes(subtypeSearch.trim().toLowerCase()))
    : subtypeTags;
  const previewDetail = previewCard ? cardDetailLookup[previewCard.id] ?? null : null;
  const hoveredDetail = hoveredDeckCard ? cardDetailLookup[hoveredDeckCard.id] ?? null : null;
  const hoveredPreviewPosition = hoveredDeckCard
    ? getDeckHoverPreviewPosition(hoverPos, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    : null;
  const previewPresentation = buildCardDetailPresentation(previewDetail);

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
    setShowResetDeckDialog(false);
  };

  const resetBuilder = () => {
    clearDraft();
    resetBuilderState();
    setShowResetBuilderDialog(false);
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
        const data = JSON.parse(e.target?.result as string);
        const importedDeckName = resolveImportedDeckName(data, file.name);
        if (importedDeckName) setDeckName(importedDeckName);
        const importedRuleConfig = getImportedDeckRuleConfig(data);
        setDeckRuleConfig(importedRuleConfig);
        setDeckState(sanitizeImportedDeckState(data, cards, importedRuleConfig));
        setSelectedSavedDeckId(null);
        setSavedBaselineSnapshot(null);
        setDraftRestored(false);
        setPendingDraftRestore(null);
      } catch {
        alert(t('deckBuilder.alerts.importFailed'));
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again if needed
    event.target.value = '';
  };

  const getDeckLogImportMessage = (error: unknown): string => {
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

  const handleImportDeckLog = async () => {
    if (cards.length === 0) {
      setSaveFeedback({
        kind: 'warning',
        message: t('deckBuilder.alerts.deckLogCardsLoading'),
      });
      return;
    }

    setIsImportingDeckLog(true);

    try {
      const importedDeck = await fetchDeckLogImport(deckLogInput, cards);
      const sanitizedDeckState = sanitizeImportedDeckState(importedDeck.deckState, cards, importedDeck.ruleConfig);

      setDeckName(importedDeck.deckName);
      setDeckRuleConfig(importedDeck.ruleConfig);
      setDeckState(sanitizedDeckState);
      setSelectedSavedDeckId(null);
      setSavedBaselineSnapshot(null);
      setDraftRestored(false);
      setPendingDraftRestore(null);
      setIsDeckLogImportOpen(false);
      setDeckLogInput('');
      setSaveFeedback({
        kind: importedDeck.missingCardIds.length > 0 ? 'warning' : 'success',
        message: importedDeck.missingCardIds.length > 0
          ? t('deckBuilder.alerts.deckLogImportPartial', { count: importedDeck.missingCardIds.length })
          : t('deckBuilder.alerts.deckLogImportSuccess', { name: importedDeck.deckName }),
      });
    } catch (error) {
      setSaveFeedback({
        kind: 'warning',
        message: getDeckLogImportMessage(error),
      });
    } finally {
      setIsImportingDeckLog(false);
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

    setDeckName(savedDeck.name);
    setSelectedSavedDeckId(savedDeck.id);
    setSavedBaselineSnapshot(createDeckSnapshot(savedDeck.name, snapshot.ruleConfig, snapshot.deckState));
    setDraftRestored(false);
    setPendingDraftRestore(null);
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
    setSelectedSavedDeckId(null);
    setSavedBaselineSnapshot(null);
    setDraftRestored(false);
    setSaveFeedback({
      kind: 'success',
      message: t('deckBuilder.alerts.unsavedCopySuccess'),
    });
  };

  const handleLoadSavedDeck = (deckId: string) => {
    const savedDeck = getSavedDeckById(deckId);
    if (!savedDeck) return;

    const restoredDeck = restoreSavedDeckToSnapshot(savedDeck, cards);
    const sanitizedDeckState = sanitizeImportedDeckState(
      restoredDeck.snapshot.deckState,
      cards,
      restoredDeck.snapshot.ruleConfig,
    );

    setDeckName(restoredDeck.snapshot.name);
    setDeckRuleConfig(restoredDeck.snapshot.ruleConfig);
    setDeckState(sanitizedDeckState);
    setSelectedSavedDeckId(savedDeck.id);
    setSavedBaselineSnapshot(createDeckSnapshot(
      restoredDeck.snapshot.name,
      restoredDeck.snapshot.ruleConfig,
      sanitizedDeckState,
    ));
    setDraftRestored(false);
    setPendingDraftRestore(null);
    setIsMyDecksOpen(false);
    setPendingLoadDeckId(null);
  };

  const handleDeleteSavedDeck = (deckId: string) => {
    const savedDeck = getSavedDeckById(deckId);
    if (!savedDeck) return;
    deleteSavedDeck(deckId);
    if (selectedSavedDeckId === deckId) {
      setSelectedSavedDeckId(null);
      setSavedBaselineSnapshot(null);
    }
    refreshSavedDecks();
    setPendingDeleteDeckId(null);
  };

  const handleDeleteAllSavedDecks = () => {
    deleteAllSavedDecks();
    // Deleting saved records never wipes the current builder. It only removes
    // My Decks entries and drops tracking if the loaded baseline was deleted.
    if (selectedSavedDeckId !== null) {
      setSelectedSavedDeckId(null);
      setSavedBaselineSnapshot(null);
    }
    refreshSavedDecks();
    setPendingDeleteDeckId(null);
    setPendingLoadDeckId(null);
    clearSavedDeckSelection();
    setShowDeleteAllSavedDecksDialog(false);
  };

  const handleDeleteSelectedSavedDecks = () => {
    if (selectedSavedDeckIds.length === 0) return;

    deleteSavedDecks(selectedSavedDeckIds);
    // Selected deletion follows the same rule as Delete All: preserve the live
    // builder and only detach it if its saved baseline is among the deletions.
    if (selectedSavedDeckId !== null && selectedSavedDeckIds.includes(selectedSavedDeckId)) {
      setSelectedSavedDeckId(null);
      setSavedBaselineSnapshot(null);
    }
    refreshSavedDecks();
    setPendingDeleteDeckId(null);
    setPendingLoadDeckId(null);
    clearSavedDeckSelection();
    setShowDeleteSelectedSavedDecksDialog(false);
  };

  const toggleSavedDeckSelection = (deckId: string) => {
    setSelectedSavedDeckIds(current => (
      current.includes(deckId)
        ? current.filter(id => id !== deckId)
        : [...current, deckId]
    ));
  };

  const handleToggleShownSavedDeckSelection = () => {
    if (shownSavedDeckIds.length === 0) return;

    if (areAllShownSavedDecksSelected) {
      setSelectedSavedDeckIds(current => current.filter(id => !shownSavedDeckIds.includes(id)));
      return;
    }

    setSelectedSavedDeckIds(current => (
      Array.from(new Set([...current, ...shownSavedDeckIds]))
    ));
  };

  const handleCloseMyDecks = () => {
    setIsMyDecksOpen(false);
    clearSavedDeckSelection();
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
        <div
          role={saveFeedback.kind === 'warning' ? 'alert' : 'status'}
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '1.25rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1250,
            minWidth: 'min(32rem, calc(100vw - 2rem))',
            maxWidth: 'min(36rem, calc(100vw - 2rem))',
            padding: '0.8rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: saveFeedback.kind === 'warning'
              ? '1px solid rgba(248, 113, 113, 0.45)'
              : '1px solid rgba(103, 232, 249, 0.35)',
            background: saveFeedback.kind === 'warning'
              ? 'rgba(127, 29, 29, 0.92)'
              : 'rgba(8, 47, 73, 0.92)',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.38)',
            textAlign: 'center',
          }}
        >
          {saveFeedback.message}
        </div>
      )}

      {/* Left: Card Database */}
      <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{t('deckBuilder.title')}</h1>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={t('deckBuilder.filters.searchCards')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                fontSize: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={hideSameNameVariants}
              onChange={(e) => { setHideSameNameVariants(e.target.checked); setPage(0); }}
            />
            {t('deckBuilder.filters.hideSameNameVariants')}
          </label>

          <button
            type="button"
            onClick={resetLibraryFilters}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            {t('deckBuilder.filters.reset', 'Reset Filters')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div
            role="group"
            aria-label={t('deckBuilder.filters.aria.section')}
            style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              flexWrap: 'wrap',
              gap: '0.25rem',
              alignItems: 'center',
            }}
          >
            <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('deckBuilder.filters.labels.section')}:
            </span>

            {DECK_SECTION_FILTER_VALUES.map((section) => (
              <button
                key={section}
                type="button"
                aria-pressed={deckSectionFilter === section}
                onClick={() => { setDeckSectionFilter(section); setPage(0); }}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  background: deckSectionFilter === section ? 'var(--brand-accent)' : 'transparent',
                  color: deckSectionFilter === section ? '#fff' : 'var(--text-main)',
                  fontWeight: deckSectionFilter === section ? 'bold' : 'normal',
                }}
              >
                {t(`deckBuilder.filters.deckSection.${section.toLowerCase()}` as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Class Filter */}
          <div
            role="group"
            aria-label={t('deckBuilder.filters.aria.class')}
            style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              flexWrap: 'wrap',
              gap: '0.25rem',
              alignItems: 'center',
            }}
          >
            <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('deckBuilder.filters.labels.class')}:
            </span>

            {CLASS_FILTER_VALUES.map((cls) => {
              const classKey = cls === 'All' ? 'all' : (Object.keys(CLASS).find(k => (CLASS as any)[k] === cls)?.toLowerCase() || 'all');
              return (
                <button
                  key={cls}
                  type="button"
                  aria-pressed={classFilter === cls}
                  onClick={() => { setClassFilter(cls); setPage(0); }}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    background: classFilter === cls ? 'var(--brand-accent)' : 'transparent',
                    color: classFilter === cls ? '#fff' : 'var(--text-main)',
                    fontWeight: classFilter === cls ? 'bold' : 'normal',
                  }}
                >
                  {t(`common.classes.${classKey}`)}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label={t('deckBuilder.filters.aria.cardType')}
            style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              flexWrap: 'wrap',
              gap: '0.25rem',
              alignItems: 'center',
            }}
          >
            <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('deckBuilder.filters.labels.cardType')}:
            </span>

            {CARD_TYPE_FILTER_VALUES.map((cardType) => (
              <button
                key={cardType}
                type="button"
                aria-pressed={cardTypeFilter === cardType}
                onClick={() => { setCardTypeFilter(cardType); setPage(0); }}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  background: cardTypeFilter === cardType ? 'var(--brand-accent)' : 'transparent',
                  color: cardTypeFilter === cardType ? '#fff' : 'var(--text-main)',
                  fontWeight: cardTypeFilter === cardType ? 'bold' : 'normal',
                }}
              >
                {t(`deckBuilder.filters.cardType.${cardType.toLowerCase()}` as any)}
              </button>
            ))}
          </div>

        </div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Cost Filter */}
          <div
            role="group"
            aria-label={t('deckBuilder.filters.aria.cost')}
            style={{ display: 'flex', background: 'var(--bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
          >
            <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.filters.labels.cost')}:</span>
            {COST_FILTER_VALUES.map(c => (
              <button
                key={c}
                type="button"
                aria-pressed={costFilter === c}
                onClick={() => { setCostFilter(c); setPage(0); }}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  background: costFilter === c ? 'var(--brand-accent)' : 'transparent',
                  color: costFilter === c ? '#fff' : 'var(--text-main)',
                  fontWeight: costFilter === c ? 'bold' : 'normal'
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Expansion Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.filters.labels.expansion')}:</span>
            <select
              aria-label={t('deckBuilder.filters.aria.expansion')}
              value={expansionFilter}
              onChange={(e) => { setExpansionFilter(e.target.value); setPage(0); }}
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                outline: 'none',
                minWidth: '120px'
              }}
            >
              <option value="All">{t('deckBuilder.filters.allExpansions')}</option>
              {expansions.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>

          {/* Rarity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.filters.labels.rarity')}:</span>
            <select
              aria-label={t('deckBuilder.filters.aria.rarity')}
              value={rarityFilter}
              onChange={(e) => { setRarityFilter(e.target.value); setPage(0); }}
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                outline: 'none',
                minWidth: '120px'
              }}
            >
              <option value="All">{t('deckBuilder.filters.allRarities')}</option>
              {rarities.map(rarity => (
                <option key={rarity} value={rarity}>{rarity}</option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.filters.labels.productName')}:</span>
            <select
              aria-label={t('deckBuilder.filters.aria.productName')}
              value={productNameFilter}
              onChange={(e) => { setProductNameFilter(e.target.value); setPage(0); }}
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                outline: 'none',
                minWidth: '220px',
                maxWidth: '320px'
              }}
            >
              <option value="All">{t('deckBuilder.filters.allProducts')}</option>
              {productNames.map(productName => (
                <option key={productName} value={productName}>{productName}</option>
              ))}
            </select>
          </div>

          {/* Subtype Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.filters.labels.subtype')}:</span>
              <input
                type="text"
                aria-label={t('deckBuilder.filters.aria.subtypeInput')}
                list="subtype-filter-options"
                placeholder={t('deckBuilder.filters.searchSubtype')}
                value={subtypeSearch}
                onChange={(e) => setSubtypeSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSubtypeTag(subtypeSearch);
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: '160px',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              />
              <datalist id="subtype-filter-options">
                {filteredSubtypeOptions.map(tag => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => addSubtypeTag(subtypeSearch)}
                disabled={!subtypeSearch.trim() || !subtypeTags.includes(subtypeSearch.trim()) || selectedSubtypeTags.includes(subtypeSearch.trim())}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.filters.addSubtype')}
              </button>
            </div>

            {selectedSubtypeTags.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {selectedSubtypeTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeSubtypeTag(tag)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '999px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                    title={t('deckBuilder.filters.removeSubtypeFilter', { tag })}
                  >
                    <span>{tag}</span>
                    <span style={{ color: 'var(--text-muted)' }}>×</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="glass-panel"
              style={{ padding: '0.5rem 1rem' }}
            >
              {t('deckBuilder.pagination.prev')}
            </button>
            <span>{page + 1} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="glass-panel"
              style={{ padding: '0.5rem 1rem' }}
            >
              {t('deckBuilder.pagination.next')}
            </button>
          </div>
        </div>

        {cards.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>{t('deckBuilder.loading')}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
            {paginatedCards.map((card) => {
              const allowedSections = getAllowedSections(card);

              return (
                <div key={card.id} className="glass-panel" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    type="button"
                    aria-label={t('deckBuilder.preview.openAria', { name: card.name })}
                    title={t('deckBuilder.preview.openTitle', { name: card.name })}
                    onClick={() => setPreviewCard(card)}
                    style={{
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      lineHeight: 0,
                    }}
                  >
                    <CardArtwork
                      image={card.image}
                      alt={card.name}
                      detail={cardDetailLookup[card.id]}
                      baseCardType={getBaseCardType(card.card_kind_normalized)}
                      isLeaderCard={card.deck_section === 'leader'}
                      isTokenCard={card.deck_section === 'token' || card.is_token}
                      isEvolveCard={card.is_evolve_card}
                      style={{ width: '100%', borderRadius: '4px' }}
                      draggable={false}
                    />
                  </button>
                  <p style={{ fontSize: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={card.name}>
                    {card.name}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {allowedSections.map(section => {
                      const action = ADD_ACTIONS[section];
                      return (
                        <button
                          key={section}
                          type="button"
                          onClick={() => addToDeck(card, section)}
                          disabled={!canAddCardToDeckState(card, section, deckState, deckRuleConfig)}
                          style={{
                            flex: section === 'token' ? '1 1 100%' : 1,
                            padding: '0.25rem',
                            background: canAddCardToDeckState(card, section, deckState, deckRuleConfig) ? action.background : 'var(--bg-surface-elevated)',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            opacity: canAddCardToDeckState(card, section, deckState, deckRuleConfig) ? 1 : 0.5,
                            cursor: canAddCardToDeckState(card, section, deckState, deckRuleConfig) ? 'pointer' : 'not-allowed',
                          }}
                          title={t(`deckBuilder.addActions.${section}Title` as any)}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {section !== 'leader' && section !== 'token' && <Plus size={16} color="#fff" />}
                            {section === 'main' ? '' : section === 'evolve' ? 'EVO' : section === 'leader' ? 'LEAD' : 'TOKEN'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Deck Checklist */}
      <div className="glass-panel" style={{ width: '350px', display: 'flex', flexDirection: 'column', borderRight: 'none', borderTop: 'none', borderBottom: 'none', borderRadius: 0 }}>
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {t('deckBuilder.deckArea.deckName')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  background: 'rgba(15, 23, 42, 0.45)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderBottom: '2px solid rgba(255,255,255,0.16)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  width: '100%',
                  minWidth: 0,
                  transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                  padding: '0.7rem 0.85rem',
                  flex: 1,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.22)';
                  e.target.style.borderBottom = '2px solid var(--brand-accent)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.12)';
                  e.target.style.background = 'rgba(15, 23, 42, 0.7)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.target.style.borderBottom = '2px solid rgba(255,255,255,0.16)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = 'rgba(15, 23, 42, 0.45)';
                }}
                placeholder={t('deckBuilder.deckArea.deckName')}
              />
              <button
                type="button"
                onClick={() => handleSaveDeck(false)}
                disabled={!canSaveCurrentDeck}
                title={canSaveCurrentDeck
                  ? t('deckBuilder.deckArea.actions.saveTitle')
                  : t('deckBuilder.deckArea.actions.saveDisabledTitle', { limit: HARD_SAVED_DECK_LIMIT })}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: canSaveCurrentDeck ? 'var(--accent-primary)' : '#475569',
                  color: '#fff',
                  border: `1px solid ${canSaveCurrentDeck ? 'rgba(255,255,255,0.12)' : '#64748b'}`,
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: canSaveCurrentDeck ? 'pointer' : 'not-allowed',
                  opacity: canSaveCurrentDeck ? 1 : 0.75,
                }}
              >
                {t('deckBuilder.deckArea.actions.save')}
              </button>
            </div>
            {selectedSavedDeckId && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleMakeUnsavedCopy}
                  title={t('deckBuilder.deckArea.actions.keepWorkingCopy')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('deckBuilder.deckArea.actions.makeUnsavedCopy')}
                </button>
              </div>
            )}
            {deckName.trim() === '' && (
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {t('deckBuilder.deckArea.deckNameHint', { name: DEFAULT_DECK_NAME })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {t('deckBuilder.deckArea.storage')}
              </span>
              <button
                type="button"
                onClick={() => setIsMyDecksOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  background: 'var(--bg-overlay)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-light)',
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  minWidth: '110px',
                }}
              >
                {t('deckBuilder.myDecks.title')}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {t('deckBuilder.deckArea.file')}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-overlay)', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.875rem', border: '1px solid var(--border-light)' }}>
                  <Upload size={14} /> {t('deckBuilder.deckArea.actions.import')}
                  <input type="file" accept=".json" onChange={handleImportDeck} style={{ display: 'none' }} />
                </label>
                <button
                  type="button"
                  onClick={() => setIsDeckLogImportOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'var(--bg-overlay)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-light)',
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={14} />
                  {t('deckBuilder.deckArea.actions.importDeckLog')}
                  <span
                    style={{
                      marginLeft: '0.2rem',
                      padding: '0.08rem 0.35rem',
                      borderRadius: '999px',
                      background: 'rgba(245, 158, 11, 0.18)',
                      color: '#fcd34d',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {t('deckBuilder.deckArea.actions.betaBadge')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={exportDeck}
                  disabled={!canExportDeck}
                  title={canExportDeck ? t('deckBuilder.deckArea.actions.exportTitle') : t('deckBuilder.deckArea.actions.exportDisabledTitle')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: canExportDeck ? '#3b82f6' : '#475569',
                    color: '#fff',
                    border: `1px solid ${canExportDeck ? '#2563eb' : '#64748b'}`,
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    boxShadow: canExportDeck ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                    opacity: canExportDeck ? 1 : 0.75,
                    cursor: canExportDeck ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Download size={14} /> {t('deckBuilder.deckArea.actions.export')}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minHeight: '1.9rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {saveStateMessage}
            </div>
            {draftRestored && (
              <div style={{ color: '#fcd34d', fontSize: '0.75rem' }}>
                {t('deckBuilder.alerts.sessionRestored')}
              </div>
            )}
          </div>
          {hasReachedSoftLimit && (
            <div style={{ color: hasReachedHardLimit ? '#fca5a5' : '#fcd34d', fontSize: '0.75rem', lineHeight: 1.5 }}>
              {hasReachedHardLimit
                ? t('deckBuilder.alerts.limitReachedHard', { limit: HARD_SAVED_DECK_LIMIT })
                : t('deckBuilder.alerts.limitReachedSoft', { count: savedDeckCount, limit: HARD_SAVED_DECK_LIMIT })}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>{t('deckBuilder.deckRule.title')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="deck-format" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.deckRule.ruleFormat')}</label>
              <select
                id="deck-format"
                aria-label={t('deckBuilder.deckRule.aria.format')}
                value={deckRuleConfig.format}
                onChange={(e) => {
                  const nextFormat = e.target.value as DeckFormat;
                  setDeckRuleConfig(current => ({
                    ...current,
                    format: nextFormat,
                    identityType: nextFormat === 'crossover' ? 'class' : current.identityType,
                    selectedTitle: nextFormat === 'crossover' ? null : current.selectedTitle,
                    selectedClasses: nextFormat === 'crossover' && current.selectedClasses.every(value => value === null) && current.selectedClass
                      ? [current.selectedClass, null]
                      : current.selectedClasses,
                  }));
                }}
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                }}
              >
                {DECK_FORMAT_VALUES.map(format => (
                  <option key={format} value={format}>
                    {t(`deckBuilder.deckRule.formats.${format}` as any)}
                  </option>
                ))}
              </select>
            </div>

            {deckRuleConfig.format === 'constructed' && (
              <>
                <div
                  role="group"
                  aria-label={t('deckBuilder.deckRule.aria.identityType')}
                  style={{
                    display: 'flex',
                    background: 'var(--bg-surface)',
                    padding: '0.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    gap: '0.25rem',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {t('deckBuilder.deckRule.identity.type')}
                  </span>
                  {(['class', 'title'] as const).map(identityType => (
                    <button
                      key={identityType}
                      type="button"
                      aria-pressed={deckRuleConfig.identityType === identityType}
                      onClick={() => setDeckRuleConfig(current => ({
                        ...current,
                        identityType,
                      }))}
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        background: deckRuleConfig.identityType === identityType ? 'var(--brand-accent)' : 'transparent',
                        color: deckRuleConfig.identityType === identityType ? '#fff' : 'var(--text-main)',
                        fontWeight: deckRuleConfig.identityType === identityType ? 'bold' : 'normal',
                      }}
                    >
                      {t(`deckBuilder.deckRule.identity.${identityType}` as any)}
                    </button>
                  ))}
                </div>

                {deckRuleConfig.identityType === 'class' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label htmlFor="constructed-class" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.deckRule.selectedClass')}</label>
                    <select
                      id="constructed-class"
                      aria-label={t('deckBuilder.deckRule.aria.constructedClass')}
                      value={deckRuleConfig.selectedClass ?? ''}
                      onChange={(e) => setDeckRuleConfig(current => ({
                        ...current,
                        selectedClass: e.target.value === '' ? null : e.target.value as typeof CLASS_VALUES[number],
                      }))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <option value="">{t('deckBuilder.deckRule.selectClass')}</option>
                      {CONSTRUCTED_CLASS_VALUES.map(cardClass => {
                        const classKey = Object.keys(CLASS).find(k => (CLASS as any)[k] === cardClass)?.toLowerCase() || 'neutral';
                        return (
                          <option key={cardClass} value={cardClass}>
                            {t(`common.classes.${classKey}`)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label htmlFor="constructed-title" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.deckRule.selectedTitle')}</label>
                    <select
                      id="constructed-title"
                      aria-label={t('deckBuilder.deckRule.aria.constructedTitle')}
                      value={deckRuleConfig.selectedTitle ?? ''}
                      onChange={(e) => setDeckRuleConfig(current => ({
                        ...current,
                        selectedTitle: e.target.value === '' ? null : e.target.value,
                      }))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <option value="">{t('deckBuilder.deckRule.selectTitle')}</option>
                      {titles.map(title => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {deckRuleConfig.format === 'crossover' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label htmlFor="crossover-class-a" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.deckRule.crossoverClassA')}</label>
                  <select
                    id="crossover-class-a"
                    aria-label={t('deckBuilder.deckRule.aria.crossoverClassA')}
                    value={deckRuleConfig.selectedClasses[0] ?? ''}
                    onChange={(e) => setDeckRuleConfig(current => ({
                      ...current,
                      selectedClasses: [
                        e.target.value === '' ? null : e.target.value as typeof CLASS_VALUES[number],
                        current.selectedClasses[1],
                      ],
                    }))}
                    style={{
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="">{t('deckBuilder.deckRule.selectFirstClass')}</option>
                    {crossoverClassOptionsA.map(cardClass => {
                      const classKey = Object.keys(CLASS).find(k => (CLASS as any)[k] === cardClass)?.toLowerCase() || 'neutral';
                      return (
                        <option key={cardClass} value={cardClass}>
                          {t(`common.classes.${classKey}`)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label htmlFor="crossover-class-b" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.deckRule.crossoverClassB')}</label>
                  <select
                    id="crossover-class-b"
                    aria-label={t('deckBuilder.deckRule.aria.crossoverClassB')}
                    value={deckRuleConfig.selectedClasses[1] ?? ''}
                    onChange={(e) => setDeckRuleConfig(current => ({
                      ...current,
                      selectedClasses: [
                        current.selectedClasses[0],
                        e.target.value === '' ? null : e.target.value as typeof CLASS_VALUES[number],
                      ],
                    }))}
                    style={{
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="">{t('deckBuilder.deckRule.selectSecondClass')}</option>
                    {crossoverClassOptionsB.map(cardClass => {
                      const classKey = Object.keys(CLASS).find(k => (CLASS as any)[k] === cardClass)?.toLowerCase() || 'neutral';
                      return (
                        <option key={cardClass} value={cardClass}>
                          {t(`common.classes.${classKey}`)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </>
            )}
            {deckRuleConfig.format === 'constructed' && !isRuleReady && (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {t('deckBuilder.deckRule.promptConstructed')}
              </p>
            )}
            {deckRuleConfig.format === 'crossover' && !isRuleReady && (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {t('deckBuilder.deckRule.promptCrossover')}
              </p>
            )}
            {deckIssueMessages.length > 0 && (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: '#ef4444', fontSize: '0.875rem', fontWeight: 700 }}>
                  {t('deckBuilder.deckRule.resolveBeforeExport')}
                </p>
                <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {deckIssueMessages.map((msg: DeckValidationMessage) => {
                    const params: any = { ...msg.params };
                    if (params.deckI18nKey) {
                      params.deck = t(params.deckI18nKey);
                    }
                    if (params.format && typeof params.format === 'string' && ['constructed', 'crossover', 'other'].includes(params.format)) {
                      params.format = t(`deckBuilder.deckRule.formats.${params.format}`);
                    }
                    return (
                      <li key={msg.id + JSON.stringify(params)} style={{ marginBottom: '0.25rem' }}>
                        {t(msg.id as any, params) as string}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {deckIssueMessages.length === 0 && (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <p style={{ margin: 0, color: 'var(--vivid-green-cyan)', fontSize: '0.875rem', fontWeight: 700 }}>
                  {t('deckBuilder.deckRule.legalReady')}
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.5rem' }}>
            <label htmlFor="deck-sort" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.deckArea.myDeckSort')}</label>
            <select
              id="deck-sort"
              aria-label={t('deckBuilder.deckArea.sortAria')}
              value={deckSortMode}
              onChange={(e) => setDeckSortMode(e.target.value as DeckSortMode)}
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
              }}
            >
              {DECK_SORT_VALUES.map(sortMode => (
                <option key={sortMode} value={sortMode}>{t(`deckBuilder.deckArea.sort.${sortMode}` as any)}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowResetDeckDialog(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                border: '1px solid rgba(248, 113, 113, 0.45)',
                padding: '0.4rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('deckBuilder.deckArea.actions.reset')}
            </button>
            <button
              type="button"
              onClick={() => setShowResetBuilderDialog(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(239, 68, 68, 0.18)',
                color: '#fecaca',
                border: '1px solid rgba(248, 113, 113, 0.55)',
                padding: '0.4rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t('deckBuilder.modals.resetBuilder.title')}
            </button>
          </div>

          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('deckBuilder.deckArea.leader')}</span>
            <span style={{ color: leaderCards.length >= leaderLimit ? 'var(--brand-accent)' : 'var(--text-muted)' }}>
              {leaderCards.length}/{leaderLimit}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '2rem' }}>
            {groupedLeaderCards.length > 0 ? (
              groupedLeaderCards.map(({ card, count }) => (
                <div key={card.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'help',
                      }}
                      onMouseEnter={(e) => {
                        setHoveredDeckCard(card);
                        setHoverPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseMove={(e) => {
                        setHoverPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => {
                        setHoveredDeckCard(null);
                      }}
                    >
                      {card.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {card.id} {card.cost ? `• Cost ${card.cost}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {count > 1 && <span style={{ color: 'var(--text-main)', fontSize: '0.75rem', minWidth: '2rem', textAlign: 'right', fontWeight: 600 }}>× {count}</span>}
                    <button type="button" onClick={() => removeFromDeck('leader', card.id)} style={{ color: '#ef4444' }} title={t('deckBuilder.deckArea.actions.removeLeader')}><Minus size={16} /></button>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('deckBuilder.deckArea.noLeader')}</p>
            )}
          </div>

          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('deckBuilder.deckArea.mainDeck')}</span>
            <span style={{ color: mainDeck.length >= 40 ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}>{mainDeck.length}/{DECK_LIMITS.main}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '2rem' }}>
            {groupedMainDeck.map(({ card, count }) => (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'help',
                    }}
                    onMouseEnter={(e) => {
                      setHoveredDeckCard(card);
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setHoveredDeckCard(null);
                    }}
                  >
                    {card.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.id} {card.cost ? `• Cost ${card.cost}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button type="button" onClick={() => removeFromDeck('main', card.id)} style={{ color: '#ef4444' }} title={t('deckBuilder.deckArea.actions.removeMain')}><Minus size={16} /></button>
                  <span style={{ color: 'var(--text-main)', fontSize: '0.75rem', minWidth: '2rem', textAlign: 'center', fontWeight: 600 }}>× {count}</span>
                  <button
                    type="button"
                    onClick={() => addToDeck(card, 'main')}
                    disabled={!canAddCardToDeckState(card, 'main', deckState, deckRuleConfig)}
                    style={{ color: canAddCardToDeckState(card, 'main', deckState, deckRuleConfig) ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}
                    title={t('deckBuilder.addActions.mainLabel')}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('deckBuilder.deckArea.evolveDeck')}</span>
            <span style={{ color: 'var(--text-muted)' }}>{evolveDeck.length}/{DECK_LIMITS.evolve}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {groupedEvolveDeck.map(({ card, count }) => (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <div style={{ minWidth: 0 }}>

                  <div
                    style={{
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'help',
                    }}
                    onMouseEnter={(e) => {
                      setHoveredDeckCard(card);
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setHoveredDeckCard(null);
                    }}
                  >
                    {card.name}
                  </div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.id} {card.cost ? `• Cost ${card.cost}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button type="button" onClick={() => removeFromDeck('evolve', card.id)} style={{ color: '#ef4444' }} title={t('deckBuilder.deckArea.actions.removeEvolve')}><Minus size={16} /></button>
                  <span style={{ color: 'var(--text-main)', fontSize: '0.75rem', minWidth: '2rem', textAlign: 'center', fontWeight: 600 }}>× {count}</span>
                  <button
                    type="button"
                    onClick={() => addToDeck(card, 'evolve')}
                    disabled={!canAddCardToDeckState(card, 'evolve', deckState, deckRuleConfig)}
                    style={{ color: canAddCardToDeckState(card, 'evolve', deckState, deckRuleConfig) ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}
                    title={t('deckBuilder.addActions.evolveLabel')}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('deckBuilder.deckArea.tokenDeck')}</span>
            <span style={{ color: 'var(--text-muted)' }}>{tokenDeck.length}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {groupedTokenDeck.map(({ card, count }) => (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'help',
                    }}
                    onMouseEnter={(e) => {
                      setHoveredDeckCard(card);
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setHoveredDeckCard(null);
                    }}
                  >
                    {card.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.id} {card.cost ? `• Cost ${card.cost}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button type="button" onClick={() => removeFromDeck('token', card.id)} style={{ color: '#ef4444' }} title={t('deckBuilder.deckArea.actions.removeToken')}><Minus size={16} /></button>
                  <span style={{ color: 'var(--text-main)', fontSize: '0.75rem', minWidth: '2rem', textAlign: 'center', fontWeight: 600 }}>× {count}</span>
                  <button
                    type="button"
                    onClick={() => addToDeck(card, 'token')}
                    disabled={!canAddCardToDeckState(card, 'token', deckState, deckRuleConfig)}
                    style={{ color: canAddCardToDeckState(card, 'token', deckState, deckRuleConfig) ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}
                    title={t('deckBuilder.addActions.tokenLabel')}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isMyDecksOpen && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseMyDecks();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('deckBuilder.myDecks.title')}
            onClick={(event) => event.stopPropagation()}
            className="glass-panel"
            style={{
              width: 'min(720px, calc(100vw - 32px))',
              maxHeight: 'min(80vh, 760px)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>{t('deckBuilder.myDecks.title')}</h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {t('deckBuilder.myDecks.subtitle')}
                </p>
                <p style={{ margin: '0.35rem 0 0 0', color: '#fcd34d', fontSize: '0.78rem', lineHeight: 1.5, maxWidth: '38rem' }}>
                  {t('deckBuilder.myDecks.disclaimer')}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleCloseMyDecks}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  {t('common.buttons.close')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDeck(true)}
                  disabled={!canCreateNewSavedDeck}
                  title={canCreateNewSavedDeck
                    ? t('deckBuilder.deckArea.actions.saveAsNewTitle')
                    : t('deckBuilder.deckArea.actions.saveDisabledTitle', { limit: HARD_SAVED_DECK_LIMIT })}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${canCreateNewSavedDeck ? 'rgba(255,255,255,0.12)' : '#64748b'}`,
                    background: canCreateNewSavedDeck ? 'var(--accent-secondary)' : '#475569',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: canCreateNewSavedDeck ? 'pointer' : 'not-allowed',
                    opacity: canCreateNewSavedDeck ? 1 : 0.75,
                  }}
                >
                  {t('deckBuilder.deckArea.actions.saveAsNew')}
                </button>
                {filteredSavedDecks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isSavedDeckSelectMode) {
                        clearSavedDeckSelection();
                        return;
                      }
                      setIsSavedDeckSelectMode(true);
                    }}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      background: isSavedDeckSelectMode ? 'var(--bg-overlay)' : 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isSavedDeckSelectMode ? t('deckBuilder.myDecks.cancelSelection') : t('deckBuilder.myDecks.select')}
                  </button>
                )}
                {savedDecks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteAllSavedDecksDialog(true)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(248, 113, 113, 0.45)',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#fca5a5',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {t('deckBuilder.myDecks.deleteAll')}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={savedDeckSearch}
                onChange={(event) => setSavedDeckSearch(event.target.value)}
                placeholder={t('deckBuilder.myDecks.search')}
                aria-label={t('deckBuilder.myDecks.searchAria')}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '0.65rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('deckBuilder.myDecks.shownCount', { count: filteredSavedDecks.length })}
              </span>
            </div>

            {isSavedDeckSelectMode && filteredSavedDecks.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.45)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                  {t('deckBuilder.myDecks.selectedCount', { count: selectedSavedDeckIds.length })}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleToggleShownSavedDeckSelection}
                    style={{
                      padding: '0.45rem 0.7rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-overlay)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                    }}
                  >
                    {areAllShownSavedDecksSelected ? t('deckBuilder.myDecks.clearSelection') : t('deckBuilder.myDecks.selectAllShown')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteSelectedSavedDecksDialog(true)}
                    disabled={selectedSavedDeckIds.length === 0}
                    style={{
                      padding: '0.45rem 0.7rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(248, 113, 113, 0.45)',
                      background: selectedSavedDeckIds.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface-elevated)',
                      color: selectedSavedDeckIds.length > 0 ? '#fca5a5' : 'var(--text-muted)',
                      cursor: selectedSavedDeckIds.length > 0 ? 'pointer' : 'not-allowed',
                      fontWeight: 700,
                      opacity: selectedSavedDeckIds.length > 0 ? 1 : 0.7,
                    }}
                  >
                    {t('deckBuilder.myDecks.deleteSelected')}
                  </button>
                </div>
              </div>
            )}

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
              {filteredSavedDecks.length === 0 ? (
                <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {t('deckBuilder.myDecks.noDecks')}
                </div>
              ) : (
                filteredSavedDecks.map(({ savedDeck, canExport }) => (
                  <div
                    key={savedDeck.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      padding: '0.9rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: savedDeck.id === selectedSavedDeckId
                        ? '1px solid rgba(56, 189, 248, 0.5)'
                        : '1px solid rgba(255,255,255,0.06)',
                      flexWrap: 'wrap',
                    }}
                  >
                    {isSavedDeckSelectMode && (
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          paddingTop: '0.2rem',
                        }}
                      >
                        <input
                          type="checkbox"
                          aria-label={t('deckBuilder.myDecks.selectDeck', { name: savedDeck.name })}
                          checked={selectedSavedDeckIds.includes(savedDeck.id)}
                          onChange={() => toggleSavedDeckSelection(savedDeck.id)}
                        />
                      </label>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{savedDeck.name}</div>
                        {savedDeck.id === selectedSavedDeckId && (
                          <span style={{ fontSize: '0.72rem', color: '#67e8f9', border: '1px solid rgba(103, 232, 249, 0.35)', borderRadius: '999px', padding: '0.12rem 0.45rem' }}>
                            {t('deckBuilder.myDecks.current')}
                          </span>
                        )}
                        {!canExport && (
                          <span style={{ fontSize: '0.72rem', color: '#fca5a5', border: '1px solid rgba(248, 113, 113, 0.35)', borderRadius: '999px', padding: '0.12rem 0.45rem' }}>
                            {t('deckBuilder.modals.loadDeck.illegalDeck')}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        {formatSavedDeckRuleSummary(savedDeck, t)}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        {formatSavedDeckCountSummary(savedDeck, t)}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                        {t('deckBuilder.modals.loadDeck.updated', { at: formatSavedDeckUpdatedAt(savedDeck.updatedAt, i18n.language) })}
                      </div>
                      {!canExport && (
                        <div style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: '0.3rem', lineHeight: 1.5 }}>
                          {t('deckBuilder.modals.loadDeck.resolveIssues')}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                      {isSavedDeckSelectMode ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: '0.35rem' }}>
                          {t('deckBuilder.modals.loadDeck.deleteBulkHint')}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (isDirty) {
                                setPendingLoadDeckId(savedDeck.id);
                                return;
                              }

                              handleLoadSavedDeck(savedDeck.id);
                            }}
                            style={{
                              padding: '0.45rem 0.7rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              background: 'var(--accent-primary)',
                              color: '#fff',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {t('deckBuilder.myDecks.actions.load')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateSavedDeck(savedDeck.id)}
                            disabled={!canCreateNewSavedDeck}
                            title={canCreateNewSavedDeck
                              ? t('deckBuilder.myDecks.actions.duplicateTitle')
                              : t('deckBuilder.deckArea.actions.duplicateDisabledTitle', { limit: HARD_SAVED_DECK_LIMIT })}
                            style={{
                              padding: '0.45rem 0.7rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-light)',
                              background: canCreateNewSavedDeck ? 'var(--bg-overlay)' : 'var(--bg-surface-elevated)',
                              color: canCreateNewSavedDeck ? 'var(--text-main)' : 'var(--text-muted)',
                              cursor: canCreateNewSavedDeck ? 'pointer' : 'not-allowed',
                              opacity: canCreateNewSavedDeck ? 1 : 0.7,
                            }}
                          >
                            {t('deckBuilder.myDecks.actions.duplicate')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportSavedDeck(savedDeck.id)}
                            disabled={!canExport}
                            title={canExport ? t('deckBuilder.myDecks.actions.exportTitle') : t('deckBuilder.modals.loadDeck.resolveIssues')}
                            style={{
                              padding: '0.45rem 0.7rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-light)',
                              background: canExport ? 'var(--bg-overlay)' : 'var(--bg-surface-elevated)',
                              color: canExport ? 'var(--text-main)' : 'var(--text-muted)',
                              cursor: canExport ? 'pointer' : 'not-allowed',
                              opacity: canExport ? 1 : 0.7,
                            }}
                          >
                            {t('deckBuilder.myDecks.actions.export')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteDeckId(savedDeck.id)}
                            style={{
                              padding: '0.45rem 0.7rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid rgba(248, 113, 113, 0.45)',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#fca5a5',
                              cursor: 'pointer',
                            }}
                          >
                            {t('deckBuilder.modals.buttons.delete')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {pendingLoadDeck && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('deckBuilder.modals.loadDeck.aria')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <h3 style={{ margin: 0, color: '#fcd34d' }}>{t('deckBuilder.modals.loadDeck.title')}</h3>
            <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.loadDeck.desc', { name: pendingLoadDeck.name })}
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.loadDeck.note')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setPendingLoadDeckId(null)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.modals.buttons.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleLoadSavedDeck(pendingLoadDeck.id)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.myDecks.actions.load')}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteDeck && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('deckBuilder.modals.deleteDeck.aria')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <h3 style={{ margin: 0, color: '#fca5a5' }}>{t('deckBuilder.modals.deleteDeck.title')}</h3>
            <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.deleteDeck.desc', { name: pendingDeleteDeck.name })}
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.deleteDeck.note')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setPendingDeleteDeckId(null)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.modals.buttons.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSavedDeck(pendingDeleteDeck.id)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #dc2626',
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.modals.buttons.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeckLogImportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('deckBuilder.modals.deckLogImport.aria')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, color: '#67e8f9' }}>{t('deckBuilder.modals.deckLogImport.title')}</h3>
              <span
                style={{
                  padding: '0.12rem 0.42rem',
                  borderRadius: '999px',
                  background: 'rgba(245, 158, 11, 0.18)',
                  color: '#fcd34d',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                {t('deckBuilder.deckArea.actions.betaBadge')}
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.deckLogImport.desc')}
            </p>
            <input
              type="text"
              value={deckLogInput}
              onChange={(event) => setDeckLogInput(event.target.value)}
              placeholder={t('deckBuilder.modals.deckLogImport.placeholder')}
              autoFocus
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-overlay)',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
              }}
            />
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.deckLogImport.note')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => {
                  if (isImportingDeckLog) return;
                  setIsDeckLogImportOpen(false);
                  setDeckLogInput('');
                }}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  cursor: isImportingDeckLog ? 'not-allowed' : 'pointer',
                  opacity: isImportingDeckLog ? 0.7 : 1,
                }}
              >
                {t('common.buttons.cancel')}
              </button>
              <button
                type="button"
                onClick={handleImportDeckLog}
                disabled={isImportingDeckLog || deckLogInput.trim().length === 0}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: isImportingDeckLog || deckLogInput.trim().length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isImportingDeckLog || deckLogInput.trim().length === 0 ? 0.75 : 1,
                }}
              >
                {isImportingDeckLog
                  ? t('deckBuilder.modals.deckLogImport.importing')
                  : t('deckBuilder.modals.deckLogImport.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteSelectedSavedDecksDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('deckBuilder.modals.deleteSelectedDecks.aria')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <h3 style={{ margin: 0, color: '#fca5a5' }}>{t('deckBuilder.modals.deleteSelectedDecks.title')}</h3>
            <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.deleteSelectedDecks.desc', { count: selectedSavedDeckIds.length })}
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.deleteSelectedDecks.note')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowDeleteSelectedSavedDecksDialog(false)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.modals.buttons.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedSavedDecks}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #dc2626',
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.myDecks.deleteSelected')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllSavedDecksDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('deckBuilder.modals.deleteAllDecks.aria')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <h3 style={{ margin: 0, color: '#fca5a5' }}>{t('deckBuilder.modals.deleteAllDecks.title')}</h3>
            <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.deleteAllDecks.desc', { count: savedDecks.length })}
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.deleteAllDecks.note')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowDeleteAllSavedDecksDialog(false)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.modals.buttons.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAllSavedDecks}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #dc2626',
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.myDecks.deleteAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewCard && (
        <div
          role="presentation"
          onClick={() => setPreviewCard(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('deckBuilder.preview.dialogAria', { name: previewCard.name })}
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '660px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              boxShadow: '0 18px 50px rgba(0, 0, 0, 0.45)',
              padding: '0.8rem',
            }}
          >
            <button
              type="button"
              aria-label={t('deckBuilder.preview.closeAria')}
              onClick={() => setPreviewCard(null)}
              style={{
                position: 'absolute',
                top: '-0.5rem',
                right: '-0.5rem',
                width: '2rem',
                height: '2rem',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                background: 'rgba(15, 23, 42, 0.92)',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.15rem', paddingRight: '1.8rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '1rem', lineHeight: 1.35 }}>
                  {previewDetail?.name || previewCard.name}
                </div>
                {previewPresentation.primaryMeta && (
                  <div style={{ color: '#cbd5e1', fontSize: '0.76rem', marginTop: '0.18rem', lineHeight: 1.45 }}>
                    {previewPresentation.primaryMeta}
                  </div>
                )}
                {previewPresentation.secondaryMeta && (
                  <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '0.1rem', lineHeight: 1.45 }}>
                    {previewPresentation.secondaryMeta}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <CardArtwork
                image={previewDetail?.image || previewCard.image}
                alt={t('deckBuilder.preview.enlargedAlt', { name: previewCard.name })}
                detail={previewDetail ?? {
                  id: previewCard.id,
                  name: previewCard.name,
                  image: previewCard.image,
                  className: previewCard.class ?? '',
                  title: previewCard.title ?? '',
                  type: previewCard.type ?? '',
                  subtype: previewCard.subtype ?? '',
                  cost: previewCard.cost ?? '-',
                  atk: parseNullableStat(previewCard.atk),
                  hp: parseNullableStat(previewCard.hp),
                  abilityText: previewCard.ability_text ?? '',
                }}
                baseCardType={getBaseCardType(previewCard.card_kind_normalized)}
                isLeaderCard={previewCard.deck_section === 'leader'}
                isTokenCard={previewCard.deck_section === 'token' || previewCard.is_token}
                isEvolveCard={previewCard.is_evolve_card}
                style={{
                  width: '160px',
                  maxWidth: '40vw',
                  height: '224px',
                  borderRadius: '10px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.32)',
                  flexShrink: 0,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0, flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: '0.14rem 0.4rem', color: '#e2e8f0', fontSize: '0.76rem' }}>
                  <span style={{ color: '#94a3b8' }}>{t('deckBuilder.preview.id')}</span>
                  <span>{previewCard.id}</span>
                  <span style={{ color: '#94a3b8' }}>{t('deckBuilder.preview.cost')}</span>
                  <span>{previewDetail?.cost || previewCard.cost || '-'}</span>
                  {previewPresentation.stats && (
                    <>
                      <span style={{ color: '#94a3b8' }}>{t('deckBuilder.preview.stats')}</span>
                      <span>{previewPresentation.stats}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.6rem' }}>
              <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                {t('gameBoard.inspector.abilityText')}
              </div>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  color: '#e5e7eb',
                  fontSize: '0.76rem',
                  lineHeight: 1.58,
                  background: 'rgba(15, 23, 42, 0.76)',
                  borderRadius: '10px',
                  padding: '0.65rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                  maxHeight: '30vh',
                  overflowY: 'auto',
                }}
              >
                {previewDetail?.abilityText
                  ? formatAbilityText(previewDetail.abilityText)
                  : t('gameBoard.inspector.noAbilityText')}
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetDeckDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('deckBuilder.modals.resetDeck.aria')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1000,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <h3 style={{ margin: 0, color: '#fcd34d' }}>{t('deckBuilder.modals.resetDeck.title')}</h3>
            <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.resetDeck.desc')}
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.resetDeck.descNote')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowResetDeckDialog(false)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                {t('common.buttons.cancel')}
              </button>
              <button
                type="button"
                onClick={resetDeckContents}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #dc2626',
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.modals.resetDeck.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetBuilderDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('deckBuilder.modals.resetBuilder.aria')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1000,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <h3 style={{ margin: 0, color: '#fca5a5' }}>{t('deckBuilder.modals.resetBuilder.title')}</h3>
            <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.resetBuilder.desc')}
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.resetBuilder.descNote')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowResetBuilderDialog(false)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                {t('common.buttons.cancel')}
              </button>
              <button
                type="button"
                onClick={resetBuilder}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #dc2626',
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.modals.resetBuilder.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {hoveredDeckCard && (
        <div
          style={{
            position: 'fixed',
            left: hoveredPreviewPosition?.left ?? DECK_HOVER_PREVIEW_VIEWPORT_PADDING,
            top: hoveredPreviewPosition?.top ?? DECK_HOVER_PREVIEW_VIEWPORT_PADDING,
            zIndex: 2000,
            pointerEvents: 'none',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            padding: '0.5rem',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            width: `${DECK_HOVER_PREVIEW_WIDTH}px`,
            maxHeight: `${DECK_HOVER_PREVIEW_MAX_HEIGHT}px`,
          }}
        >
          <CardArtwork
            image={hoveredDeckCard.image}
            alt={hoveredDeckCard.name}
            detail={hoveredDetail ?? undefined}
            baseCardType={getBaseCardType(hoveredDeckCard.card_kind_normalized)}
            isLeaderCard={hoveredDeckCard.deck_section === 'leader'}
            isTokenCard={hoveredDeckCard.deck_section === 'token' || hoveredDeckCard.is_token}
            isEvolveCard={hoveredDeckCard.is_evolve_card}
            style={{ width: '100%', borderRadius: '10px' }}
            draggable={false}
          />
          <div style={{ marginTop: '0.35rem', color: '#e2e8f0', fontSize: '0.78rem', fontWeight: 700 }}>
            {hoveredDeckCard.name}
          </div>
        </div>
      )}


      {pendingDraftRestore && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('deckBuilder.modals.loadDeck.resumeAria')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1200,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <h3 style={{ margin: 0, color: '#fcd34d' }}>{t('deckBuilder.modals.loadDeck.resume')}</h3>
            <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.loadDeck.resumeSessionDesc')}
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {t('deckBuilder.modals.loadDeck.resumeSessionNote')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleStartFresh}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(248, 113, 113, 0.35)',
                  background: 'rgba(239, 68, 68, 0.10)',
                  color: '#fca5a5',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.modals.loadDeck.startFresh')}
              </button>
              <button
                type="button"
                onClick={handleContinueDraftRestore}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('deckBuilder.modals.loadDeck.continue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckBuilder;
