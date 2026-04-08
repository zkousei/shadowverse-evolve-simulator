import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import Card, { type CardInspectAnchor, type CardInstance } from './Card';
import type { PlayerRole } from '../types/game';
import type { CardStatLookup } from '../utils/cardStats';
import type { CardDetailLookup } from '../utils/cardDetails';

interface Props {
  id: string;
  label: string;
  cards: CardInstance[];
  cardStatLookup?: CardStatLookup;
  cardDetailLookup?: CardDetailLookup;
  onInspectCard?: (card: CardInstance, anchor: CardInspectAnchor) => void;
  onAttack?: (id: string) => void;
  onTap?: (id: string) => void;
  onModifyCounter?: (id: string, stat: 'atk' | 'hp', delta: number) => void;
  onModifyGenericCounter?: (id: string, delta: number) => void;
  onSendToBottom?: (id: string) => void;
  onBanish?: (id: string) => void;
  onReturnEvolve?: (id: string) => void;
  onCemetery?: (id: string) => void;
  onPlayToField?: (id: string) => void;
  hideCards?: boolean; // e.g. opponent hand
  layout?: 'horizontal' | 'stack';
  isProtected?: boolean; // if true, opponent cannot operate cards in this zone
  lockCards?: boolean; // if true, disable drag and quick controls for cards in this zone
  disableQuickActionsForCard?: (card: CardInstance) => boolean;
  getHighlightTone?: (card: CardInstance) => 'attack-source' | 'attack-target' | undefined;
  viewerRole?: PlayerRole | 'all' | 'spectator'; // current player's role or read-only spectator
  containerStyle?: React.CSSProperties;
  isDebug?: boolean;
}

