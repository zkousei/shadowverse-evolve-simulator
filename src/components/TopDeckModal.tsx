import React, { useState, useEffect } from 'react';
import type { CardInstance } from './Card';

export type TopDeckAction = 'hand' | 'field' | 'ex' | 'cemetery' | 'top' | 'bottom';

interface TopDeckModalProps {
  isOpen: boolean;
  cards: CardInstance[];
  onConfirm: (results: { cardId: string, action: TopDeckAction, order?: number }[]) => void;
  onCancel: () => void;
}

interface AssignedCard {
  card: CardInstance;
  action: TopDeckAction;
  order?: number;
}

const TopDeckModal: React.FC<TopDeckModalProps> = ({ isOpen, cards, onConfirm, onCancel }) => {
  const [pendingCards, setPendingCards] = useState<CardInstance[]>([]);
  const [assignedCards, setAssignedCards] = useState<AssignedCard[]>([]);
  const [currentAction, setCurrentAction] = useState<TopDeckAction>('top');

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

  const getGroup = (action: TopDeckAction) => assignedCards.filter(a => a.action === action);

  const actionButtons: { id: TopDeckAction; label: string; color: string }[] = [
    { id: 'field', label: '場 (Field)', color: '#f59e0b' },
    { id: 'hand', label: '手札 (Hand)', color: '#10b981' },
    { id: 'ex', label: 'EXエリア', color: '#ec4899' },
    { id: 'bottom', label: '山下 (Bottom)', color: '#8b5cf6' },
    { id: 'top', label: '山上 (Top)', color: '#3b82f6' },
    { id: 'cemetery', label: '墓地 (Grave)', color: '#64748b' },
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
            <h2 style={{ margin: 0, color: '#f0f6fc', fontSize: '1.3rem', fontWeight: 'bold' }}>Look Top {cards.length} Cards</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#8b949e' }}>
              カードをタップして「{actionButtons.find(b => b.id === currentAction)?.label}」に仕分けてください。
            </p>
          </div>
          <button onClick={onCancel} style={{ background: '#30363d', border: 'none', color: '#c9d1d9', padding: '0.5rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
        </div>

        {/* Action Toggle */}
        <div style={{ display: 'flex', gap: '8px', padding: '1rem 2rem', background: '#0d1117', borderBottom: '1px solid #21262d', flexWrap: 'wrap' }}>
          <span style={{ alignSelf: 'center', fontSize: '0.9rem', color: '#8b949e', marginRight: '8px' }}>Assign to:</span>
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
              PENDING CARDS (未処理)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', minHeight: '180px', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #30363d' }}>
              {pendingCards.map(card => (
                <div key={card.id} onClick={() => handleAssign(card)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                  <img src={card.image} alt={card.name} style={{ width: '120px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} />
                </div>
              ))}
              {pendingCards.length === 0 && <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontStyle: 'italic' }}>All cards assigned.</div>}
            </div>
          </section>

          {/* Results Area */}
          {/* Results Area - Grid layout for all destinations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            {actionButtons.map(btn => {
              const group = getGroup(btn.id);
              const isOrdered = btn.id === 'top' || btn.id === 'bottom';
              
              return (
                <div key={btn.id} style={{ 
                  background: isOrdered ? (btn.id === 'top' ? 'rgba(56, 139, 253, 0.05)' : 'rgba(137, 87, 229, 0.05)') : 'rgba(255,255,255,0.02)', 
                  border: `1px solid ${isOrdered ? (btn.id === 'top' ? '#38434d' : '#423a4d') : '#30363d'}`,
                  padding: '1.2rem', borderRadius: '12px', minHeight: '140px'
                }}>
                  <h4 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', color: isOrdered ? (btn.id === 'top' ? '#58a6ff' : '#bc8cff') : '#c9d1d9' }}>
                    <span>{btn.label}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Tap card to return</span>
                  </h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {group.map(a => (
                      <div key={a.card.id} onClick={() => handleUnassign(a.card.id)} style={{ position: 'relative', cursor: 'pointer' }}>
                        <img src={a.card.image} style={{ height: isOrdered ? '90px' : '75px', borderRadius: '6px', border: currentAction === btn.id ? `2px solid ${btn.color}` : 'none' }} />
                        {isOrdered && (
                          <div style={{
                            position: 'absolute', bottom: '-6px', right: '-6px', 
                            background: btn.color,
                            color: 'white', width: '20px', height: '20px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #0d1117'
                          }}>
                            {a.order}
                          </div>
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
                    {group.length === 0 && <div style={{ fontSize: '0.8rem', color: '#484f58', display: 'flex', alignItems: 'center' }}>Empty</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1.5rem 2rem', background: '#161b22', borderTop: '1px solid #30363d', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#8b949e', fontSize: '0.9rem' }}>
            {!allAssigned ? `Remaining: ${pendingCards.length} cards` : 'All cards organized.'}
          </div>
          <button
            disabled={!allAssigned}
            onClick={() => onConfirm(assignedCards.map(a => ({ cardId: a.card.id, action: a.action, order: a.order })))}
            style={{
              background: allAssigned ? '#238636' : '#21262d',
              color: allAssigned ? '#fff' : '#484f58',
              fontWeight: 'bold', padding: '0.8rem 3.5rem', borderRadius: '10px', border: 'none',
              cursor: allAssigned ? 'pointer' : 'not-allowed', fontSize: '1.1rem',
              transition: 'all 0.2s',
              boxShadow: allAssigned ? '0 4px 15px rgba(35, 134, 54, 0.4)' : 'none'
            }}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopDeckModal;
