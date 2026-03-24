import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { BaseCardStats } from '../utils/cardStats';
import { isMainDeckSpellCard, type RuntimeBaseCardType } from '../utils/cardType';
import type { CardDetail } from '../utils/cardDetails';
import CardArtwork from './CardArtwork';

export interface CardInstance {
  id: string; // unique instance id
  cardId: string; // from cards.json
  name: string;
  image: string;
  zone: string;
  owner: 'host' | 'guest';
  isTapped: boolean;
  isFlipped: boolean; // For face-down on field
  counters: { atk: number; hp: number };
  genericCounter?: number;
  attachedTo?: string; // ID of the base card this evolve card is stacked on
  isEvolveCard?: boolean; // Rule flag to prevent Evolve cards mixing into Main deck
  isLeaderCard?: boolean;
  isTokenCard?: boolean;
  baseCardType?: RuntimeBaseCardType | null;
}

export interface CardInspectAnchor {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface Props {
  card: CardInstance;
  baseStats?: BaseCardStats;
  detail?: Pick<CardDetail, 'name' | 'cost' | 'atk' | 'hp' | 'type' | 'image'>;
  displayCounters?: { atk: number; hp: number };
  hideCurrentStats?: boolean;
  highlightTone?: 'attack-source' | 'attack-target';
  onInspect?: (card: CardInstance, anchor: CardInspectAnchor) => void;
  onAttack?: (id: string) => void;
  onTap?: (id: string) => void;
  onModifyCounter?: (id: string, stat: 'atk' | 'hp', delta: number) => void;
  onModifyGenericCounter?: (id: string, delta: number) => void;
  onSendToBottom?: (id: string) => void;
  onBanish?: (id: string) => void;
  onReturnEvolve?: (id: string) => void;
  onCemetery?: (id: string) => void;
  onPlayToField?: (id: string) => void;
  isHidden?: boolean; // if true, STRICTLY render card back only
  isLocked?: boolean; // if true, prevent dragging and operating (opponent's hand/deck/ex)
  quickActionsDisabled?: boolean;
  disableCombatAndCounterControls?: boolean;
  debugIndex?: number;
}

const Card: React.FC<Props> = ({ card, baseStats, detail, displayCounters, hideCurrentStats, highlightTone, onInspect, onAttack, onTap, onModifyCounter, onModifyGenericCounter, onSendToBottom, onBanish, onReturnEvolve, onCemetery, onPlayToField, isHidden, isLocked, quickActionsDisabled, disableCombatAndCounterControls, debugIndex }) => {
  const inspectPointerStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const isInteractionLocked = isLocked || card.isLeaderCard || card.zone.startsWith('leader-');
  const { attributes, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
    id: card.id,
    data: { card },
    disabled: isInteractionLocked
  });

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: card.id,
    data: { type: 'card', card }
  });

  const setRefs = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const style: React.CSSProperties = {
    // Translate x/y for the drag
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: transform ? 999 : 1,
    cursor: isInteractionLocked ? 'default' : 'grab',
    position: 'relative',
    width: '100px',
    height: '140px',
    transition: transform ? 'none' : 'transform 0.2s ease', // animate tapping
  };

  // Stack transforms if tapped
  if (card.isTapped && !transform) {
    style.transform = 'rotate(90deg)';
  } else if (card.isTapped && transform) {
    style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(90deg)`;
  }

  const isStatDisplayZone = card.zone.startsWith('field-') || card.zone.startsWith('ex-');
  const resolvedImage = detail?.image || card.image;
  const effectiveDisplayCounters = displayCounters ?? card.counters;
  const genericCounterValue = card.genericCounter ?? 0;
  const isNormalSpellPlay = isMainDeckSpellCard(card);
  const playActionLabel = isNormalSpellPlay ? 'Play' : 'Play to Field';
  const currentStats = !hideCurrentStats && isStatDisplayZone && !isHidden && !card.isFlipped && baseStats
    ? {
        atk: baseStats.atk + effectiveDisplayCounters.atk,
        hp: baseStats.hp + effectiveDisplayCounters.hp,
      }
    : null;
  const shouldShowCounterOverlay =
    !card.zone.startsWith('hand') &&
    (card.counters.atk !== 0 || card.counters.hp !== 0) &&
    !currentStats;
  const highlightStyle: React.CSSProperties | undefined = highlightTone === 'attack-source'
    ? {
        border: '2px solid rgba(34, 211, 238, 0.9)',
        boxShadow: '0 0 0 2px rgba(34, 211, 238, 0.28), 0 0 18px rgba(34, 211, 238, 0.32)'
      }
    : highlightTone === 'attack-target'
      ? {
          border: '2px solid rgba(250, 204, 21, 0.9)',
          boxShadow: '0 0 0 2px rgba(250, 204, 21, 0.22), 0 0 18px rgba(250, 204, 21, 0.24)'
        }
      : undefined;

  return (
    <div
      ref={setRefs}
      data-card-id={card.id}
      className="game-card"
      style={{ ...style, border: isOver ? '2px solid var(--vivid-green-cyan)' : highlightStyle?.border ?? 'none', boxShadow: highlightStyle?.boxShadow, borderRadius: '4px' }}
      {...listeners}
      {...attributes}
      onPointerDownCapture={(event) => {
        if (event.button !== 0) return;
        if ((event.target as HTMLElement).closest('button')) return;
        inspectPointerStartRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUpCapture={(event) => {
        const pointerStart = inspectPointerStartRef.current;
        inspectPointerStartRef.current = null;

        if (!pointerStart) return;
        if ((event.target as HTMLElement).closest('button')) return;
        if (isHidden || card.isFlipped) return;

        const deltaX = Math.abs(event.clientX - pointerStart.x);
        const deltaY = Math.abs(event.clientY - pointerStart.y);
        if (deltaX > 6 || deltaY > 6) return;

        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
        onInspect?.(card, {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        });
      }}
      onPointerCancel={() => {
        inspectPointerStartRef.current = null;
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        inspectPointerStartRef.current = null;
        if (isInteractionLocked) return;
        if (disableCombatAndCounterControls) return;
        onTap?.(card.id);
      }}
    >
      {(isHidden || card.isFlipped) ? (
        <CardArtwork
          image={resolvedImage}
          alt={card.name}
          isBack={true}
          detail={detail}
          baseCardType={card.baseCardType}
          isLeaderCard={card.isLeaderCard}
          isTokenCard={card.isTokenCard}
          isEvolveCard={card.isEvolveCard}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', boxShadow: 'var(--shadow-sm)' }}
          draggable={false}
        />
      ) : (
        <>
          <CardArtwork
            image={resolvedImage}
            alt={card.name}
            detail={detail}
            baseCardType={card.baseCardType}
            isLeaderCard={card.isLeaderCard}
            isTokenCard={card.isTokenCard}
            isEvolveCard={card.isEvolveCard}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', boxShadow: 'var(--shadow-sm)' }}
            draggable={false}
          />

          {/* Debug Index */}
          {debugIndex !== undefined && (
            <div style={{
              position: 'absolute', top: 2, left: 2,
              background: 'rgba(255,0,0,0.8)', color: 'white',
              fontSize: '10px', padding: '1px 4px', borderRadius: '3px',
              zIndex: 10, pointerEvents: 'none', border: '1px solid white'
            }}>
              IDX: {debugIndex}
            </div>
          )}

          {/* Counters Overlay - Hide if in hand */}
          {shouldShowCounterOverlay && (
            <div style={{
              position: 'absolute', bottom: -5, right: -5,
              background: 'rgba(0,0,0,0.85)', padding: '4px 8px', borderRadius: '8px',
              border: '1px solid #fff', display: 'flex', gap: '4px', alignItems: 'center',
              fontWeight: 'bold', fontSize: '0.85rem'
            }}>
              <span style={{ color: '#fbbf24' }}>{card.counters.atk > 0 ? '+' : ''}{card.counters.atk}</span>
              <span style={{ color: '#fff' }}>/</span>
              <span style={{ color: '#ef4444' }}>{card.counters.hp > 0 ? '+' : ''}{card.counters.hp}</span>
            </div>
          )}

          {currentStats && (
            <div
              data-testid="current-stats-badge"
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '999px',
                padding: '3px 7px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                color: 'white',
                pointerEvents: 'none',
                boxShadow: '0 6px 12px rgba(0,0,0,0.3)'
              }}
            >
              <span style={{ color: '#fbbf24' }}>{currentStats.atk}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>/</span>
              <span style={{ color: '#f87171' }}>{currentStats.hp}</span>
            </div>
          )}

          {!isHidden && !card.isFlipped && genericCounterValue > 0 && (
            <div
              data-testid="generic-counter-badge"
              style={{
                position: 'absolute',
                top: currentStats ? 34 : 6,
                right: 6,
                background: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '999px',
                padding: '3px 7px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.66rem',
                fontWeight: 'bold',
                color: '#e2e8f0',
                pointerEvents: 'none',
                boxShadow: '0 6px 12px rgba(0,0,0,0.3)'
              }}
            >
              <span>Counter</span>
              <span style={{ color: '#f8fafc' }}>{genericCounterValue}</span>
            </div>
          )}

          {/* Quick Edit Overlay - Only show if not hidden AND not locked */}
          {!isHidden && !isInteractionLocked && (
            <div className="card-controls"
              data-testid="card-controls"
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px',
                background: 'rgba(0,0,0,0.6)', opacity: 0, transition: 'opacity 0.2s ease',
                borderRadius: '4px',
                pointerEvents: quickActionsDisabled ? 'none' : undefined
              }}>
              {onPlayToField && (card.zone.startsWith('hand') || card.zone.startsWith('ex-')) && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onPlayToField(card.id); }}
                    style={{ background: '#3b82f6', color: 'white', border: '1px solid #fff', padding: '4px 4px', fontSize: '11px', borderRadius: '4px', width: '100%', fontWeight: 'bold' }}
                  >
                    {playActionLabel}
                  </button>
                </div>
              )}
              {onModifyCounter && !card.zone.startsWith('hand') && !disableCombatAndCounterControls && (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'atk', 1); }} style={{ background: '#3b82f6', color: '#fff', padding: '2px', fontSize: '10px', borderRadius: '2px' }}>+A</button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'atk', -1); }} style={{ background: '#1a1d24', color: '#fff', padding: '2px', fontSize: '10px', borderRadius: '2px', marginTop: '2px' }}>-A</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'hp', 1); }} style={{ background: '#ef4444', color: '#fff', padding: '2px', fontSize: '10px', borderRadius: '2px' }}>+H</button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'hp', -1); }} style={{ background: '#1a1d24', color: '#fff', padding: '2px', fontSize: '10px', borderRadius: '2px', marginTop: '2px' }}>-H</button>
                  </div>
                </div>
              )}
              {onModifyGenericCounter && isStatDisplayZone && !disableCombatAndCounterControls && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', width: '100%' }}>
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyGenericCounter(card.id, 1); }} style={{ background: '#0f766e', color: '#fff', padding: '2px 4px', fontSize: '10px', borderRadius: '2px', width: '100%' }}>+C</button>
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyGenericCounter(card.id, -1); }} style={{ background: '#7f1d1d', color: '#fff', padding: '2px 4px', fontSize: '10px', borderRadius: '2px', width: '100%' }}>-C</button>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: 'auto' }}>
                {onSendToBottom && <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSendToBottom(card.id); }} style={{ background: 'var(--bg-surface-elevated)', color: 'white', border: '1px solid gray', padding: '2px 4px', fontSize: '10px', borderRadius: '2px' }}>↓Bot</button>}
                {onCemetery && <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onCemetery(card.id); }} style={{ background: '#374151', color: 'white', border: '1px solid #9ca3af', padding: '2px 4px', fontSize: '10px', borderRadius: '2px' }}>Cemetery</button>}
                {onBanish && <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onBanish(card.id); }} style={{ background: '#4c1d95', color: 'white', border: '1px solid #c4b5fd', padding: '2px 4px', fontSize: '10px', borderRadius: '2px' }}>Banish</button>}
              </div>
              {onReturnEvolve && card.isEvolveCard && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onReturnEvolve(card.id); }} style={{ background: 'var(--accent-primary)', color: 'black', border: '1px solid var(--accent-primary)', padding: '2px 4px', fontSize: '10px', borderRadius: '2px', width: '100%', fontWeight: 'bold' }}>To Evolve Deck</button>
                </div>
              )}
              {onTap && !disableCombatAndCounterControls && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onTap(card.id); }} style={{ background: card.isTapped ? '#fbbf24' : '#64748b', color: 'black', border: '1px solid #fff', padding: '4px 4px', fontSize: '11px', borderRadius: '4px', width: '100%', fontWeight: 'bold' }}>
                    {card.isTapped ? 'STAND' : 'REST'}
                  </button>
                  {onAttack && card.zone.startsWith('field-') && !card.isTapped && (card.baseCardType === 'follower' || !!baseStats) && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onAttack(card.id); }}
                      style={{ background: '#f97316', color: 'white', border: '1px solid #fdba74', padding: '4px 4px', fontSize: '11px', borderRadius: '4px', width: '100%', fontWeight: 'bold' }}
                    >
                      Attack
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Card;