const Zone: React.FC<Props> = ({ id, label, cards, cardStatLookup, cardDetailLookup, onInspectCard, onAttack, onTap, onModifyCounter, onModifyGenericCounter, onSendToBottom, onBanish, onReturnEvolve, onCemetery, onPlayToField, hideCards, layout = 'horizontal', isProtected, lockCards, disableQuickActionsForCard, getHighlightTone, viewerRole, containerStyle, isDebug }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  const attachmentTopOffset = 20;
  const attachmentLeftOffset = 15;
  const linkedCardTopOffset = 20;
  const linkedCardLeftOffset = 15;
  const linkedCardPaddingBottom = 24;

  const isStack = layout === 'stack';
  const isFieldZone = id.startsWith('field-');
  const isExZone = id.startsWith('ex-');
  const isReadOnlySpectator = viewerRole === 'spectator';

  const displayLabel = label.replace(/^(My|Opponent|Player 1|Player 2|自分|相手|1P|2P)\s+/, '');
  const hasCardOnTop = React.useCallback((cardId: string) => cards.some(card => card.attachedTo === cardId), [cards]);
  const validAttachedIds = new Set(
    cards.filter(c => c.attachedTo && cards.some(parent => parent.id === c.attachedTo)).map(c => c.id)
  );
  const validLinkedIds = new Set(
    cards.filter(c => c.linkedTo && cards.some(parent => parent.id === c.linkedTo)).map(c => c.id)
  );
  const topLevelCards = cards.filter(c => !validAttachedIds.has(c.id) && !validLinkedIds.has(c.id));

  const renderLinkedCards = React.useCallback((linkedCards: CardInstance[], attachmentCount: number) => {
    if (linkedCards.length === 0) return null;

    const baseTopOffset = linkedCardTopOffset + (attachmentCount * attachmentTopOffset);
    const baseLeftOffset = linkedCardLeftOffset + (attachmentCount * attachmentLeftOffset);

    return linkedCards.map((linkedCard, index) => (
      <div
        key={linkedCard.id}
        style={{
          position: 'absolute',
          top: baseTopOffset + (index * linkedCardTopOffset),
          left: baseLeftOffset + (index * linkedCardLeftOffset),
          zIndex: 0,
        }}
      >
        <Card
          card={linkedCard}
          baseStats={cardStatLookup?.[linkedCard.cardId]}
          detail={cardDetailLookup?.[linkedCard.cardId]}
          highlightTone={getHighlightTone?.(linkedCard)}
          onInspect={onInspectCard}
          onSendToBottom={linkedCard.isTokenCard ? onSendToBottom : undefined}
          onBanish={linkedCard.isTokenCard ? onBanish : undefined}
          onReturnEvolve={onReturnEvolve}
          onCemetery={linkedCard.isTokenCard ? onCemetery : undefined}
          isHidden={hideCards}
          isLocked={lockCards || isReadOnlySpectator || (isProtected && viewerRole !== 'all' && linkedCard.owner !== viewerRole)}
          quickActionsDisabled={disableQuickActionsForCard?.(linkedCard)}
          disableCombatAndCounterControls={true}
          debugIndex={isDebug ? index : undefined}
        />
      </div>
    ));
  }, [attachmentLeftOffset, attachmentTopOffset, cardDetailLookup, cardStatLookup, disableQuickActionsForCard, getHighlightTone, hideCards, isDebug, isProtected, isReadOnlySpectator, linkedCardLeftOffset, linkedCardTopOffset, lockCards, onBanish, onCemetery, onInspectCard, onReturnEvolve, onSendToBottom, viewerRole]);

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
        gap: isStack ? '0.5rem' : isFieldZone ? '1.9rem' : isExZone ? '1rem' : '0.5rem',
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
          {label} ({topLevelCards.length})
        </span>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 'bold',
            color: 'white',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
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
          {topLevelCards.length}
        </span>
      </div>

      {(() => {
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
                const linkedCards = cards.filter(c => c.linkedTo === card.id);
                return (
                  <div
                    key={card.id}
                    style={{
                      position: 'absolute',
                      top: stackOffset,
                      left: stackOffset,
                      zIndex: displayIndex,
                      paddingBottom: linkedCards.length > 0
                        ? linkedCardPaddingBottom + (attachments.length * attachmentTopOffset) + ((linkedCards.length - 1) * linkedCardTopOffset)
                        : undefined,
                    }}
                  >
                    <Card
                      card={card}
                      baseStats={cardStatLookup?.[card.cardId]}
                      detail={cardDetailLookup?.[card.cardId]}
                      hideCurrentStats={attachments.length > 0}
                      highlightTone={getHighlightTone?.(card)}
                      onInspect={onInspectCard}
                      onAttack={onAttack}
                      onTap={onTap}
                      onModifyCounter={onModifyCounter}
                      onModifyGenericCounter={onModifyGenericCounter}
                      onSendToBottom={onSendToBottom}
                      onBanish={onBanish}
                      onReturnEvolve={onReturnEvolve}
                      onCemetery={onCemetery}
                      onPlayToField={onPlayToField}
                      isHidden={hideCards}
                      isLocked={lockCards || isReadOnlySpectator || (isProtected && viewerRole !== 'all' && card.owner !== viewerRole)}
                      quickActionsDisabled={disableQuickActionsForCard?.(card)}
                      disableCombatAndCounterControls={hasCardOnTop(card.id)}
                      debugIndex={isDebug ? index : undefined}
                    />
                    {renderLinkedCards(linkedCards, attachments.length)}
                    {attachments.map((attachedCard, i) => (
                      <div key={attachedCard.id} style={{ position: 'absolute', top: (i + 1) * attachmentTopOffset, left: (i + 1) * attachmentLeftOffset, zIndex: index + 10 + i }}>
                        <Card
                          card={attachedCard}
                          baseStats={cardStatLookup?.[attachedCard.cardId]}
                          detail={cardDetailLookup?.[attachedCard.cardId]}
                          displayCounters={{
                            atk: card.counters.atk + attachedCard.counters.atk,
                            hp: card.counters.hp + attachedCard.counters.hp,
                          }}
                          highlightTone={getHighlightTone?.(attachedCard)}
                          onInspect={onInspectCard}
                          onAttack={onAttack}
                          onTap={onTap}
                          onModifyCounter={onModifyCounter}
                          onModifyGenericCounter={onModifyGenericCounter}
                          onSendToBottom={onSendToBottom}
                          onBanish={onBanish}
                          onReturnEvolve={onReturnEvolve}
                          onCemetery={onCemetery}
                          onPlayToField={onPlayToField}
                          isHidden={hideCards}
                          isLocked={lockCards || isReadOnlySpectator || (isProtected && viewerRole !== 'all' && attachedCard.owner !== viewerRole)}
                          quickActionsDisabled={disableQuickActionsForCard?.(attachedCard)}
                          disableCombatAndCounterControls={hasCardOnTop(attachedCard.id)}
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
          const linkedCards = cards.filter(c => c.linkedTo === card.id);
          return (
            <div
              key={card.id}
              style={{
                position: 'relative',
                paddingBottom: linkedCards.length > 0
                  ? linkedCardPaddingBottom + (attachments.length * attachmentTopOffset) + ((linkedCards.length - 1) * linkedCardTopOffset)
                  : undefined,
              }}
            >
              <Card
                card={card}
                baseStats={cardStatLookup?.[card.cardId]}
                detail={cardDetailLookup?.[card.cardId]}
                hideCurrentStats={attachments.length > 0}
                highlightTone={getHighlightTone?.(card)}
                onInspect={onInspectCard}
                onAttack={onAttack}
                onTap={onTap}
                onModifyCounter={onModifyCounter}
                onModifyGenericCounter={onModifyGenericCounter}
                onSendToBottom={onSendToBottom}
                onBanish={onBanish}
                onReturnEvolve={onReturnEvolve}
                onCemetery={onCemetery}
                onPlayToField={onPlayToField}
                isHidden={hideCards}
                isLocked={lockCards || isReadOnlySpectator || (isProtected && viewerRole !== 'all' && card.owner !== viewerRole)}
                quickActionsDisabled={disableQuickActionsForCard?.(card)}
                disableCombatAndCounterControls={hasCardOnTop(card.id)}
                debugIndex={isDebug ? topLevelCards.indexOf(card) : undefined}
              />
              {renderLinkedCards(linkedCards, attachments.length)}
              {attachments.map((attachedCard, i) => (
                <div key={attachedCard.id} style={{ position: 'absolute', top: (i + 1) * attachmentTopOffset, left: (i + 1) * attachmentLeftOffset, zIndex: 10 + i }}>
                  <Card
                    card={attachedCard}
                    baseStats={cardStatLookup?.[attachedCard.cardId]}
                    detail={cardDetailLookup?.[attachedCard.cardId]}
                    displayCounters={{
                      atk: card.counters.atk + attachedCard.counters.atk,
                      hp: card.counters.hp + attachedCard.counters.hp,
                    }}
                    highlightTone={getHighlightTone?.(attachedCard)}
                    onInspect={onInspectCard}
                    onAttack={onAttack}
                    onTap={onTap}
                    onModifyCounter={onModifyCounter}
                    onModifyGenericCounter={onModifyGenericCounter}
                    onSendToBottom={onSendToBottom}
                    onBanish={onBanish}
                    onReturnEvolve={onReturnEvolve}
                    onCemetery={onCemetery}
                    onPlayToField={onPlayToField}
                    isHidden={hideCards}
                    isLocked={lockCards || isReadOnlySpectator || (isProtected && viewerRole !== 'all' && attachedCard.owner !== viewerRole)}
                    quickActionsDisabled={disableQuickActionsForCard?.(attachedCard)}
                    disableCombatAndCounterControls={hasCardOnTop(attachedCard.id)}
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
