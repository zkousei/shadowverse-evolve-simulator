import React, { useEffect, useState } from 'react';
import { Search, Plus, Minus, Download, Upload } from 'lucide-react';
import { CLASS_FILTER_VALUES, CLASS_VALUES, CONSTRUCTED_CLASS_VALUES } from '../models/class';
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
  canAddCardToSection,
  DECK_LIMITS,
  getAllowedSections,
  isCardAllowedByRule,
  isRuleConfigured,
  sanitizeImportedDeckState,
  type DeckTargetSection,
  validateDeckState,
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
    background: 'var(--brand-accent)',
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
const RULE_ISSUE_LABELS: Record<DeckTargetSection, string> = {
  main: 'Main Deck',
  evolve: 'Evolve Deck',
  leader: 'Leader',
  token: 'Token Deck',
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
  const isConstructedReady = isRuleConfigured(deckRuleConfig);

  const filteredCards = cards.filter(c => {
    if (isConstructed && isConstructedReady && !isCardAllowedByRule(c, deckRuleConfig)) return false;

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
  const { mainDeck, evolveDeck, leaderCard, tokenDeck } = deckState;
  const deckIssues = validateDeckState(deckState, deckRuleConfig);
  const ruleIssueCards = deckIssues
    .filter(issue => issue.code === 'invalid-rule')
    .map(issue => {
      const card = cards.find(candidate => candidate.id === issue.cardId);
      return card ? `${card.name} (${RULE_ISSUE_LABELS[issue.deck]})` : null;
    })
    .filter((value): value is string => value !== null);

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

  const addToDeck = (card: DeckBuilderCardData, targetSection: DeckTargetSection) => {
    if (!canAddCardToSection(card, targetSection, deckRuleConfig)) return;

    setDeckState(current => {
      switch (targetSection) {
        case 'main':
          if (current.mainDeck.length >= DECK_LIMITS.main) return current;
          return { ...current, mainDeck: [...current.mainDeck, card] };
        case 'evolve':
          if (current.evolveDeck.length >= DECK_LIMITS.evolve) return current;
          return { ...current, evolveDeck: [...current.evolveDeck, card] };
        case 'leader':
          return { ...current, leaderCard: card };
        case 'token':
          return { ...current, tokenDeck: [...current.tokenDeck, card] };
      }
    });
  };

  const removeFromDeck = (targetSection: DeckTargetSection, index?: number) => {
    setDeckState(current => {
      switch (targetSection) {
        case 'main':
          return { ...current, mainDeck: current.mainDeck.filter((_, i) => i !== index) };
        case 'evolve':
          return { ...current, evolveDeck: current.evolveDeck.filter((_, i) => i !== index) };
        case 'leader':
          return { ...current, leaderCard: null };
        case 'token':
          return { ...current, tokenDeck: current.tokenDeck.filter((_, i) => i !== index) };
      }
    });
  };

  const exportDeck = () => {
    const data = JSON.stringify({
      deckName,
      rule: deckRuleConfig.format,
      identityType: deckRuleConfig.identityType,
      selectedClass: deckRuleConfig.selectedClass,
      selectedTitle: deckRuleConfig.selectedTitle,
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
        setDeckRuleConfig(getImportedDeckRuleConfig(data));
        setDeckState(sanitizeImportedDeckState(data, cards));
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
                          disabled={!canAddCardToSection(card, section, deckRuleConfig)}
                          style={{
                            flex: section === 'token' ? '1 1 100%' : 1,
                            padding: '0.25rem',
                            background: canAddCardToSection(card, section, deckRuleConfig) ? action.background : 'var(--bg-surface-elevated)',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            opacity: canAddCardToSection(card, section, deckRuleConfig) ? 1 : 0.5,
                            cursor: canAddCardToSection(card, section, deckRuleConfig) ? 'pointer' : 'not-allowed',
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
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-surface-elevated)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
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
                  <option key={format} value={format} disabled={format === 'crossover'}>
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
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Crossover deck building is not implemented yet.
              </p>
            )}
            {deckRuleConfig.format === 'constructed' && !isConstructedReady && (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Select a class or title to enable constructed deck building.
              </p>
            )}
            {ruleIssueCards.length > 0 && (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: '#f59e0b', fontSize: '0.875rem', fontWeight: 700 }}>
                  {ruleIssueCards.length} card(s) do not match the selected deck rule.
                </p>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {ruleIssueCards.slice(0, 3).join(', ')}
                  {ruleIssueCards.length > 3 ? ', ...' : ''}
                </p>
              </div>
            )}
          </div>

          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Leader</span>
            <span style={{ color: leaderCard ? 'var(--brand-accent)' : 'var(--text-muted)' }}>{leaderCard ? '1/1' : '0/1'}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '2rem' }}>
            {leaderCard ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leaderCard.name}</span>
                <button type="button" onClick={() => removeFromDeck('leader')} style={{ color: '#ef4444' }}><Minus size={16} /></button>
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>No leader selected.</p>
            )}
          </div>

          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Main Deck</span>
            <span style={{ color: mainDeck.length >= 40 ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}>{mainDeck.length}/{DECK_LIMITS.main}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '2rem' }}>
            {mainDeck.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <button type="button" onClick={() => removeFromDeck('main', i)} style={{ color: '#ef4444' }}><Minus size={16} /></button>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Evolve Deck</span>
            <span style={{ color: 'var(--text-muted)' }}>{evolveDeck.length}/{DECK_LIMITS.evolve}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {evolveDeck.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <button type="button" onClick={() => removeFromDeck('evolve', i)} style={{ color: '#ef4444' }}><Minus size={16} /></button>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Token Deck</span>
            <span style={{ color: 'var(--text-muted)' }}>{tokenDeck.length}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {tokenDeck.map((c, i) => (
              <div key={`${c.id}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <button type="button" onClick={() => removeFromDeck('token', i)} style={{ color: '#ef4444' }}><Minus size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilder;
