import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import Card, { type CardInstance } from './Card';
import type { PlayerRole } from '../types/game';

interface Props {
  id: string;
  label: string;
  cards: CardInstance[];
  onTap?: (id: string) => void;
  onModifyCounter?: (id: string, stat: 'atk' | 'hp', delta: number) => void;
  onSendToBottom?: (id: string) => void;
  onBanish?: (id: string) => void;
  onReturnEvolve?: (id: string) => void;
  onCemetery?: (id: string) => void;
  onPlayToField?: (id: string) => void;
  hideCards?: boolean; // e.g. opponent hand
  layout?: 'horizontal' | 'stack';
  isProtected?: boolean; // if true, opponent cannot operate cards in this zone
  viewerRole?: PlayerRole | 'all'; // current player's role
  containerStyle?: React.CSSProperties;
  isDebug?: boolean;
}

const Zone: React.FC<Props> = ({ id, label, cards, onTap, onModifyCounter, onSendToBottom, onBanish, onReturnEvolve, onCemetery, onPlayToField, hideCards, layout = 'horizontal', isProtected, viewerRole, containerStyle, isDebug }) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  const isStack = layout === 'stack';
  const displayLabel = label.replace(/^(My|Opponent|Player 1|Player 2)\s+/, '');

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
        transition: 'var(--transition-fast)',
        ...containerStyle
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -12,
          left: 10,
          zIndex: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          maxWidth: 'calc(100% - 20px)',
          padding: '2px 8px',
          background: 'rgba(17, 24, 39, 0.92)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: '999px',
          boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(6px)',
          pointerEvents: 'none'
        }}
      >
        <span
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0
          }}
        >
          {label} ({cards.length})
        </span>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 'bold',
            color: 'white',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {displayLabel}
        </span>
        <span
          style={{
            flex: '0 0 auto',
            minWidth: '22px',
            padding: '0 6px',
            borderRadius: '999px',
            background: 'rgba(59, 130, 246, 0.24)',
            color: '#bfdbfe',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            textAlign: 'center'
          }}
        >
          {cards.length}
        </span>
      </div>

      {(() => {
        // Only consider a card attached if its parent is also present in THIS zone
        const validAttachedIds = new Set(
          cards.filter(c => c.attachedTo && cards.some(parent => parent.id === c.attachedTo)).map(c => c.id)
        );
        const topLevelCards = cards.filter(c => !validAttachedIds.has(c.id));

        if (isStack && topLevelCards.length > 0) {
          return (
            <div style={{ position: 'relative', width: '100px', height: '140px' }}>
              {topLevelCards.map((card, index) => {
                // To make index 0 (Top card) appear at the absolute top of the stack:
                // 1. Give it the highest zIndex
                // 2. Put it at the last offset (or just correct the offset logic)
                const displayIndex = cards.length - index;
                const stackOffset = Math.min(index, 5) * 2;
                const attachments = cards.filter(c => c.attachedTo === card.id);
                return (
                  <div key={card.id} style={{ position: 'absolute', top: stackOffset, left: stackOffset, zIndex: displayIndex }}>
                    <Card
                      card={card}
                      onTap={onTap}
                      onModifyCounter={onModifyCounter}
                      onSendToBottom={onSendToBottom}
                      onBanish={onBanish}
                      onReturnEvolve={onReturnEvolve}
                      onCemetery={onCemetery}
                      onPlayToField={onPlayToField}
                      isHidden={hideCards}
                      isLocked={isProtected && viewerRole !== 'all' && card.owner !== viewerRole}
                      debugIndex={isDebug ? index : undefined}
                    />
                    {attachments.map((attachedCard, i) => (
                      <div key={attachedCard.id} style={{ position: 'absolute', top: (i + 1) * 20, left: (i + 1) * 15, zIndex: index + 10 + i }}>
                        <Card
                          card={attachedCard}
                          onTap={onTap}
                          onModifyCounter={onModifyCounter}
                          onSendToBottom={onSendToBottom}
                          onBanish={onBanish}
                          onReturnEvolve={onReturnEvolve}
                          onCemetery={onCemetery}
                          onPlayToField={onPlayToField}
                          isHidden={hideCards}
                          isLocked={isProtected && viewerRole !== 'all' && attachedCard.owner !== viewerRole}
                          debugIndex={isDebug ? i : undefined}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        }

        return topLevelCards.map((card) => {
          const attachments = cards.filter(c => c.attachedTo === card.id);
          return (
            <div key={card.id} style={{ position: 'relative' }}>
              <Card
                card={card}
                onTap={onTap}
                onModifyCounter={onModifyCounter}
                onSendToBottom={onSendToBottom}
                onBanish={onBanish}
                onReturnEvolve={onReturnEvolve}
                onCemetery={onCemetery}
                onPlayToField={onPlayToField}
                isHidden={hideCards}
                isLocked={isProtected && viewerRole !== 'all' && card.owner !== viewerRole}
                debugIndex={isDebug ? topLevelCards.indexOf(card) : undefined}
              />
              {attachments.map((attachedCard, i) => (
                <div key={attachedCard.id} style={{ position: 'absolute', top: (i + 1) * 20, left: (i + 1) * 15, zIndex: 10 + i }}>
                  <Card
                    card={attachedCard}
                    onTap={onTap}
                    onModifyCounter={onModifyCounter}
                    onSendToBottom={onSendToBottom}
                    onBanish={onBanish}
                    onReturnEvolve={onReturnEvolve}
                    onCemetery={onCemetery}
                    onPlayToField={onPlayToField}
                    isHidden={hideCards}
                    isLocked={isProtected && viewerRole !== 'all' && attachedCard.owner !== viewerRole}
                    debugIndex={isDebug ? i : undefined}
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
