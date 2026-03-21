import React, { useState, useEffect } from 'react';
import type { CardInstance } from './Card';
import { useTranslation } from 'react-i18next';
import CardArtwork from './CardArtwork';
import type { CardDetailLookup } from '../utils/cardDetails';

export type TopDeckAction = 'hand' | 'revealedHand' | 'field' | 'ex' | 'cemetery' | 'top' | 'bottom';

interface TopDeckModalProps {
  isOpen: boolean;
  cards: CardInstance[];
  cardDetailLookup?: CardDetailLookup;
  handCards?: CardInstance[];
  onConfirm: (results: { cardId: string, action: TopDeckAction, order?: number }[]) => void;
  onCancel: () => void;
}

interface AssignedCard {
  card: CardInstance;
  action: TopDeckAction;
  order?: number;
}

const TopDeckModal: React.FC<TopDeckModalProps> = ({ isOpen, cards, cardDetailLookup = {}, handCards, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [pendingCards, setPendingCards] = useState<CardInstance[]>([]);
  const [assignedCards, setAssignedCards] = useState<AssignedCard[]>([]);
  const [currentAction, setCurrentAction] = useState<TopDeckAction>('top');
  const [isHandOpen, setIsHandOpen] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setPendingCards([...cards]);
      setAssignedCards([]);
      setCurrentAction('field');
    }
  }, [isOpen, cards]);

  if (!isOpen) return null;

  const handleAssign = (card: CardInstance) => {
    setPendingCards(prev => prev.filter(c => c.id !== card.id));
    setAssignedCards(prev => {
      const isDeckBack = currentAction === 'top' || currentAction === 'bottom';
      let order: number | undefined = undefined;
      
      if (isDeckBack) {
        const bucketCount = prev.filter(a => a.action === currentAction).length;
        order = bucketCount + 1;
      }
      
      return [...prev, { card, action: currentAction, order }];
    });
  };

  const handleUnassign = (cardId: string) => {
    const target = assignedCards.find(a => a.card.id === cardId);
    if (!target) return;

    setAssignedCards(prev => {
      const filtered = prev.filter(a => a.card.id !== cardId);
      // Re-order if it was a deck bucket
      if (target.action === 'top' || target.action === 'bottom') {
        let count = 1;
        return filtered.map(a => {
          if (a.action === target.action) {
            return { ...a, order: count++ };
          }
          return a;
        });
      }
      return filtered;
    });
    setPendingCards(prev => [...prev, target.card]);
  };

  const reorderAssignedDeckCards = (action: 'top' | 'bottom', cardId: string, direction: 'backward' | 'forward') => {
    setAssignedCards(prev => {
      const bucket = prev
        .filter(a => a.action === action)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const currentIndex = bucket.findIndex(a => a.card.id === cardId);
      if (currentIndex === -1) return prev;

      const targetIndex = direction === 'backward' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= bucket.length) return prev;

      const reorderedBucket = [...bucket];
      [reorderedBucket[currentIndex], reorderedBucket[targetIndex]] = [reorderedBucket[targetIndex], reorderedBucket[currentIndex]];
      const nextOrderMap = new Map(reorderedBucket.map((entry, index) => [entry.card.id, index + 1]));

      return prev.map(entry => {
        if (entry.action !== action) return entry;
        const nextOrder = nextOrderMap.get(entry.card.id);
        return nextOrder ? { ...entry, order: nextOrder } : entry;
      });
    });
  };

  const getGroup = (action: TopDeckAction) => {
    const group = assignedCards.filter(a => a.action === action);
    if (action === 'top' || action === 'bottom') {
      return [...group].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return group;
  };

  const getConfirmResults = () => {
    const orderedDeckAssignments = assignedCards
      .filter(a => a.action === 'top' || a.action === 'bottom')
      .sort((a, b) => {
        if (a.action !== b.action) return 0;
        return (a.order || 0) - (b.order || 0);
      });
    const nonOrderedAssignments = assignedCards.filter(a => a.action !== 'top' && a.action !== 'bottom');

    return [...nonOrderedAssignments, ...orderedDeckAssignments].map(a => ({
      cardId: a.card.id,
      action: a.action,
      order: a.order,
    }));
  };

  const actionButtons: { id: TopDeckAction; label: string; color: string }[] = [
    { id: 'field', label: t('gameBoard.modals.topDeck.destinations.field'), color: '#f59e0b' },
    { id: 'hand', label: t('gameBoard.modals.topDeck.destinations.hand'), color: '#10b981' },
    { id: 'revealedHand', label: t('gameBoard.modals.topDeck.destinations.revealedHand'), color: '#14b8a6' },
    { id: 'ex', label: t('gameBoard.modals.topDeck.destinations.ex'), color: '#ec4899' },
    { id: 'bottom', label: t('gameBoard.modals.topDeck.destinations.bottom'), color: '#8b5cf6' },
    { id: 'top', label: t('gameBoard.modals.topDeck.destinations.top'), color: '#3b82f6' },
    { id: 'cemetery', label: t('gameBoard.modals.topDeck.destinations.cemetery'), color: '#64748b' },
  ];

  const allAssigned = pendingCards.length === 0;

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
                <div key={card.id} onClick={() => handleAssign(card)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
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
          {/* Results Area - Grid layout for all destinations */}
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
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {group.map(a => (
                      <div key={a.card.id} onClick={() => handleUnassign(a.card.id)} style={{ position: 'relative', cursor: 'pointer' }}>
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
                                aria-label={`${btn.label} order backward for ${a.card.name}`}
                                disabled={(a.order || 0) <= 1}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!orderedAction) return;
                                  reorderAssignedDeckCards(orderedAction, a.card.id, 'backward');
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
                                aria-label={`${btn.label} order forward for ${a.card.name}`}
                                disabled={(a.order || 0) >= group.length}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!orderedAction) return;
                                  reorderAssignedDeckCards(orderedAction, a.card.id, 'forward');
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
              <span>🃏 Your Hand ({handCards.length})</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{isHandOpen ? '▲ hide' : '▼ show'}</span>
            </button>
            {isHandOpen && (
              <div style={{
                display: 'flex', gap: '8px', padding: '0.5rem 2rem 1rem',
                overflowX: 'auto', alignItems: 'flex-end',
              }}>
                {handCards.map(card => (
                  <div key={card.id} style={{ flexShrink: 0 }}>
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
    </div>
  );
};

export default TopDeckModal;
