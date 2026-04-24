import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import Card, { type CardInspectAnchor, type CardInstance, type CardTapAnchor } from './Card';
import type { PlayerRole } from '../types/game';
import type { CardStatLookup } from '../utils/cardStats';
import type { CardDetailLookup } from '../utils/cardDetails';
import { useGameBoardBoardDensity, useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';
import {
  getCardSizeForInputProfile,
  getExZoneGapForInputProfile,
  getFieldZoneGapForInputProfile,
  getLinkedCardOffsetForInputProfile,
  getStackAttachmentOffsetForInputProfile,
} from '../utils/gameBoardCardLayout';

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
  onCardTapAction?: (card: CardInstance, anchor: CardTapAnchor) => boolean | void;
  onZoneTapAction?: (anchor: CardTapAnchor) => void;
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

const Zone: React.FC<Props> = ({ id, label, cards, cardStatLookup, cardDetailLookup, onInspectCard, onAttack, onTap, onModifyCounter, onModifyGenericCounter, onSendToBottom, onBanish, onReturnEvolve, onCemetery, onPlayToField, onCardTapAction, onZoneTapAction, hideCards, layout = 'horizontal', isProtected, lockCards, disableQuickActionsForCard, getHighlightTone, viewerRole, containerStyle, isDebug }) => {
  const zoneTapPointerStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const inputProfile = useGameBoardInputProfile();
  const boardDensity = useGameBoardBoardDensity();
  const isCompactInput = inputProfile === 'coarse';
  const isFineInput = inputProfile === 'fine';
  const isOverviewDesktop = inputProfile === 'fine' && boardDensity === 'overview';
  const { isOver, setNodeRef } = useDroppable({ id });
  const cardSize = getCardSizeForInputProfile(inputProfile, boardDensity);
  const stackAttachmentOffset = getStackAttachmentOffsetForInputProfile(inputProfile, boardDensity);
  const linkedCardOffset = getLinkedCardOffsetForInputProfile(inputProfile, boardDensity);
  const attachmentTopOffset = stackAttachmentOffset.top;
  const attachmentLeftOffset = stackAttachmentOffset.left;
  const linkedCardTopOffset = linkedCardOffset.top;
  const linkedCardLeftOffset = linkedCardOffset.left;
  const linkedCardPaddingBottom = linkedCardOffset.paddingBottom;

  const isStack = layout === 'stack';
  const isFieldZone = id.startsWith('field-');
  const isExZone = id.startsWith('ex-');
  const shouldDisableZoneQuickActions = id.startsWith('cemetery-') || id.startsWith('banish-');
  const isReadOnlySpectator = viewerRole === 'spectator';
  const zoneLabelChipGap = isCompactInput ? '2px' : isFineInput ? '3px' : isOverviewDesktop ? '4px' : '6px';
  const zoneLabelChipPadding = isCompactInput ? '1px 4px' : isFineInput ? '1px 5px' : isOverviewDesktop ? '1px 6px' : '2px 8px';
  const zoneLabelFontSize = isCompactInput ? '0.5rem' : isFineInput ? '0.56rem' : isOverviewDesktop ? '0.62rem' : '0.68rem';
  const zoneCountMinWidth = isCompactInput ? '16px' : isFineInput ? '17px' : isOverviewDesktop ? '18px' : '22px';
  const zoneCountPadding = isCompactInput ? '0 3px' : isFineInput ? '0 4px' : isOverviewDesktop ? '0 4px' : '0 6px';
  const zoneCountFontSize = isCompactInput ? '0.44rem' : isFineInput ? '0.46rem' : isOverviewDesktop ? '0.62rem' : '0.7rem';

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
          quickActionsDisabled={shouldDisableZoneQuickActions || disableQuickActionsForCard?.(linkedCard)}
          disableCombatAndCounterControls={true}
          onCardTapAction={onCardTapAction}
          debugIndex={isDebug ? index : undefined}
        />
      </div>
    ));
  }, [attachmentLeftOffset, attachmentTopOffset, cardDetailLookup, cardStatLookup, disableQuickActionsForCard, getHighlightTone, hideCards, isDebug, isProtected, isReadOnlySpectator, linkedCardLeftOffset, linkedCardTopOffset, lockCards, onBanish, onCardTapAction, onCemetery, onInspectCard, onReturnEvolve, onSendToBottom, shouldDisableZoneQuickActions, viewerRole]);

  return (
    <div
      ref={setNodeRef}
      data-testid={`zone-${id}`}
      onPointerDownCapture={(event) => {
        if (event.button !== 0) return;
        if (!onZoneTapAction) return;
        if ((event.target as HTMLElement).closest('button')) return;
        zoneTapPointerStartRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUpCapture={(event) => {
        const pointerStart = zoneTapPointerStartRef.current;
        zoneTapPointerStartRef.current = null;
        if (!onZoneTapAction || !pointerStart) return;
        if ((event.target as HTMLElement).closest('button')) return;
        if ((event.target as HTMLElement).closest('[data-card-id]')) return;

        const deltaX = Math.abs(event.clientX - pointerStart.x);
        const deltaY = Math.abs(event.clientY - pointerStart.y);
        if (deltaX > 6 || deltaY > 6) return;

        onZoneTapAction({
          x: event.clientX,
          y: event.clientY,
        });
      }}
      onPointerCancel={() => {
        zoneTapPointerStartRef.current = null;
      }}
      style={{
        flex: 1,
        minHeight: '160px',
        border: `2px dashed ${isOver ? 'var(--vivid-green-cyan)' : 'var(--border-light)'}`,
        backgroundColor: isOver ? 'rgba(0, 208, 132, 0.1)' : 'rgba(26, 29, 36, 0.5)',
        borderRadius: 'var(--radius-md)',
        padding: isCompactInput ? '0.32rem' : '0.5rem',
        position: 'relative',
        display: 'flex',
        flexDirection: isStack ? 'column' : 'row',
        gap: isStack
          ? '0.5rem'
          : isFieldZone
            ? getFieldZoneGapForInputProfile(inputProfile, boardDensity)
            : isExZone
              ? getExZoneGapForInputProfile(inputProfile, boardDensity)
              : '0.5rem',
        flexWrap: isStack ? 'nowrap' : 'wrap',
        alignItems: isStack ? 'center' : 'flex-start',
        transition: 'var(--transition-fast)',
        ...containerStyle
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -6,
          left: isCompactInput ? 7 : 10,
          zIndex: 20,
          display: isCompactInput ? 'grid' : 'inline-flex',
          gridTemplateColumns: isCompactInput ? 'minmax(0, 1fr) auto' : undefined,
          alignItems: 'center',
          gap: zoneLabelChipGap,
          maxWidth: isOverviewDesktop ? 'calc(100% - 12px)' : 'calc(100% - 20px)',
          padding: zoneLabelChipPadding,
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
          title={displayLabel}
          style={{
            maxWidth: isCompactInput ? '100%' : undefined,
            minWidth: 0,
            fontSize: zoneLabelFontSize,
            fontWeight: 'bold',
            color: 'white',
            whiteSpace: isCompactInput ? 'normal' : 'nowrap',
            overflow: isCompactInput ? 'visible' : 'hidden',
            textOverflow: 'clip',
            overflowWrap: isCompactInput ? 'normal' : undefined,
            wordBreak: isCompactInput ? 'keep-all' : undefined,
            lineHeight: isCompactInput ? 1.05 : undefined,
          }}
        >
          {displayLabel}
        </span>
        <span
          style={{
            flex: '0 0 auto',
            minWidth: zoneCountMinWidth,
            padding: zoneCountPadding,
            borderRadius: '999px',
            background: 'rgba(59, 130, 246, 0.24)',
            color: '#bfdbfe',
            fontSize: zoneCountFontSize,
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
            <div style={{ position: 'relative', width: `${cardSize.width}px`, height: `${cardSize.height}px` }}>
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
                      quickActionsDisabled={shouldDisableZoneQuickActions || disableQuickActionsForCard?.(card)}
                      disableCombatAndCounterControls={hasCardOnTop(card.id)}
                      onCardTapAction={onCardTapAction}
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
                          quickActionsDisabled={shouldDisableZoneQuickActions || disableQuickActionsForCard?.(attachedCard)}
                          disableCombatAndCounterControls={hasCardOnTop(attachedCard.id)}
                          onCardTapAction={onCardTapAction}
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
                quickActionsDisabled={shouldDisableZoneQuickActions || disableQuickActionsForCard?.(card)}
                disableCombatAndCounterControls={hasCardOnTop(card.id)}
                onCardTapAction={onCardTapAction}
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
                    quickActionsDisabled={shouldDisableZoneQuickActions || disableQuickActionsForCard?.(attachedCard)}
                    disableCombatAndCounterControls={hasCardOnTop(attachedCard.id)}
                    onCardTapAction={onCardTapAction}
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
