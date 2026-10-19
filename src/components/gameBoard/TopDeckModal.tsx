import React, { useState } from 'react';
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
    currentAction,
    setCurrentAction,
    isBottomOrderRandomized,
    setIsBottomOrderRandomized,
    handleAssign,
    handleUnassign,
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
        <div style={{ padding: '1rem 2rem', background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#f0f6fc', fontSize: '1.3rem', fontWeight: 'bold' }}>{t('gameBoard.modals.topDeck.title', { count: cards.length })}</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#8b949e' }}>
              {t('gameBoard.modals.topDeck.instruction', { destination: actionButtons.find(b => b.id === currentAction)?.label })}
            </p>
          </div>
          <button onClick={onCancel} style={{ background: '#30363d', border: 'none', color: '#c9d1d9', padding: '0.5rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{t('common.buttons.cancel')}</button>
        </div>

        {/* Action Toggle */}
        <div style={{ display: 'flex', gap: '8px', padding: '1rem 2rem', background: '#0d1117', borderBottom: '1px solid #21262d', flexWrap: 'wrap' }}>
          <span style={{ alignSelf: 'center', fontSize: '0.9rem', color: '#8b949e', marginRight: '8px' }}>{t('gameBoard.modals.topDeck.assignTo')}</span>
          {actionButtons.map(btn => (
            <button
              key={btn.id}
              onClick={() => setCurrentAction(btn.id)}
              style={{
                background: currentAction === btn.id ? btn.color : '#21262d',
                color: currentAction === btn.id ? '#000' : '#c9d1d9',
                border: 'none', padding: '0.6rem 1.2rem', borderRadius: '30px', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.2s',
                boxShadow: currentAction === btn.id ? `0 0 15px ${btn.color}66` : 'none'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

          {/* Pending Cards */}
          <section>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#8b949e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
              {t('gameBoard.modals.topDeck.pendingCards')}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', minHeight: '180px', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #30363d' }}>
              {pendingCards.map(card => (
                <div
                  key={card.id}
                  onClick={() => handleAssign(card)}
                  onMouseEnter={(event) => showTopDeckCardPreview(card, event)}
                  onMouseMove={(event) => moveTopDeckCardPreview(card, event)}
                  onMouseLeave={hideTopDeckCardPreview}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
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
                </div>
              ))}
              {pendingCards.length === 0 && <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontStyle: 'italic' }}>{t('gameBoard.modals.topDeck.allAssignedInline')}</div>}
            </div>
          </section>

          {/* Results Area */}
          <TopDeckDestinationColumns
            actionButtons={actionButtons}
            currentAction={currentAction}
            cardDetailLookup={cardDetailLookup}
            isBottomOrderRandomized={isBottomOrderRandomized}
            setIsBottomOrderRandomized={setIsBottomOrderRandomized}
            getGroup={getGroup}
            onUnassign={handleUnassign}
            onReorder={reorderAssignedDeckCards}
            onCardHover={showTopDeckCardPreview}
            onCardMove={moveTopDeckCardPreview}
            onCardLeave={hideTopDeckCardPreview}
          />
        </div>

        {/* Hand Reference Strip */}
        {handCards && handCards.length > 0 && (
          <div style={{ background: '#161b22', borderTop: '1px solid #30363d' }}>
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
        <div style={{ padding: '1.5rem 2rem', background: '#161b22', borderTop: '1px solid #30363d', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#8b949e', fontSize: '0.9rem' }}>
            {!allAssigned ? t('gameBoard.modals.topDeck.remaining', { count: pendingCards.length }) : t('gameBoard.modals.topDeck.allOrganized')}
          </div>
          <button
            disabled={!allAssigned}
            onClick={() => onConfirm(getConfirmResults())}
            style={{
              background: allAssigned ? '#238636' : '#21262d',
              color: allAssigned ? '#fff' : '#484f58',
              fontWeight: 'bold', padding: '0.8rem 3.5rem', borderRadius: '10px', border: 'none',
              cursor: allAssigned ? 'pointer' : 'not-allowed', fontSize: '1.1rem',
              transition: 'all 0.2s',
              boxShadow: allAssigned ? '0 4px 15px rgba(35, 134, 54, 0.4)' : 'none'
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
