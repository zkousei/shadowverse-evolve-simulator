import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { BaseCardStats } from '../utils/cardStats';

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
  attachedTo?: string; // ID of the base card this evolve card is stacked on
  isEvolveCard?: boolean; // Rule flag to prevent Evolve cards mixing into Main deck
}

interface Props {
  card: CardInstance;
  baseStats?: BaseCardStats;
  displayCounters?: { atk: number; hp: number };
  hideCurrentStats?: boolean;
  onTap?: (id: string) => void;
  onModifyCounter?: (id: string, stat: 'atk' | 'hp', delta: number) => void;
  onSendToBottom?: (id: string) => void;
  onBanish?: (id: string) => void;
  onReturnEvolve?: (id: string) => void;
  onCemetery?: (id: string) => void;
  onPlayToField?: (id: string) => void;
  isHidden?: boolean; // if true, STRICTLY render card back only
  isLocked?: boolean; // if true, prevent dragging and operating (opponent's hand/deck/ex)
  debugIndex?: number;
}

const Card: React.FC<Props> = ({ card, baseStats, displayCounters, hideCurrentStats, onTap, onModifyCounter, onSendToBottom, onBanish, onReturnEvolve, onCemetery, onPlayToField, isHidden, isLocked, debugIndex }) => {
  const { attributes, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
    id: card.id,
    data: { card },
    disabled: isLocked
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
    cursor: isLocked ? 'default' : 'grab',
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
  const effectiveDisplayCounters = displayCounters ?? card.counters;
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

  return (
    <div
      ref={setRefs}
      className="game-card"
      style={{ ...style, border: isOver ? '2px solid var(--vivid-green-cyan)' : 'none', borderRadius: '4px' }}
      {...listeners}
      {...attributes}
      onContextMenu={(e) => {
        e.preventDefault();
        onTap?.(card.id);
      }}
    >
      {(isHidden || card.isFlipped) ? (
        <img
          src="/card_back.png"
          alt="Card Back"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', boxShadow: 'var(--shadow-sm)' }}
          draggable={false}
        />
      ) : (
        <>
          <img
            src={card.image}
            alt={card.name}
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

          {/* Quick Edit Overlay - Only show if not hidden AND not locked */}
          {!isHidden && !isLocked && (
            <div className="card-controls"
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px',
                background: 'rgba(0,0,0,0.6)', opacity: 0, transition: 'opacity 0.2s ease',
                borderRadius: '4px'
              }}>
              {onPlayToField && card.zone.startsWith('hand') && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onPlayToField(card.id); }}
                    style={{ background: '#3b82f6', color: 'white', border: '1px solid #fff', padding: '4px 4px', fontSize: '11px', borderRadius: '4px', width: '100%', fontWeight: 'bold' }}
                  >
                    Play to Field
                  </button>
                </div>
              )}
              {onModifyCounter && !card.zone.startsWith('hand') && (
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
              {onTap && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onTap(card.id); }} style={{ background: card.isTapped ? '#fbbf24' : '#64748b', color: 'black', border: '1px solid #fff', padding: '4px 4px', fontSize: '11px', borderRadius: '4px', width: '100%', fontWeight: 'bold' }}>
                    {card.isTapped ? 'STAND' : 'REST'}
                  </button>
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
