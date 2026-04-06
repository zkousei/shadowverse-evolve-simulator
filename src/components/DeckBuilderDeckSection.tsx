import React from 'react';
import { Minus, Plus } from 'lucide-react';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckTargetSection } from '../utils/deckBuilderRules';
import type { DeckDisplayGroup } from '../utils/deckBuilderDisplay';

type DeckBuilderDeckSectionProps = {
  title: string;
  countLabel: React.ReactNode;
  countColor?: string;
  groupedCards: DeckDisplayGroup[];
  targetSection: DeckTargetSection;
  removeTitle: string;
  addTitle?: string;
  canAddCard?: (card: DeckBuilderCardData) => boolean;
  emptyMessage?: string;
  headingMarginTop?: string;
  rowsMarginBottom?: string;
  showCountWhenSingle?: boolean;
  countTextAlign?: 'center' | 'right';
  onRemove: (cardId: string) => void;
  onAdd?: (card: DeckBuilderCardData) => void;
  onCardMouseEnter: (
    card: DeckBuilderCardData,
    event: React.MouseEvent<HTMLDivElement>
  ) => void;
  onCardMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCardMouseLeave: () => void;
};

const DeckBuilderDeckSection: React.FC<DeckBuilderDeckSectionProps> = ({
  title,
  countLabel,
  countColor = 'var(--text-muted)',
  groupedCards,
  targetSection,
  removeTitle,
  addTitle,
  canAddCard,
  emptyMessage,
  headingMarginTop,
  rowsMarginBottom,
  showCountWhenSingle = true,
  countTextAlign = 'center',
  onRemove,
  onAdd,
  onCardMouseEnter,
  onCardMouseMove,
  onCardMouseLeave,
}) => (
  <>
    <h3
      style={{
        marginTop: headingMarginTop,
        marginBottom: '0.5rem',
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      <span>{title}</span>
      <span style={{ color: countColor }}>{countLabel}</span>
    </h3>
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        marginBottom: rowsMarginBottom,
      }}
    >
      {groupedCards.length > 0 ? (
        groupedCards.map(({ card, count }) => {
          const canAdd = onAdd ? (canAddCard ? canAddCard(card) : true) : false;

          return (
            <div
              key={card.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                padding: '0.25rem 0.5rem',
                background: 'var(--bg-surface)',
                borderRadius: '4px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'help',
                  }}
                  onMouseEnter={(event) => onCardMouseEnter(card, event)}
                  onMouseMove={onCardMouseMove}
                  onMouseLeave={onCardMouseLeave}
                >
                  {card.name}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {card.id} {card.cost ? `• Cost ${card.cost}` : ''}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: targetSection === 'leader' ? '0.5rem' : '0.4rem',
                }}
              >
                {(showCountWhenSingle || count > 1) && (
                  <span
                    style={{
                      color: 'var(--text-main)',
                      fontSize: '0.75rem',
                      minWidth: '2rem',
                      textAlign: countTextAlign,
                      fontWeight: 600,
                    }}
                  >
                    × {count}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(card.id)}
                  style={{ color: '#ef4444' }}
                  title={removeTitle}
                >
                  <Minus size={16} />
                </button>
                {onAdd && addTitle && (
                  <button
                    type="button"
                    onClick={() => onAdd(card)}
                    disabled={!canAdd}
                    style={{ color: canAdd ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}
                    title={addTitle}
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })
      ) : emptyMessage ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {emptyMessage}
        </p>
      ) : null}
    </div>
  </>
);

export default DeckBuilderDeckSection;
