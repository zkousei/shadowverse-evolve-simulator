import React from 'react';
import type { CardInstance } from './Card';
import CardArtwork from './CardArtwork';
import type { CardDetailLookup } from '../utils/cardDetails';

type GameBoardMulliganDialogProps = {
  isOpen: boolean;
  title: string;
  instructions: string;
  disclaimer: string;
  cards: CardInstance[];
  mulliganOrder: string[];
  cardDetailLookup: CardDetailLookup;
  cancelLabel: string;
  confirmLabel: string;
  onSelectCard: (cardId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const GameBoardMulliganDialog: React.FC<GameBoardMulliganDialogProps> = ({
  isOpen,
  title,
  instructions,
  disclaimer,
  cards,
  mulliganOrder,
  cardDetailLookup,
  cancelLabel,
  confirmLabel,
  onSelectCard,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '800px',
          width: '90%',
          textAlign: 'center',
          border: '1px solid var(--border-light)',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>{title}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {instructions}<br />
          {disclaimer}
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {cards.map((card) => {
            const selectionIndex = mulliganOrder.indexOf(card.id);
            return (
              <div
                key={card.id}
                onClick={() => onSelectCard(card.id)}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  border: selectionIndex !== -1 ? '3px solid var(--accent-primary)' : '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px',
                  transition: 'all 0.2s',
                  transform: selectionIndex !== -1 ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: selectionIndex !== -1 ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none',
                }}
              >
                <CardArtwork
                  image={card.image}
                  alt={card.name}
                  detail={cardDetailLookup[card.cardId]}
                  baseCardType={card.baseCardType}
                  isLeaderCard={card.isLeaderCard}
                  isTokenCard={card.isTokenCard}
                  isEvolveCard={card.isEvolveCard}
                  style={{ width: '120px', height: '168px', borderRadius: '4px' }}
                  draggable={false}
                />
                {selectionIndex !== -1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '-10px',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                    }}
                  >
                    {selectionIndex + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--border-light)',
              color: 'var(--text-main)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={mulliganOrder.length !== 4}
            style={{
              padding: '0.6rem 2rem',
              background: mulliganOrder.length === 4 ? 'var(--vivid-green-cyan)' : 'var(--bg-surface-elevated)',
              color: mulliganOrder.length === 4 ? 'black' : 'var(--text-muted)',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '4px',
              cursor: mulliganOrder.length === 4 ? 'pointer' : 'not-allowed',
              boxShadow: mulliganOrder.length === 4 ? '0 0 10px rgba(0, 208, 132, 0.3)' : 'none',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameBoardMulliganDialog;
