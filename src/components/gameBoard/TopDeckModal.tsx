import React, { useState } from 'react';
import './TopDeckModal.css';
import type { CardInstance } from '../Card';
import { useTranslation } from 'react-i18next';
import CardArtwork from '../CardArtwork';
import type { CardDetailLookup } from '../../utils/card/cardDetails';
import {
  useTopDeckAssignments,
  type TopDeckAction,
} from './useTopDeckAssignments';
import TopDeckHoverPreview from './TopDeckHoverPreview';
import { getTopDeckHoverPreviewPosition } from './topDeckHoverPosition';
import TopDeckDestinationColumns, {
  type ActionButtonConfig,
} from './TopDeckDestinationColumns';

export type { TopDeckAction };

export interface TopDeckModalProps {
  isOpen: boolean;
  cards: CardInstance[];
  cardDetailLookup?: CardDetailLookup;
  handCards?: CardInstance[];
  onConfirm: (results: { cardId: string, action: TopDeckAction, order?: number }[]) => void;
  onCancel: () => void;
}

type HoveredTopDeckCard = {
  card: CardInstance;
  left: number;
  top: number;
};

const TopDeckModal: React.FC<TopDeckModalProps> = ({
  isOpen,
  cards,
  cardDetailLookup = {},
  handCards,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [isHandOpen, setIsHandOpen] = useState(true);
  const [hoveredTopDeckCard, setHoveredTopDeckCard] = useState<HoveredTopDeckCard | null>(null);

  const {
    pendingCards,
    selectedCardIds,
    toggleSelection,
    assignSelected,
    canUnassignSelected,
    unassignSelected,
    canConfirm,
    canUndoLastAssignment,
    undoLastAssignment,
    isBottomOrderRandomized,
    setIsBottomOrderRandomized,
    reorderAssignedDeckCards,
    getGroup,
    getConfirmResults,
    allAssigned,
  } = useTopDeckAssignments({
    isOpen,
    cards,
    onAssignmentChange: () => setHoveredTopDeckCard(null),
  });

  if (!isOpen) return null;

  const showTopDeckCardPreview = (card: CardInstance, event: React.MouseEvent) => {
    setHoveredTopDeckCard({
      card,
      ...getTopDeckHoverPreviewPosition(event.clientX, event.clientY),
    });
  };

  const moveTopDeckCardPreview = (card: CardInstance, event: React.MouseEvent) => {
    setHoveredTopDeckCard({
      card,
      ...getTopDeckHoverPreviewPosition(event.clientX, event.clientY),
    });
  };

  const hideTopDeckCardPreview = () => {
    setHoveredTopDeckCard(null);
  };

  const actionButtons: ActionButtonConfig[] = [
    { id: 'field', label: t('gameBoard.modals.topDeck.destinations.field'), color: '#f59e0b' },
    { id: 'hand', label: t('gameBoard.modals.topDeck.destinations.hand'), color: '#10b981' },
    { id: 'revealedHand', label: t('gameBoard.modals.topDeck.destinations.revealedHand'), color: '#14b8a6' },
    { id: 'ex', label: t('gameBoard.modals.topDeck.destinations.ex'), color: '#ec4899' },
    { id: 'bottom', label: t('gameBoard.modals.topDeck.destinations.bottom'), color: '#8b5cf6' },
    { id: 'top', label: t('gameBoard.modals.topDeck.destinations.top'), color: '#3b82f6' },
    { id: 'cemetery', label: t('gameBoard.modals.topDeck.destinations.cemetery'), color: '#64748b' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 6000, padding: '1.5rem'
    }}>
      <div style={{
        background: '#0d1117', borderRadius: '20px', width: '100%', maxWidth: '1200px',
        maxHeight: '96vh', display: 'flex', flexDirection: 'column', border: '1px solid #30363d',
        boxShadow: '0 0 60px rgba(0,0,0,0.8)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '1rem 2rem', background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#f0f6fc', fontSize: '1.3rem', fontWeight: 'bold' }}>{t('gameBoard.modals.topDeck.title', { count: cards.length })}</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#8b949e' }}>
              {t('gameBoard.modals.topDeck.instruction')}
            </p>
          </div>
          <button onClick={onCancel} style={{ background: '#30363d', border: 'none', color: '#c9d1d9', padding: '0.5rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{t('common.buttons.cancel')}</button>
        </div>

        {/* Content Area */}
        <div data-testid="top-deck-content" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Pending Cards */}
          {allAssigned ? (
            <section aria-live="polite" style={{ flexShrink: 0, color: '#8b949e', fontSize: '0.9rem' }}>
              {t('gameBoard.modals.topDeck.allAssignedInline')}
            </section>
          ) : (
            <section style={{ flexShrink: 0 }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#8b949e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
                {t('gameBoard.modals.topDeck.pendingCards')}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', minHeight: '180px', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #30363d' }}>
                {pendingCards.map(card => (
                  <button
                    type="button"
                    className="top-deck-card-option"
                    key={card.id}
                    aria-label={card.name}
                    aria-pressed={selectedCardIds.includes(card.id)}
                    onClick={() => toggleSelection(card)}
                    onMouseEnter={(event) => showTopDeckCardPreview(card, event)}
                    onMouseMove={(event) => moveTopDeckCardPreview(card, event)}
                    onMouseLeave={hideTopDeckCardPreview}
                    style={{
                      position: 'relative', padding: 0, border: 'none', background: 'none',
                      borderRadius: '8px', cursor: 'pointer',
                      boxShadow: selectedCardIds.includes(card.id) ? '0 0 0 3px #58a6ff' : undefined,
                      transition: 'box-shadow 0.2s',
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
                      style={{ width: '120px', height: '168px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                      draggable={false}
                    />
                    {selectedCardIds.includes(card.id) && (
                      <span style={{ position: 'absolute', top: '4px', right: '4px', background: '#1f6feb', color: '#fff', borderRadius: '999px', padding: '3px 7px', fontWeight: 'bold' }}>
                        ✓ {selectedCardIds.indexOf(card.id) + 1}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Results Area */}
          <TopDeckDestinationColumns
            actionButtons={actionButtons}
            cardDetailLookup={cardDetailLookup}
            isBottomOrderRandomized={isBottomOrderRandomized}
            setIsBottomOrderRandomized={setIsBottomOrderRandomized}
            getGroup={getGroup}
            selectedCardIds={selectedCardIds}
            onToggleSelection={toggleSelection}
            onReorder={reorderAssignedDeckCards}
            onCardHover={showTopDeckCardPreview}
            onCardMove={moveTopDeckCardPreview}
            onCardLeave={hideTopDeckCardPreview}
          />
        </div>

        {/* Destination controls stay outside the scrollable cards. */}
        {selectedCardIds.length > 0 && (
          <div data-testid="top-deck-destination-actions" style={{ flexShrink: 0, padding: '0.75rem 2rem', background: '#161b22', borderTop: '1px solid #30363d' }}>
            <div aria-live="polite" style={{ color: '#c9d1d9', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
              {t('gameBoard.modals.topDeck.assignSelected', { count: selectedCardIds.length })}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {actionButtons.map(btn => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => assignSelected(btn.id)}
                  style={{
                    background: btn.color,
                    color: '#000',
                    border: 'none', padding: '0.6rem 1rem', borderRadius: '8px',
                    cursor: 'pointer', fontWeight: 'bold',
                  }}
                >
                  {btn.label}
                </button>
              ))}
              <button
                type="button"
                disabled={!canUnassignSelected}
                onClick={unassignSelected}
                style={{ background: '#21262d', color: canUnassignSelected ? '#c9d1d9' : '#6e7681', padding: '0.6rem 1rem', border: '1px solid #30363d', borderRadius: '8px', cursor: canUnassignSelected ? 'pointer' : 'not-allowed' }}
              >
                {t('gameBoard.modals.topDeck.returnToPending')}
              </button>
            </div>
          </div>
        )}

        {/* Hand Reference Strip */}
        {handCards && handCards.length > 0 && (
          <div style={{ flexShrink: 0, background: '#161b22', borderTop: '1px solid #30363d' }}>
            <button
              onClick={() => setIsHandOpen(prev => !prev)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.6rem 2rem', background: 'none', border: 'none', cursor: 'pointer',
                color: '#8b949e', fontSize: '0.8rem', fontWeight: 600,
              }}
            >
              <span>{t('gameBoard.modals.topDeck.yourHand', { count: handCards.length })}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{isHandOpen ? `▲ ${t('gameBoard.modals.topDeck.hide')}` : `▼ ${t('gameBoard.modals.topDeck.show')}`}</span>
            </button>
            {isHandOpen && (
              <div style={{
                display: 'flex', gap: '8px', padding: '0.5rem 2rem 1rem',
                overflowX: 'auto', alignItems: 'flex-end',
              }}>
                {handCards.map(card => (
                  <div
                    key={card.id}
                    onMouseEnter={(event) => showTopDeckCardPreview(card, event)}
                    onMouseMove={(event) => moveTopDeckCardPreview(card, event)}
                    onMouseLeave={hideTopDeckCardPreview}
                    style={{ flexShrink: 0 }}
                  >
                    <CardArtwork
                      image={card.image}
                      alt={card.name}
                      detail={cardDetailLookup[card.cardId]}
                      baseCardType={card.baseCardType}
                      isLeaderCard={card.isLeaderCard}
                      isTokenCard={card.isTokenCard}
                      isEvolveCard={card.isEvolveCard}
                      style={{ width: '64px', height: '90px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '1.5rem 2rem', background: '#161b22', borderTop: '1px solid #30363d', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#8b949e', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', textAlign: 'left' }}>
            <span aria-live="polite">
              {!allAssigned ? t('gameBoard.modals.topDeck.remaining', { count: pendingCards.length }) : t('gameBoard.modals.topDeck.allOrganized')}
            </span>
            <button
              type="button"
              disabled={!canUndoLastAssignment}
              onClick={undoLastAssignment}
              style={{
                background: canUndoLastAssignment ? '#30363d' : '#21262d',
                color: canUndoLastAssignment ? '#c9d1d9' : '#6e7681',
                padding: '0.45rem 0.75rem', border: '1px solid #30363d', borderRadius: '8px',
                fontSize: '0.8rem', cursor: canUndoLastAssignment ? 'pointer' : 'not-allowed',
              }}
            >
              {t('gameBoard.modals.topDeck.undoLastAssignment')}
            </button>
          </div>
          <button
            disabled={!canConfirm}
            onClick={() => { if (canConfirm) onConfirm(getConfirmResults()); }}
            style={{
              background: canConfirm ? '#238636' : '#21262d',
              color: canConfirm ? '#fff' : '#484f58',
              fontWeight: 'bold', padding: '0.8rem 3.5rem', borderRadius: '10px', border: 'none',
              cursor: canConfirm ? 'pointer' : 'not-allowed', fontSize: '1.1rem',
              transition: 'all 0.2s',
              boxShadow: canConfirm ? '0 4px 15px rgba(35, 134, 54, 0.4)' : 'none'
            }}
          >
            {t('common.buttons.confirm')}
          </button>
        </div>
      </div>
      {hoveredTopDeckCard && (
        <TopDeckHoverPreview
          card={hoveredTopDeckCard.card}
          cardDetailLookup={cardDetailLookup}
          left={hoveredTopDeckCard.left}
          top={hoveredTopDeckCard.top}
        />
      )}
    </div>
  );
};

export default TopDeckModal;
