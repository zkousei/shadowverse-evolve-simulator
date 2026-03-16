import React, { useEffect, useState } from 'react';
import { Search, Plus, Minus, Download, Upload } from 'lucide-react';

interface CardData {
  id: string; // EXP-NUM format, e.g PCS01-001
  name: string;
  image: string;
  class?: string;
  cost?: string; // '-' for Evolve cards
}

const PAGE_SIZE = 50;

const DeckBuilder: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState('All');
  const [expansionFilter, setExpansionFilter] = useState('All');
  const [page, setPage] = useState(0);
  
  const [deckName, setDeckName] = useState('My Deck');
  
  const [mainDeck, setMainDeck] = useState<CardData[]>([]);
  const [evolveDeck, setEvolveDeck] = useState<CardData[]>([]);

  useEffect(() => {
    fetch('/cards_detailed.json')
      .then(res => res.json())
      .then(data => setCards(data))
      .catch(err => console.error("Could not load cards", err));
  }, []);

  // Extract unique expansions (prefix before hyphen)
  const expansions = Array.from(new Set(cards.map(c => c.id.split('-')[0]))).sort();

  const filteredCards = cards.filter(c => {
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

    return true;
  });
  const paginatedCards = filteredCards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredCards.length / PAGE_SIZE) || 1;

  const addToDeck = (card: CardData, isEvolve: boolean) => {
    if (isEvolve) {
      if (evolveDeck.length < 10) setEvolveDeck([...evolveDeck, card]);
    } else {
      if (mainDeck.length < 50) setMainDeck([...mainDeck, card]);
    }
  };

  const removeFromDeck = (index: number, isEvolve: boolean) => {
    if (isEvolve) {
      setEvolveDeck(evolveDeck.filter((_, i) => i !== index));
    } else {
      setMainDeck(mainDeck.filter((_, i) => i !== index));
    }
  };

  const exportDeck = () => {
    const data = JSON.stringify({ deckName, mainDeck, evolveDeck }, null, 2);
    
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
        if (data.mainDeck) setMainDeck(data.mainDeck);
        if (data.evolveDeck) setEvolveDeck(data.evolveDeck);
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
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Cost Filter */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cost:</span>
            {['All', '0', '1', '2', '3', '4', '5', '6', '7+'].map(c => (
              <button
                key={c}
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
        </div>
        
        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              disabled={page === 0} 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="glass-panel"
              style={{ padding: '0.5rem 1rem' }}
            >
              Prev
            </button>
            <span>{page + 1} / {totalPages}</span>
            <button 
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
            {paginatedCards.map((card) => (
              <div key={card.id} className="glass-panel" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <img src={card.image} alt={card.name} style={{ width: '100%', borderRadius: '4px' }} loading="lazy" />
                <p style={{ fontSize: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={card.name}>
                  {card.name}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => addToDeck(card, false)}
                    style={{ flex: 1, padding: '0.25rem', background: 'var(--accent-primary)', borderRadius: '4px', display: 'flex', justifyContent: 'center' }}
                    title="Add to Main Deck"
                  >
                    <Plus size={16} color="#fff" />
                  </button>
                  <button 
                    onClick={() => addToDeck(card, true)}
                    style={{ flex: 1, padding: '0.25rem', background: 'var(--accent-secondary)', borderRadius: '4px', display: 'flex', justifyContent: 'center' }}
                    title="Add to Evolve Deck"
                  >
                    <Plus size={16} color="#fff" /> EVO
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Deck Checklist */}
      <div className="glass-panel" style={{ width: '350px', display: 'flex', flexDirection: 'column', borderRight: 'none', borderTop: 'none', borderBottom: 'none', borderRadius: 0 }}>
        <div style={{ padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              width: '180px',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderBottom = '2px solid var(--brand-accent)'}
            onBlur={(e) => e.target.style.borderBottom = '2px solid transparent'}
            placeholder="Deck Name"
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-overlay)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.875rem' }}>
              <Upload size={14}/> Import
              <input type="file" accept=".json" onChange={handleImportDeck} style={{ display: 'none' }} />
            </label>
            <button 
              onClick={exportDeck}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-surface-elevated)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
            >
              <Download size={14}/> Export
            </button>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Main Deck</span>
            <span style={{ color: mainDeck.length >= 40 ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}>{mainDeck.length}/50</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '2rem' }}>
            {mainDeck.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <button onClick={() => removeFromDeck(i, false)} style={{ color: '#ef4444' }}><Minus size={16} /></button>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Evolve Deck</span>
            <span style={{ color: 'var(--text-muted)' }}>{evolveDeck.length}/10</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {evolveDeck.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <button onClick={() => removeFromDeck(i, true)} style={{ color: '#ef4444' }}><Minus size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilder;
