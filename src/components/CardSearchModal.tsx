import React from 'react';
import type { CardInstance } from './Card';

interface CardSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cards: CardInstance[];
  onExtractCard: (cardId: string) => void;
}

const CardSearchModal: React.FC<CardSearchModalProps> = ({ isOpen, onClose, title, cards, onExtractCard }) => {
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
        width: '100%', maxWidth: '900px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column'
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
              <div key={c.id} style={{ position: 'relative', cursor: 'pointer', opacity: isUsed ? 0.6 : 1 }} onClick={() => onExtractCard(c.id)}>
                <img 
                  src={c.image} 
                  alt={c.name} 
                  style={{ width: '100%', borderRadius: '4px', display: 'block', filter: isUsed ? 'grayscale(80%)' : 'none' }}
                />
                {isUsed && (
                  <div style={{ position: 'absolute', top: 5, left: 5, background: 'var(--vivid-red)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 4px', borderRadius: '4px' }}>
                    USED (Face-Up)
                  </div>
                )}
                {isEvolveDeck && !isUsed && (
                  <div style={{ position: 'absolute', top: 5, left: 5, background: 'var(--bg-surface-elevated)', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 'bold', border: '1px solid gray', padding: '2px 4px', borderRadius: '4px' }}>
                    UNUSED (Face-Down)
                  </div>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.8)', color: 'white',
                  padding: '0.4rem', fontSize: '0.8rem', textAlign: 'center',
                  opacity: 0, transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  Click to Extract
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
