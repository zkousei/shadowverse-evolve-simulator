import React, { useEffect, useState } from 'react';
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
  type DeckFormat,
  type DeckIdentityType,
  getImportedDeckRuleConfig,
} from '../models/deckRule';
import { createEmptyDeckState, type DeckState } from '../models/deckState';
import {
  canAddCardToDeckState,
  DECK_LIMITS,
  getDeckLimit,
  getAllowedSections,
  getDeckValidationMessages,
  isCardAllowedByRule,
  isRuleConfigured,
  sanitizeImportedDeckState,
  type DeckTargetSection,
} from '../utils/deckBuilderRules';
import { buildCardDetailLookup, formatAbilityText } from '../utils/cardDetails';
import {
  areDeckSnapshotsEqual,
  clearDraft,
  createDeckSnapshot,
  createPristineDeckSnapshot,
  deleteSavedDeck,
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
import CardArtwork from '../components/CardArtwork';

const PAGE_SIZE = 50;
const COST_FILTER_VALUES = ['All', '0', '1', '2', '3', '4', '5', '6', '7+'] as const;
const DECK_SECTION_FILTER_VALUES = ['All', 'main', 'evolve', 'leader', 'token'] as const;
const CARD_TYPE_FILTER_VALUES = ['All', 'follower', 'spell', 'amulet'] as const;
const CARD_TYPE_FILTER_LABELS: Record<(typeof CARD_TYPE_FILTER_VALUES)[number], string> = {
  All: 'All',
  follower: 'Follower',
  spell: 'Spell',
  amulet: 'Amulet',
};
const DECK_SECTION_FILTER_LABELS: Record<(typeof DECK_SECTION_FILTER_VALUES)[number], string> = {
  All: 'All',
  main: 'Main',
  evolve: 'Evolve',
  leader: 'Leader',
  token: 'Token',
};
const ADD_ACTIONS: Record<DeckTargetSection, { title: string; label: React.ReactNode; background: string }> = {
  main: {
    title: 'Add to Main Deck',
    label: <Plus size={16} color="#fff" />,
    background: 'var(--accent-primary)',
  },
  evolve: {
    title: 'Add to Evolve Deck',
    label: <><Plus size={16} color="#fff" /> EVO</>,
    background: 'var(--accent-secondary)',
  },
  leader: {
    title: 'Set as Leader',
    label: 'LEAD',
    background: '#f59e0b',
  },
  token: {
    title: 'Add to Token Deck',
    label: 'TOKEN',
    background: 'var(--vivid-green-cyan)',
  },
};

const DECK_SECTION_ADD_LABELS: Record<Exclude<DeckTargetSection, 'leader'>, string> = {
  main: 'Add one copy to Main Deck',
  evolve: 'Add one copy to Evolve Deck',
  token: 'Add one copy to Token Deck',
};
const DECK_FORMAT_LABELS: Record<DeckFormat, string> = {
  constructed: 'Constructed',
  crossover: 'Crossover',
  other: 'Other',
};
const DECK_IDENTITY_LABELS: Record<DeckIdentityType, string> = {
  class: 'Class',
  title: 'Title',
};
const DECK_SORT_VALUES = ['added', 'cost', 'id'] as const;
type DeckSortMode = typeof DECK_SORT_VALUES[number];
const DECK_SORT_LABELS: Record<DeckSortMode, string> = {
  added: 'Added Order',
  cost: 'Cost',
  id: 'Card ID',
};

const getCardCostSortValue = (card: DeckBuilderCardData): number => {
  if (!card.cost || card.cost === '-') return Number.POSITIVE_INFINITY;
  const parsed = Number.parseInt(card.cost, 10);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

const sortDeckCardsForDisplay = (
  cards: DeckBuilderCardData[],
  sortMode: DeckSortMode
): DeckBuilderCardData[] => {
  if (sortMode === 'added') return cards;

  return [...cards].sort((left, right) => {
    if (sortMode === 'cost') {
      const costDiff = getCardCostSortValue(left) - getCardCostSortValue(right);
      if (costDiff !== 0) return costDiff;
    }

    return left.id.localeCompare(right.id, 'ja');
  });
};

type DeckDisplayGroup = {
  card: DeckBuilderCardData;
  count: number;
};

const groupDeckCardsForDisplay = (cards: DeckBuilderCardData[]): DeckDisplayGroup[] => {
  const groups: DeckDisplayGroup[] = [];

  cards.forEach(card => {
    const existingGroup = groups.find(group => group.card.id === card.id);
    if (existingGroup) {
      existingGroup.count += 1;
      return;
    }

    groups.push({ card, count: 1 });
  });

  return groups;
};

const parseNullableStat = (value?: string): number | null => {
  if (!value || value === '-') return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatSavedDeckRuleSummary = (deck: SavedDeckRecordV1): string => {
  if (deck.ruleConfig.format === 'constructed') {
    if (deck.ruleConfig.identityType === 'title' && deck.ruleConfig.selectedTitle) {
      return `Constructed / Title: ${deck.ruleConfig.selectedTitle}`;
    }

    return `Constructed / Class: ${deck.ruleConfig.selectedClass ?? 'Unselected'}`;
  }

  if (deck.ruleConfig.format === 'crossover') {
    const [firstClass, secondClass] = deck.ruleConfig.selectedClasses;
    return `Crossover / ${firstClass ?? '?'} + ${secondClass ?? '?'}`;
  }

  return 'Other';
};

const formatSavedDeckCountSummary = (deck: SavedDeckRecordV1): string => {
  const countCards = (section: SavedDeckRecordV1['sections'][keyof SavedDeckRecordV1['sections']]) => (
    section.reduce((total, ref) => total + ref.count, 0)
  );

  return [
    `Main ${countCards(deck.sections.main)}`,
    `Evolve ${countCards(deck.sections.evolve)}`,
    `Leader ${countCards(deck.sections.leader)}`,
    `Token ${countCards(deck.sections.token)}`,
  ].join(' / ');
};

const formatSavedDeckUpdatedAt = (value: string): string => {
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const DeckBuilder: React.FC = () => {
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

  const [deckName, setDeckName] = useState('My Deck');
  const [deckRuleConfig, setDeckRuleConfig] = useState(createDefaultDeckRuleConfig());
  const [deckState, setDeckState] = useState<DeckState>(createEmptyDeckState());
  const [deckSortMode, setDeckSortMode] = useState<DeckSortMode>('added');
  const [showResetDeckDialog, setShowResetDeckDialog] = useState(false);
  const [previewCard, setPreviewCard] = useState<DeckBuilderCardData | null>(null);
  const [savedDecks, setSavedDecks] = useState<SavedDeckRecordV1[]>(() => listSavedDecks());
  const [selectedSavedDeckId, setSelectedSavedDeckId] = useState<string | null>(null);
  const [savedBaselineSnapshot, setSavedBaselineSnapshot] = useState<DeckBuilderSnapshot | null>(null);
  const [isMyDecksOpen, setIsMyDecksOpen] = useState(false);
  const [savedDeckSearch, setSavedDeckSearch] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [hasInitializedDraft, setHasInitializedDraft] = useState(false);
  const [pendingDeleteDeckId, setPendingDeleteDeckId] = useState<string | null>(null);
  const [pendingLoadDeckId, setPendingLoadDeckId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/cards_detailed.json')
      .then(res => res.json())
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
      ? restoreSavedDeckToSnapshot(savedDeck, cards).snapshot
      : null;

    setDeckName(restoredDraft.snapshot.name);
    setDeckRuleConfig(restoredDraft.snapshot.ruleConfig);
    setDeckState(sanitizeImportedDeckState(restoredDraft.snapshot.deckState, cards, restoredDraft.snapshot.ruleConfig));
    setSelectedSavedDeckId(savedDeck?.id ?? null);
    setSavedBaselineSnapshot(baselineSnapshot);
    setDraftRestored(true);
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
  const isDirty = savedBaselineSnapshot
    ? !areDeckSnapshotsEqual(currentSnapshot, savedBaselineSnapshot)
    : !areDeckSnapshotsEqual(currentSnapshot, pristineSnapshot);
  const saveStateMessage = draftRestored
    ? 'Draft restored from this browser'
    : selectedSavedDeckId
      ? (isDirty ? 'Unsaved changes' : 'Saved')
      : (isDirty ? 'Unsaved changes' : 'Not saved to My Decks');
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

  useEffect(() => {
    if (cards.length === 0 || !hasInitializedDraft) return;

    const timeoutId = window.setTimeout(() => {
      saveDraft({
        selectedDeckId: selectedSavedDeckId,
        name: deckName,
        ruleConfig: deckRuleConfig,
        deckState,
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [cards.length, deckName, deckRuleConfig, deckState, hasInitializedDraft, selectedSavedDeckId]);

  const refreshSavedDecks = () => {
    setSavedDecks(listSavedDecks());
  };

  const handleDiscardDraft = () => {
    clearDraft();
    const defaultRuleConfig = createDefaultDeckRuleConfig();
    setDeckName('My Deck');
    setDeckRuleConfig(defaultRuleConfig);
    setDeckState(createEmptyDeckState());
    setSelectedSavedDeckId(null);
    setSavedBaselineSnapshot(null);
    setDraftRestored(false);
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
  const previewPrimaryMeta = [
    previewDetail?.className,
    previewDetail?.title,
  ].filter(Boolean).join(' / ');
  const previewSecondaryMeta = [
    previewDetail?.type,
    previewDetail?.subtype,
  ].filter(Boolean).join(' / ');
  const previewStats = previewDetail && previewDetail.atk !== null && previewDetail.hp !== null
    ? `${previewDetail.atk} / ${previewDetail.hp}`
    : null;

  const removeLastCardById = (cards: DeckBuilderCardData[], cardId?: string): DeckBuilderCardData[] => {
    if (!cardId) return cards;
    const removeIndex = cards.findLastIndex(card => card.id === cardId);
    if (removeIndex < 0) return cards;
    return cards.filter((_, index) => index !== removeIndex);
  };

  const addToDeck = (card: DeckBuilderCardData, targetSection: DeckTargetSection) => {
    if (!canAddCardToDeckState(card, targetSection, deckState, deckRuleConfig)) return;

    setDeckState(current => {
      switch (targetSection) {
        case 'main':
          if (current.mainDeck.length >= DECK_LIMITS.main) return current;
          return { ...current, mainDeck: [...current.mainDeck, card] };
        case 'evolve':
          if (current.evolveDeck.length >= DECK_LIMITS.evolve) return current;
          return { ...current, evolveDeck: [...current.evolveDeck, card] };
        case 'leader': {
          if (deckRuleConfig.format === 'crossover') {
            const leaderClass = card.class;

            if (!leaderClass || leaderClass === CLASS.NEUTRAL || leaderClass === '-') return current;

            const existingIndex = current.leaderCards.findIndex(leader => leader.class === leaderClass);
            if (existingIndex >= 0) {
              const nextLeaderCards = [...current.leaderCards];
              nextLeaderCards[existingIndex] = card;
              return { ...current, leaderCards: nextLeaderCards };
            }

            if (current.leaderCards.length >= leaderLimit) return current;
            return { ...current, leaderCards: [...current.leaderCards, card] };
          }

          return { ...current, leaderCards: [card] };
        }
        case 'token':
          return { ...current, tokenDeck: [...current.tokenDeck, card] };
      }
    });
  };

  const removeFromDeck = (targetSection: DeckTargetSection, cardId?: string) => {
    setDeckState(current => {
      switch (targetSection) {
        case 'main':
          return { ...current, mainDeck: removeLastCardById(current.mainDeck, cardId) };
        case 'evolve':
          return { ...current, evolveDeck: removeLastCardById(current.evolveDeck, cardId) };
        case 'leader':
          return { ...current, leaderCards: removeLastCardById(current.leaderCards, cardId) };
        case 'token':
          return { ...current, tokenDeck: removeLastCardById(current.tokenDeck, cardId) };
      }
    });
  };

  const resetDeckContents = () => {
    setDeckState(createEmptyDeckState());
    setShowResetDeckDialog(false);
  };

  const exportDeck = () => {
    const downloadDeckJson = (name: string, ruleConfig: typeof deckRuleConfig, nextDeckState: DeckState) => {
      const data = JSON.stringify({
        deckName: name,
        rule: ruleConfig.format,
        identityType: ruleConfig.identityType,
        selectedClass: ruleConfig.selectedClass,
        selectedTitle: ruleConfig.selectedTitle,
        selectedClasses: ruleConfig.selectedClasses,
        ...nextDeckState,
      }, null, 2);

      // Sanitize filename - allow alphanumeric, Japanese characters, underscores, hyphens
      const rawName = name.trim();
      const safeName = rawName.length > 0
        ? rawName.replace(/[^\w\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF\-]/g, '_')
        : 'shadowverse_deck';

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.json`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();

      // Delay revoke to ensure download starts
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    };

    downloadDeckJson(deckName, deckRuleConfig, deckState);
  };

  const handleImportDeck = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.deckName) setDeckName(data.deckName);
        else {
          // Fallback to filename if no deckName in JSON
          const nameMatch = file.name.match(/(.+)\.json$/i);
          if (nameMatch) setDeckName(nameMatch[1]);
        }
        const importedRuleConfig = getImportedDeckRuleConfig(data);
        setDeckRuleConfig(importedRuleConfig);
        setDeckState(sanitizeImportedDeckState(data, cards, importedRuleConfig));
        setSelectedSavedDeckId(null);
        setSavedBaselineSnapshot(null);
        setDraftRestored(false);
      } catch (err) {
        alert("Failed to parse deck JSON.");
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again if needed
    event.target.value = '';
  };

  const handleSaveDeck = (saveAsNew = false) => {
    if ((saveAsNew || selectedSavedDeckId === null) && !canCreateNewSavedDeck) {
      return;
    }

    const snapshot = createDeckSnapshot(deckName, deckRuleConfig, deckState);
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
    refreshSavedDecks();
  };

  const handleLoadSavedDeck = (deckId: string) => {
    const savedDeck = getSavedDeckById(deckId);
    if (!savedDeck) return;

    const restoredDeck = restoreSavedDeckToSnapshot(savedDeck, cards);
    setDeckName(restoredDeck.snapshot.name);
    setDeckRuleConfig(restoredDeck.snapshot.ruleConfig);
    setDeckState(sanitizeImportedDeckState(restoredDeck.snapshot.deckState, cards, restoredDeck.snapshot.ruleConfig));
    setSelectedSavedDeckId(savedDeck.id);
    setSavedBaselineSnapshot(restoredDeck.snapshot);
    setDraftRestored(false);
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
    const data = JSON.stringify({
      deckName: restoredDeck.snapshot.name,
      rule: restoredDeck.snapshot.ruleConfig.format,
      identityType: restoredDeck.snapshot.ruleConfig.identityType,
      selectedClass: restoredDeck.snapshot.ruleConfig.selectedClass,
      selectedTitle: restoredDeck.snapshot.ruleConfig.selectedTitle,
      selectedClasses: restoredDeck.snapshot.ruleConfig.selectedClasses,
      ...restoredDeck.snapshot.deckState,
    }, null, 2);

    const rawName = restoredDeck.snapshot.name.trim();
    const safeName = rawName.length > 0
      ? rawName.replace(/[^\w\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF\-]/g, '_')
      : 'shadowverse_deck';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeName}.json`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 200);
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: Card Database */}
      <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Card Library</h1>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search cards by name..."
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
            Hide same-name variants
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
            Reset Filters
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div
            role="group"
            aria-label="Deck section filter"
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
              Section:
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
                {DECK_SECTION_FILTER_LABELS[section]}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Class Filter */}
          <div
            role="group"
            aria-label="Class filter"
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
              Class:
            </span>

            {CLASS_FILTER_VALUES.map((cls) => (
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
                {cls}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Card type filter"
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
              Type:
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
                {CARD_TYPE_FILTER_LABELS[cardType]}
              </button>
            ))}
          </div>

        </div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Cost Filter */}
          <div
            role="group"
            aria-label="Cost filter"
            style={{ display: 'flex', background: 'var(--bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
          >
            <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cost:</span>
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
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Set:</span>
            <select
              aria-label="Expansion filter"
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
              <option value="All">All Expansions</option>
              {expansions.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>

          {/* Rarity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Rarity:</span>
            <select
              aria-label="Rarity filter"
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
              <option value="All">All Rarities</option>
              {rarities.map(rarity => (
                <option key={rarity} value={rarity}>{rarity}</option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Product:</span>
            <select
              aria-label="Product filter"
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
              <option value="All">All Products</option>
              {productNames.map(productName => (
                <option key={productName} value={productName}>{productName}</option>
              ))}
            </select>
          </div>

          {/* Subtype Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Subtype:</span>
              <input
                type="text"
                aria-label="Subtype filter input"
                list="subtype-filter-options"
                placeholder="Search subtype..."
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
                Add
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
                    title={`Remove subtype filter ${tag}`}
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
              Prev
            </button>
            <span>{page + 1} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="glass-panel"
              style={{ padding: '0.5rem 1rem' }}
            >
              Next
            </button>
          </div>
        </div>

        {cards.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Loading card database...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
            {paginatedCards.map((card) => {
              const allowedSections = getAllowedSections(card);

              return (
                <div key={card.id} className="glass-panel" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    type="button"
                    aria-label={`Preview ${card.name}`}
                    title={`Preview ${card.name}`}
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
                          title={action.title}
                        >
                          {action.label}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                background: 'transparent',
                border: 'none',
                borderBottom: '2px solid transparent',
                color: 'var(--text-main)',
                outline: 'none',
                flex: 1,
                minWidth: 0,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderBottom = '2px solid var(--brand-accent)'}
              onBlur={(e) => e.target.style.borderBottom = '2px solid transparent'}
              placeholder="Deck Name"
            />
            <button
              type="button"
              onClick={() => handleSaveDeck(false)}
              disabled={!canSaveCurrentDeck}
              title={canSaveCurrentDeck ? 'Save deck' : `My Decks limit reached (${HARD_SAVED_DECK_LIMIT}). Delete or export older decks before creating a new saved deck.`}
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
              Save
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Storage
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
                My Decks
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                File
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-overlay)', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.875rem', border: '1px solid var(--border-light)' }}>
                  <Upload size={14} /> Import
                  <input type="file" accept=".json" onChange={handleImportDeck} style={{ display: 'none' }} />
                </label>
                <button
                  type="button"
                  onClick={exportDeck}
                  disabled={!canExportDeck}
                  title={canExportDeck ? 'Export deck' : 'Resolve deck issues before exporting'}
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
                  <Download size={14} /> Export
                </button>
              </div>
            </div>
          </div>

          <div style={{ minHeight: '1rem', color: draftRestored ? '#fcd34d' : 'var(--text-muted)', fontSize: '0.75rem' }}>
            {saveStateMessage}
          </div>
          {hasReachedSoftLimit && (
            <div style={{ color: hasReachedHardLimit ? '#fca5a5' : '#fcd34d', fontSize: '0.75rem', lineHeight: 1.5 }}>
              {hasReachedHardLimit
                ? `My Decks has reached the browser limit (${HARD_SAVED_DECK_LIMIT}). Delete or export older decks before creating a new saved deck.`
                : `My Decks already has ${savedDeckCount} saved decks in this browser. Consider exporting or deleting older decks before it reaches ${HARD_SAVED_DECK_LIMIT}.`}
            </div>
          )}
          {draftRestored && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={handleDiscardDraft}
                style={{
                  padding: '0.4rem 0.7rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(248, 113, 113, 0.35)',
                  background: 'rgba(239, 68, 68, 0.10)',
                  color: '#fca5a5',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Start Fresh
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Deck Rule</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="deck-format" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Rule</label>
              <select
                id="deck-format"
                aria-label="Deck format"
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
                    {DECK_FORMAT_LABELS[format]}
                  </option>
                ))}
              </select>
            </div>

            {deckRuleConfig.format === 'constructed' && (
              <>
                <div
                  role="group"
                  aria-label="Deck identity type"
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
                    Build by:
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
                      {DECK_IDENTITY_LABELS[identityType]}
                    </button>
                  ))}
                </div>

                {deckRuleConfig.identityType === 'class' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label htmlFor="constructed-class" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Selected Class</label>
                    <select
                      id="constructed-class"
                      aria-label="Constructed class"
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
                      <option value="">Select class</option>
                      {CONSTRUCTED_CLASS_VALUES.map(cardClass => (
                        <option key={cardClass} value={cardClass}>{cardClass}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label htmlFor="constructed-title" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Selected Title</label>
                    <select
                      id="constructed-title"
                      aria-label="Constructed title"
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
                      <option value="">Select title</option>
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
                  <label htmlFor="crossover-class-a" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Crossover Class A</label>
                  <select
                    id="crossover-class-a"
                    aria-label="Crossover class A"
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
                      <option value="">Select first class</option>
                    {crossoverClassOptionsA.map(cardClass => (
                      <option key={cardClass} value={cardClass}>{cardClass}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label htmlFor="crossover-class-b" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Crossover Class B</label>
                  <select
                    id="crossover-class-b"
                    aria-label="Crossover class B"
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
                      <option value="">Select second class</option>
                    {crossoverClassOptionsB.map(cardClass => (
                      <option key={cardClass} value={cardClass}>{cardClass}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {deckRuleConfig.format === 'constructed' && !isRuleReady && (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Select a class or title to enable constructed deck building.
              </p>
            )}
            {deckRuleConfig.format === 'crossover' && !isRuleReady && (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Select two different classes to enable crossover deck building.
              </p>
            )}
            {deckIssueMessages.length > 0 && (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: '#ef4444', fontSize: '0.875rem', fontWeight: 700 }}>
                  Resolve these issues before exporting.
                </p>
                <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {deckIssueMessages.map(message => (
                    <li key={message} style={{ marginBottom: '0.25rem' }}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
            {deckIssueMessages.length === 0 && (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <p style={{ margin: 0, color: 'var(--vivid-green-cyan)', fontSize: '0.875rem', fontWeight: 700 }}>
                  This deck is legal and ready to export.
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.5rem' }}>
            <label htmlFor="deck-sort" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>My Deck Sort</label>
            <select
              id="deck-sort"
              aria-label="Deck sort"
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
                <option key={sortMode} value={sortMode}>{DECK_SORT_LABELS[sortMode]}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
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
              Reset Deck
            </button>
          </div>

          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Leader</span>
            <span style={{ color: leaderCards.length >= leaderLimit ? 'var(--brand-accent)' : 'var(--text-muted)' }}>
              {leaderCards.length}/{leaderLimit}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '2rem' }}>
            {groupedLeaderCards.length > 0 ? (
              groupedLeaderCards.map(({ card, count }) => (
                <div key={card.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {card.id} {card.cost ? `• Cost ${card.cost}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {count > 1 && <span style={{ color: 'var(--text-main)', fontSize: '0.75rem', minWidth: '2rem', textAlign: 'right', fontWeight: 600 }}>× {count}</span>}
                    <button type="button" onClick={() => removeFromDeck('leader', card.id)} style={{ color: '#ef4444' }} title="Remove one leader"><Minus size={16} /></button>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>No leader selected.</p>
            )}
          </div>

          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Main Deck</span>
            <span style={{ color: mainDeck.length >= 40 ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}>{mainDeck.length}/{DECK_LIMITS.main}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '2rem' }}>
            {groupedMainDeck.map(({ card, count }) => (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.id} {card.cost ? `• Cost ${card.cost}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button type="button" onClick={() => removeFromDeck('main', card.id)} style={{ color: '#ef4444' }} title="Remove one copy from Main Deck"><Minus size={16} /></button>
                  <span style={{ color: 'var(--text-main)', fontSize: '0.75rem', minWidth: '2rem', textAlign: 'center', fontWeight: 600 }}>× {count}</span>
                  <button
                    type="button"
                    onClick={() => addToDeck(card, 'main')}
                    disabled={!canAddCardToDeckState(card, 'main', deckState, deckRuleConfig)}
                    style={{ color: canAddCardToDeckState(card, 'main', deckState, deckRuleConfig) ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}
                    title={DECK_SECTION_ADD_LABELS.main}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Evolve Deck</span>
            <span style={{ color: 'var(--text-muted)' }}>{evolveDeck.length}/{DECK_LIMITS.evolve}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {groupedEvolveDeck.map(({ card, count }) => (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.id} {card.cost ? `• Cost ${card.cost}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button type="button" onClick={() => removeFromDeck('evolve', card.id)} style={{ color: '#ef4444' }} title="Remove one copy from Evolve Deck"><Minus size={16} /></button>
                  <span style={{ color: 'var(--text-main)', fontSize: '0.75rem', minWidth: '2rem', textAlign: 'center', fontWeight: 600 }}>× {count}</span>
                  <button
                    type="button"
                    onClick={() => addToDeck(card, 'evolve')}
                    disabled={!canAddCardToDeckState(card, 'evolve', deckState, deckRuleConfig)}
                    style={{ color: canAddCardToDeckState(card, 'evolve', deckState, deckRuleConfig) ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}
                    title={DECK_SECTION_ADD_LABELS.evolve}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Token Deck</span>
            <span style={{ color: 'var(--text-muted)' }}>{tokenDeck.length}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {groupedTokenDeck.map(({ card, count }) => (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.id} {card.cost ? `• Cost ${card.cost}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button type="button" onClick={() => removeFromDeck('token', card.id)} style={{ color: '#ef4444' }} title="Remove one copy from Token Deck"><Minus size={16} /></button>
                  <span style={{ color: 'var(--text-main)', fontSize: '0.75rem', minWidth: '2rem', textAlign: 'center', fontWeight: 600 }}>× {count}</span>
                  <button
                    type="button"
                    onClick={() => addToDeck(card, 'token')}
                    disabled={!canAddCardToDeckState(card, 'token', deckState, deckRuleConfig)}
                    style={{ color: canAddCardToDeckState(card, 'token', deckState, deckRuleConfig) ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}
                    title={DECK_SECTION_ADD_LABELS.token}
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
              setIsMyDecksOpen(false);
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
            aria-label="My Decks"
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
                <h3 style={{ margin: 0 }}>My Decks</h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Saved in this browser
                </p>
                <p style={{ margin: '0.35rem 0 0 0', color: '#fcd34d', fontSize: '0.78rem', lineHeight: 1.5, maxWidth: '38rem' }}>
                  My Decks is stored in this browser only. To keep a durable backup or move decks to another device, use Export and save the JSON file.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setIsMyDecksOpen(false)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDeck(true)}
                  disabled={!canCreateNewSavedDeck}
                  title={canCreateNewSavedDeck ? 'Save current deck as a new saved deck' : `My Decks limit reached (${HARD_SAVED_DECK_LIMIT}). Delete or export older decks before creating a new saved deck.`}
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
                  Save As New
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={savedDeckSearch}
                onChange={(event) => setSavedDeckSearch(event.target.value)}
                placeholder="Search by deck name..."
                aria-label="Search saved decks"
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
                {filteredSavedDecks.length} decks
              </span>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
              {filteredSavedDecks.length === 0 ? (
                <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  No saved decks yet. Build a deck and press Save to keep it in this browser.
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
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{savedDeck.name}</div>
                            {savedDeck.id === selectedSavedDeckId && (
                              <span style={{ fontSize: '0.72rem', color: '#67e8f9', border: '1px solid rgba(103, 232, 249, 0.35)', borderRadius: '999px', padding: '0.12rem 0.45rem' }}>
                                Current
                              </span>
                            )}
                            {!canExport && (
                              <span style={{ fontSize: '0.72rem', color: '#fca5a5', border: '1px solid rgba(248, 113, 113, 0.35)', borderRadius: '999px', padding: '0.12rem 0.45rem' }}>
                                Illegal deck
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            {formatSavedDeckRuleSummary(savedDeck)}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                            {formatSavedDeckCountSummary(savedDeck)}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                            Updated {formatSavedDeckUpdatedAt(savedDeck.updatedAt)}
                          </div>
                          {!canExport && (
                            <div style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: '0.3rem', lineHeight: 1.5 }}>
                              Resolve deck issues after loading before exporting.
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
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
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateSavedDeck(savedDeck.id)}
                            disabled={!canCreateNewSavedDeck}
                            title={canCreateNewSavedDeck ? 'Duplicate saved deck' : `My Decks limit reached (${HARD_SAVED_DECK_LIMIT}). Delete or export older decks before duplicating.`}
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
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportSavedDeck(savedDeck.id)}
                            disabled={!canExport}
                            title={canExport ? 'Export saved deck' : 'Resolve deck issues after loading before exporting'}
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
                            Export
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
                            Delete
                          </button>
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
          aria-label="Load saved deck confirmation"
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
            <h3 style={{ margin: 0, color: '#fcd34d' }}>Load Saved Deck</h3>
            <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
              Replace the current unsaved changes with "{pendingLoadDeck.name}"?
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Your current unsaved edits in Deck Builder will be replaced.
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
                Cancel
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
                Load
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteDeck && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete saved deck confirmation"
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
            <h3 style={{ margin: 0, color: '#fca5a5' }}>Delete Saved Deck</h3>
            <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
              Delete "{pendingDeleteDeck.name}" from My Decks on this browser?
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              This only removes the saved copy in this browser. Exported JSON files are not affected.
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
                Cancel
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
                Delete
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
            aria-label={`${previewCard.name} preview`}
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
              aria-label="Close card preview"
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
                {previewPrimaryMeta && (
                  <div style={{ color: '#cbd5e1', fontSize: '0.76rem', marginTop: '0.18rem', lineHeight: 1.45 }}>
                    {previewPrimaryMeta}
                  </div>
                )}
                {previewSecondaryMeta && (
                  <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '0.1rem', lineHeight: 1.45 }}>
                    {previewSecondaryMeta}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <CardArtwork
                image={previewDetail?.image || previewCard.image}
                alt={`${previewCard.name} enlarged`}
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
                  <span style={{ color: '#94a3b8' }}>ID</span>
                  <span>{previewCard.id}</span>
                  <span style={{ color: '#94a3b8' }}>Cost</span>
                  <span>{previewDetail?.cost || previewCard.cost || '-'}</span>
                  {previewStats && (
                    <>
                      <span style={{ color: '#94a3b8' }}>Stats</span>
                      <span>{previewStats}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.6rem' }}>
              <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                Ability Text
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
                  : 'このカードの詳細テキストは見つかりませんでした。'}
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetDeckDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reset deck confirmation"
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
            <h3 style={{ margin: 0, color: '#fcd34d' }}>Reset Deck</h3>
            <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
              Clear the current Main Deck, Evolve Deck, Leader, and Token Deck contents?
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Deck rule settings, deck name, and card library filters will stay as they are.
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
                Cancel
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
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckBuilder;
