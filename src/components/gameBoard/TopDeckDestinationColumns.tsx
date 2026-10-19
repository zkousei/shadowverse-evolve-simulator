import React from 'react';
import type { CardInstance } from '../Card';
import { useTranslation } from 'react-i18next';
import CardArtwork from '../CardArtwork';
import type { CardDetailLookup } from '../../utils/card/cardDetails';
import type { TopDeckAction, AssignedCard } from './useTopDeckAssignments';

export interface ActionButtonConfig {
  id: TopDeckAction;
  label: string;
  color: string;
}

export interface TopDeckDestinationColumnsProps {
  actionButtons: ActionButtonConfig[];
  currentAction: TopDeckAction;
  cardDetailLookup?: CardDetailLookup;
  isBottomOrderRandomized: boolean;
  setIsBottomOrderRandomized: (value: boolean) => void;
  getGroup: (action: TopDeckAction) => AssignedCard[];
  onUnassign: (cardId: string) => void;
  onReorder: (action: 'top' | 'bottom', cardId: string, direction: 'backward' | 'forward') => void;
  onCardHover: (card: CardInstance, event: React.MouseEvent) => void;
  onCardMove: (card: CardInstance, event: React.MouseEvent) => void;
  onCardLeave: () => void;
}

export const TopDeckDestinationColumns: React.FC<TopDeckDestinationColumnsProps> = ({
  actionButtons,
  currentAction,
  cardDetailLookup = {},
  isBottomOrderRandomized,
  setIsBottomOrderRandomized,
  getGroup,
  onUnassign,
  onReorder,
  onCardHover,
  onCardMove,
  onCardLeave,
}) => {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
      {actionButtons.map(btn => {
        const group = getGroup(btn.id);
        const isOrdered = btn.id === 'top' || btn.id === 'bottom';
        const orderedAction: 'top' | 'bottom' | null = isOrdered ? (btn.id as 'top' | 'bottom') : null;

        return (
          <div key={btn.id} style={{
            background: isOrdered ? (btn.id === 'top' ? 'rgba(56, 139, 253, 0.05)' : 'rgba(137, 87, 229, 0.05)') : 'rgba(255,255,255,0.02)',
            border: `1px solid ${isOrdered ? (btn.id === 'top' ? '#38434d' : '#423a4d') : '#30363d'}`,
            padding: '1.2rem', borderRadius: '12px', minHeight: '140px'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', color: isOrdered ? (btn.id === 'top' ? '#58a6ff' : '#bc8cff') : '#c9d1d9' }}>
              <span>{btn.label}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{t('gameBoard.modals.topDeck.tapToReturn')}</span>
            </h4>
            {btn.id === 'bottom' && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  margin: '-0.35rem 0 0.9rem 0',
                  color: '#c9d1d9',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={isBottomOrderRandomized}
                  onChange={(event) => setIsBottomOrderRandomized(event.target.checked)}
                />
                {t('gameBoard.modals.topDeck.randomizeBottom')}
              </label>
            )}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {group.map(a => (
                <div
                  key={a.card.id}
                  onClick={() => onUnassign(a.card.id)}
                  onMouseEnter={(event) => onCardHover(a.card, event)}
                  onMouseMove={(event) => onCardMove(a.card, event)}
                  onMouseLeave={onCardLeave}
                  style={{ position: 'relative', cursor: 'pointer' }}
                >
                  <CardArtwork
                    image={a.card.image}
                    alt={a.card.name}
                    detail={cardDetailLookup[a.card.cardId]}
                    baseCardType={a.card.baseCardType}
                    isLeaderCard={a.card.isLeaderCard}
                    isTokenCard={a.card.isTokenCard}
                    isEvolveCard={a.card.isEvolveCard}
                    style={{ width: isOrdered ? '64px' : '53px', height: isOrdered ? '90px' : '75px', borderRadius: '6px', border: currentAction === btn.id ? `2px solid ${btn.color}` : 'none' }}
                    draggable={false}
                  />
                  {isOrdered && (
                    <>
                      <div style={{
                        position: 'absolute', bottom: '-6px', right: '-6px',
                        background: btn.color,
                        color: 'white', width: '20px', height: '20px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #0d1117'
                      }}>
                        {a.order}
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          gap: '4px',
                          background: 'rgba(13, 17, 23, 0.92)',
                          border: '1px solid #30363d',
                          borderRadius: '999px',
                          padding: '3px 5px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.35)'
                        }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          aria-label={t('gameBoard.modals.topDeck.reorderBackward', { destination: btn.label, card: a.card.name })}
                          disabled={(a.order || 0) <= 1}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!orderedAction) return;
                            onReorder(orderedAction, a.card.id, 'backward');
                          }}
                          style={{
                            border: 'none',
                            background: (a.order || 0) <= 1 ? '#21262d' : '#30363d',
                            color: (a.order || 0) <= 1 ? '#6b7280' : '#f0f6fc',
                            borderRadius: '999px',
                            width: '22px',
                            height: '22px',
                            cursor: (a.order || 0) <= 1 ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            padding: 0
                          }}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          aria-label={t('gameBoard.modals.topDeck.reorderForward', { destination: btn.label, card: a.card.name })}
                          disabled={(a.order || 0) >= group.length}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!orderedAction) return;
                            onReorder(orderedAction, a.card.id, 'forward');
                          }}
                          style={{
                            border: 'none',
                            background: (a.order || 0) >= group.length ? '#21262d' : '#30363d',
                            color: (a.order || 0) >= group.length ? '#6b7280' : '#f0f6fc',
                            borderRadius: '999px',
                            width: '22px',
                            height: '22px',
                            cursor: (a.order || 0) >= group.length ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            padding: 0
                          }}
                        >
                          →
                        </button>
                      </div>
                    </>
                  )}
                  {!isOrdered && (
                    <div style={{
                      position: 'absolute', top: '2px', left: '2px',
                      background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '9px',
                      padding: '1px 4px', borderRadius: '3px'
                    }}>
                      {btn.id.toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {group.length === 0 && <div style={{ fontSize: '0.8rem', color: '#484f58', display: 'flex', alignItems: 'center' }}>{t('gameBoard.modals.topDeck.empty')}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TopDeckDestinationColumns;
