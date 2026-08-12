import React from 'react';
import type { CardInstance } from './Card';
import CardArtwork from './CardArtwork';
import type { CardDetailLookup } from '../utils/cardDetails';

type GameBoardHandRevealDialogProps = {
  title: string;
  instructions: string;
  cards: CardInstance[];
  selectedCardIds: string[];
  cardDetailLookup: CardDetailLookup;
  cancelLabel: string;
  confirmLabel: string;
  onToggleCard: (cardId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const GameBoardHandRevealDialog: React.FC<GameBoardHandRevealDialogProps> = ({
  title,
  instructions,
  cards,
  selectedCardIds,
  cardDetailLookup,
  cancelLabel,
  confirmLabel,
  onToggleCard,
  onCancel,
  onConfirm,
}) => {
  const selectedIds = new Set(selectedCardIds);
  const canConfirm = selectedCardIds.length > 0;

  return (
    <div
      role="dialog"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem',
      }}
    >
      <div
        data-testid="hand-reveal-dialog-panel"
        style={{
          background: 'var(--bg-surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '900px',
          width: 'min(92vw, 900px)',
          maxHeight: '88vh',
          overflowY: 'auto',
          textAlign: 'center',
          border: '1px solid var(--border-light)',
        }}
      >
        <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>{title}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{instructions}</p>

        <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {cards.map((card) => {
            const isSelected = selectedIds.has(card.id);
            return (
              <button
                key={card.id}
                type="button"
                aria-label={card.name}
                aria-pressed={isSelected}
                onClick={() => onToggleCard(card.id)}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  border: isSelected ? '3px solid var(--accent-primary)' : '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px',
                  background: isSelected ? 'rgba(59, 130, 246, 0.16)' : 'rgba(15, 23, 42, 0.82)',
                  transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                  transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: isSelected ? '0 0 15px rgba(59, 130, 246, 0.45)' : 'none',
                  width: '132px',
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
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-main)',
                    fontSize: '0.72rem',
                    lineHeight: 1.3,
                    marginTop: '0.35rem',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {card.name}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
            disabled={!canConfirm}
            style={{
              padding: '0.6rem 1.5rem',
              background: canConfirm ? 'var(--vivid-green-cyan)' : 'var(--bg-surface-elevated)',
              color: canConfirm ? 'black' : 'var(--text-muted)',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '4px',
              cursor: canConfirm ? 'pointer' : 'not-allowed',
              boxShadow: canConfirm ? '0 0 10px rgba(0, 208, 132, 0.3)' : 'none',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameBoardHandRevealDialog;
