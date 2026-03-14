import React from 'react';
import type { CardInstance } from './Card';

interface CardSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cards: CardInstance[];
  onExtractCard: (cardId: string) => void;
  onToggleFlip?: (cardId: string) => void;
}

const CardSearchModal: React.FC<CardSearchModalProps> = ({ isOpen, onClose, title, cards, onExtractCard, onToggleFlip }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        backgroundColor: '#1a1d24', // Fallback for bg-card
        width: '100%', maxWidth: '900px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="Garamond" style={{ margin: 0 }}>{title} ({cards.length})</h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--border-color)', color: 'white',
            padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'
          }}>Close</button>
        </div>

        <div style={{
          padding: '1.5rem', overflowY: 'auto', flex: 1,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem'
        }}>
          {cards.map(c => {
            const isEvolveDeck = title.includes('Evolve');
            const isUsed = isEvolveDeck && !c.isFlipped;
            
            return (
              <div key={c.id} className="search-card-container" style={{ position: 'relative', opacity: isUsed ? 0.6 : 1, transition: 'opacity 0.1s' }}>
                <img 
                  src={c.image} 
                  alt={c.name} 
                  style={{ width: '100%', borderRadius: '4px', display: 'block', filter: isUsed ? 'grayscale(80%)' : 'none' }}
                />
                
                {isUsed && (
                  <div style={{ position: 'absolute', top: 5, left: 5, background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 4px', borderRadius: '4px', pointerEvents: 'none' }}>
                    USED (Face-Up)
                  </div>
                )}
                {isEvolveDeck && !isUsed && (
                  <div style={{ position: 'absolute', top: 5, left: 5, background: '#252a34', color: '#949db0', fontSize: '10px', fontWeight: 'bold', border: '1px solid gray', padding: '2px 4px', borderRadius: '4px', pointerEvents: 'none' }}>
                    UNUSED (Face-Down)
                  </div>
                )}

                {/* Overlay Controls - Visible on Hover via CSS */}
                <div 
                  className="modal-card-controls"
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', gap: '8px',
                    borderRadius: '4px', padding: '8px'
                  }}
                >
                  <button 
                    onClick={() => onExtractCard(c.id)}
                    style={{
                      width: '100%', background: '#3b82f6', color: 'white', border: 'none',
                      padding: '4px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {c.isEvolveCard ? 'Play to Field' : 'Add to Hand'}
                  </button>
                  
                  {onToggleFlip && c.isEvolveCard && (
                    <button 
                      onClick={() => onToggleFlip(c.id)}
                      style={{
                        width: '100%', background: '#4b5563', color: 'white', border: '1px solid #9ca3af',
                        padding: '4px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {c.isFlipped ? 'Set USED (Face-up)' : 'Set UNUSED (Face-down)'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {cards.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              This zone is empty.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardSearchModal;
