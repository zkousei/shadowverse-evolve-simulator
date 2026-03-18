import React, { useEffect, useState } from 'react';
import { Search, Plus, Minus, Download, Upload } from 'lucide-react';
import { CLASS, CLASS_FILTER_VALUES, CLASS_VALUES, CONSTRUCTED_CLASS_VALUES } from '../models/class';
import type { ClassFilter } from '../models/class';
import {
  dedupeCardsByDisplayIdentity,
  getAvailableExpansions,
  getAvailableProductNames,
  getAvailableRarities,
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

const PAGE_SIZE = 50;
const COST_FILTER_VALUES = ['All', '0', '1', '2', '3', '4', '5', '6', '7+'] as const;
const DECK_SECTION_FILTER_VALUES = ['All', 'main', 'evolve', 'leader', 'token'] as const;
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

const DeckBuilder: React.FC = () => {
  const [cards, setCards] = useState<DeckBuilderCardData[]>([]);
  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState('All');
  const [expansionFilter, setExpansionFilter] = useState('All');
  const [classFilter, setClassFilter] = useState<ClassFilter>('All');
  const [rarityFilter, setRarityFilter] = useState('All');
  const [productNameFilter, setProductNameFilter] = useState('All');
  const [deckSectionFilter, setDeckSectionFilter] = useState<(typeof DECK_SECTION_FILTER_VALUES)[number]>('All');
  const [hideSameNameVariants, setHideSameNameVariants] = useState(false);
  const [page, setPage] = useState(0);

  const [deckName, setDeckName] = useState('My Deck');
  const [deckRuleConfig, setDeckRuleConfig] = useState(createDefaultDeckRuleConfig());
  const [deckState, setDeckState] = useState<DeckState>(createEmptyDeckState());
  const [deckSortMode, setDeckSortMode] = useState<DeckSortMode>('added');
  const [showResetDeckDialog, setShowResetDeckDialog] = useState(false);

  useEffect(() => {
    fetch('/cards_detailed.json')
      .then(res => res.json())
      .then(data => setCards(data))
      .catch(err => console.error("Could not load cards", err));
  }, []);

  // Extract unique expansions (prefix before hyphen)
  const expansions = getAvailableExpansions(cards);
  const rarities = getAvailableRarities(cards);
  const productNames = getAvailableProductNames(cards);
  const titles = getAvailableTitles(cards);
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

    // 5. Rarity Filter
    if (rarityFilter !== 'All') {
      if (c.rarity !== rarityFilter) return false;
    }

    // 6. Product Filter
    if (productNameFilter !== 'All') {
      if (c.product_name !== productNameFilter) return false;
    }

    // 7. Deck Section Filter
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
  const crossoverClassOptionsA = CONSTRUCTED_CLASS_VALUES.filter(
    cardClass => cardClass === deckRuleConfig.selectedClasses[0] || cardClass !== deckRuleConfig.selectedClasses[1]
  );
  const crossoverClassOptionsB = CONSTRUCTED_CLASS_VALUES.filter(
    cardClass => cardClass === deckRuleConfig.selectedClasses[1] || cardClass !== deckRuleConfig.selectedClasses[0]
  );
  const canExportDeck = deckIssueMessages.length === 0;

  const resetLibraryFilters = () => {
    setSearch('');
    setCostFilter('All');
    setExpansionFilter('All');
    setClassFilter('All');
    setRarityFilter('All');
    setProductNameFilter('All');
    setDeckSectionFilter('All');
    setHideSameNameVariants(false);
    setPage(0);
  };

  const removeFirstCardById = (cards: DeckBuilderCardData[], cardId?: string): DeckBuilderCardData[] => {
    if (!cardId) return cards;
    const removeIndex = cards.findIndex(card => card.id === cardId);
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
          return { ...current, mainDeck: removeFirstCardById(current.mainDeck, cardId) };
        case 'evolve':
          return { ...current, evolveDeck: removeFirstCardById(current.evolveDeck, cardId) };
        case 'leader':
          return { ...current, leaderCards: removeFirstCardById(current.leaderCards, cardId) };
        case 'token':
          return { ...current, tokenDeck: removeFirstCardById(current.tokenDeck, cardId) };
      }
    });
  };

  const resetDeckContents = () => {
    setDeckState(createEmptyDeckState());
    setShowResetDeckDialog(false);
  };

  const exportDeck = () => {
    const data = JSON.stringify({
      deckName,
      rule: deckRuleConfig.format,
      identityType: deckRuleConfig.identityType,
      selectedClass: deckRuleConfig.selectedClass,
      selectedTitle: deckRuleConfig.selectedTitle,
      selectedClasses: deckRuleConfig.selectedClasses,
      ...deckState,
    }, null, 2);

    // Sanitize filename - allow alphanumeric, Japanese characters, underscores, hyphens
    const rawName = deckName.trim();
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
      } catch (err) {
        alert("Failed to parse deck JSON.");
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again if needed
    event.target.value = '';
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
                  <img src={card.image} alt={card.name} style={{ width: '100%', borderRadius: '4px' }} loading="lazy" />
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
        <div style={{ padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-overlay)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.875rem' }}>
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
                padding: '0.5rem 0.75rem',
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
            {sortedLeaderCards.length > 0 ? (
              sortedLeaderCards.map((card, index) => (
                <div key={`${card.id}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {card.id} {card.cost ? `• Cost ${card.cost}` : ''}
                    </div>
                  </div>
                  <button type="button" onClick={() => removeFromDeck('leader', card.id)} style={{ color: '#ef4444' }}><Minus size={16} /></button>
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
            {sortedMainDeck.map((c, i) => (
              <div key={`${c.id}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.id} {c.cost ? `• Cost ${c.cost}` : ''}
                  </div>
                </div>
                <button type="button" onClick={() => removeFromDeck('main', c.id)} style={{ color: '#ef4444' }}><Minus size={16} /></button>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Evolve Deck</span>
            <span style={{ color: 'var(--text-muted)' }}>{evolveDeck.length}/{DECK_LIMITS.evolve}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {sortedEvolveDeck.map((c, i) => (
              <div key={`${c.id}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.id} {c.cost ? `• Cost ${c.cost}` : ''}
                  </div>
                </div>
                <button type="button" onClick={() => removeFromDeck('evolve', c.id)} style={{ color: '#ef4444' }}><Minus size={16} /></button>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Token Deck</span>
            <span style={{ color: 'var(--text-muted)' }}>{tokenDeck.length}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {sortedTokenDeck.map((c, i) => (
              <div key={`${c.id}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.id} {c.cost ? `• Cost ${c.cost}` : ''}
                  </div>
                </div>
                <button type="button" onClick={() => removeFromDeck('token', c.id)} style={{ color: '#ef4444' }}><Minus size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

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
