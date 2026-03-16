import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import Card, { type CardInstance } from './Card';

interface Props {
  id: string;
  label: string;
  cards: CardInstance[];
  onTap?: (id: string) => void;
  onModifyCounter?: (id: string, stat: 'atk' | 'hp', delta: number) => void;
  onFlip?: (id: string) => void;
  onSendToBottom?: (id: string) => void;
  onBanish?: (id: string) => void;
  onReturnEvolve?: (id: string) => void;
  onCemetery?: (id: string) => void;
  hideCards?: boolean; // e.g. opponent hand
  layout?: 'horizontal' | 'stack';
  isProtected?: boolean; // if true, opponent cannot operate cards in this zone
  viewerRole?: 'host' | 'guest'; // current player's role
}

const Zone: React.FC<Props> = ({ id, label, cards, onTap, onModifyCounter, onFlip, onSendToBottom, onBanish, onReturnEvolve, onCemetery, hideCards, layout = 'horizontal', isProtected, viewerRole }) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  const isStack = layout === 'stack';

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minHeight: '160px',
        border: `2px dashed ${isOver ? 'var(--vivid-green-cyan)' : 'var(--border-light)'}`,
        backgroundColor: isOver ? 'rgba(0, 208, 132, 0.1)' : 'rgba(26, 29, 36, 0.5)',
        borderRadius: 'var(--radius-md)',
        padding: '0.5rem',
        position: 'relative',
        display: 'flex',
        flexDirection: isStack ? 'column' : 'row',
        gap: '0.5rem',
        flexWrap: isStack ? 'nowrap' : 'wrap',
        alignItems: isStack ? 'center' : 'flex-start',
        transition: 'var(--transition-fast)'
      }}
    >
      <div style={{ position: 'absolute', top: -10, left: 10, background: 'var(--bg-surface-elevated)', padding: '0 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
        {label} ({cards.length})
      </div>
      
      {(() => {
        // Only consider a card attached if its parent is also present in THIS zone
        const validAttachedIds = new Set(
          cards.filter(c => c.attachedTo && cards.some(parent => parent.id === c.attachedTo)).map(c => c.id)
        );
        const topLevelCards = cards.filter(c => !validAttachedIds.has(c.id));

        return topLevelCards.map((card, index) => {
          // Cap the visual depth of the stack so it doesn't overflow downwards indefinitely
          const stackOffset = Math.min(index, 5) * 2;
          const attachments = cards.filter(c => c.attachedTo === card.id);

          return (
            <div key={card.id} style={isStack ? { position: index === 0 ? 'relative' : 'absolute', top: stackOffset, left: stackOffset } : { position: 'relative' }}>
              <Card 
                card={card} 
                onTap={onTap} 
                onModifyCounter={onModifyCounter}
                onFlip={onFlip}
                onSendToBottom={onSendToBottom}
                onBanish={onBanish}
                onReturnEvolve={onReturnEvolve}
                onCemetery={onCemetery}
                isHidden={hideCards} 
                isLocked={isProtected && card.owner !== viewerRole}
              />
              
              {/* Render Attached Evolve Cards overlaying the base card */}
              {attachments.map((attachedCard, i) => (
                <div key={attachedCard.id} style={{ position: 'absolute', top: (i + 1) * 20, left: (i + 1) * 15, zIndex: 10 + i }}>
                  <Card 
                    card={attachedCard} 
                    onTap={onTap} 
                    onModifyCounter={onModifyCounter}
                    onFlip={onFlip}
                    onSendToBottom={onSendToBottom}
                    onBanish={onBanish}
                    onReturnEvolve={onReturnEvolve}
                    onCemetery={onCemetery}
                    isHidden={hideCards} 
                    isLocked={isProtected && attachedCard.owner !== viewerRole}
                  />
                </div>
              ))}
            </div>
          );
        });
      })()}
    </div>
  );
};

export default Zone;
