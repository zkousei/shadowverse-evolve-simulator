import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import type { BaseCardStats } from '../utils/cardStats';
import { isMainDeckSpellCard, type RuntimeBaseCardType } from '../utils/cardType';
import type { CardDetail } from '../utils/cardDetails';
import CardArtwork from './CardArtwork';
import { useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';
import { getCardSizeForInputProfile } from '../utils/gameBoardCardLayout';

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
  linkedTo?: string; // ID of the parent card this special linked card visually sits under
  isEvolveCard?: boolean; // Rule flag to prevent Evolve cards mixing into Main deck
  isLeaderCard?: boolean;
  isTokenCard?: boolean;
  baseCardType?: RuntimeBaseCardType | null;
  cardKindNormalized?: string;
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
  const { t } = useTranslation();
  const inspectPointerStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const cardElementRef = React.useRef<HTMLElement | null>(null);
  const coarseActionSheetRef = React.useRef<HTMLDivElement | null>(null);
  const inputProfile = useGameBoardInputProfile();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = React.useState(false);
  const [coarseSheetPlacement, setCoarseSheetPlacement] = React.useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const isCoarseInput = inputProfile === 'coarse';
  const cardSize = getCardSizeForInputProfile(inputProfile);
  const isInteractionLocked = isLocked || card.isLeaderCard || card.zone.startsWith('leader-');
  const canShowQuickActionOverlay = !isHidden && !isInteractionLocked;
  const canToggleQuickActions = isCoarseInput && canShowQuickActionOverlay && !quickActionsDisabled;
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
    cardElementRef.current = node;
    setDraggableRef(node);
    setDroppableRef(node);
  };

  React.useEffect(() => {
    setIsQuickActionsOpen(false);
  }, [card.id, card.zone]);

  React.useEffect(() => {
    if (!canToggleQuickActions) {
      setIsQuickActionsOpen(false);
    }
  }, [canToggleQuickActions]);

  const updateCoarseSheetPlacement = React.useCallback(() => {
    if (!isCoarseInput || typeof window === 'undefined') return;

    const cardElement = cardElementRef.current;
    if (!cardElement) return;

    const rect = cardElement.getBoundingClientRect();
    const isExZoneCard = card.zone.startsWith('ex-');
    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight;
    const viewportMargin = 6;
    const anchorOffset = isExZoneCard ? 4 : 6;
    const desiredSheetWidth = Math.round(viewportWidth * (isExZoneCard ? 0.7 : 0.74));
    const sheetWidth = isExZoneCard
      ? Math.max(208, Math.min(desiredSheetWidth, 272))
      : Math.max(220, Math.min(desiredSheetWidth, 300));
    const measuredSheetHeight = coarseActionSheetRef.current?.offsetHeight ?? 0;

    const desiredLeft = rect.left + (rect.width / 2) - (sheetWidth / 2);
    const minLeft = viewportLeft + viewportMargin;
    const maxLeft = Math.max(minLeft, viewportRight - sheetWidth - viewportMargin);
    const left = Math.min(Math.max(desiredLeft, minLeft), maxLeft);

    const rawBelowSpace = viewportBottom - (rect.bottom + anchorOffset) - viewportMargin;
    const rawAboveSpace = rect.top - anchorOffset - (viewportTop + viewportMargin);
    const belowSpace = Math.max(0, rawBelowSpace);
    const aboveSpace = Math.max(0, rawAboveSpace);

    const estimatedSheetHeight = measuredSheetHeight > 0 ? measuredSheetHeight : 220;
    const minPreferredSpace = Math.min(172, estimatedSheetHeight);

    const placeBelow = isExZoneCard
      ? (aboveSpace < minPreferredSpace && belowSpace > aboveSpace)
      : belowSpace >= minPreferredSpace
        ? true
        : aboveSpace >= minPreferredSpace
          ? false
          : belowSpace >= aboveSpace;

    const maxHeight = Math.floor(placeBelow ? belowSpace : aboveSpace);
    const effectiveHeight = measuredSheetHeight > 0 ? Math.min(measuredSheetHeight, maxHeight) : maxHeight;

    let top = placeBelow
      ? rect.bottom + anchorOffset
      : rect.top - anchorOffset - effectiveHeight;

    const minTop = viewportTop + viewportMargin;
    const maxTop = Math.max(minTop, viewportBottom - effectiveHeight - viewportMargin);
    top = Math.min(Math.max(top, minTop), maxTop);

    setCoarseSheetPlacement({
      top: Math.round(top),
      left: Math.round(left),
      width: sheetWidth,
      maxHeight: Math.max(1, maxHeight),
    });
  }, [card.zone, isCoarseInput]);

  React.useEffect(() => {
    if (!isCoarseInput || !isQuickActionsOpen || typeof window === 'undefined') {
      setCoarseSheetPlacement(null);
      return undefined;
    }

    const handleViewportUpdate = () => {
      updateCoarseSheetPlacement();
    };

    handleViewportUpdate();
    const rafId = window.requestAnimationFrame(handleViewportUpdate);
    const visualViewport = window.visualViewport;

    window.addEventListener('resize', handleViewportUpdate);
    document.addEventListener('scroll', handleViewportUpdate, true);
    visualViewport?.addEventListener('resize', handleViewportUpdate);
    visualViewport?.addEventListener('scroll', handleViewportUpdate);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleViewportUpdate);
      document.removeEventListener('scroll', handleViewportUpdate, true);
      visualViewport?.removeEventListener('resize', handleViewportUpdate);
      visualViewport?.removeEventListener('scroll', handleViewportUpdate);
    };
  }, [isCoarseInput, isQuickActionsOpen, updateCoarseSheetPlacement]);

  React.useEffect(() => {
    if (!canToggleQuickActions) return undefined;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const cardElement = cardElementRef.current;
      if (!cardElement) return;
      if (coarseActionSheetRef.current?.contains(event.target as Node)) return;
      if (cardElement.contains(event.target as Node)) return;
      setIsQuickActionsOpen(false);
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  }, [canToggleQuickActions]);

  const style: React.CSSProperties = {
    // Translate x/y for the drag
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: transform ? 999 : 1,
    cursor: isInteractionLocked ? 'default' : 'grab',
    touchAction: isCoarseInput ? 'none' : undefined,
    position: 'relative',
    width: `${cardSize.width}px`,
    height: `${cardSize.height}px`,
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
  const playActionLabel = isNormalSpellPlay ? t('gameBoard.card.play') : t('gameBoard.modals.search.playToField');
  const quickActionLabels = {
    inspect: t('gameBoard.card.quickActions.inspect'),
    sendToBottom: t('gameBoard.card.quickActions.sendToBottom'),
    cemetery: t('gameBoard.card.quickActions.cemetery'),
    banish: t('gameBoard.card.quickActions.banish'),
    toEvolveDeck: t('gameBoard.card.quickActions.toEvolveDeck'),
  };
  const quickActionDescriptions = {
    inspect: t('gameBoard.card.quickActionDescriptions.inspect'),
    sendToBottom: t('gameBoard.card.quickActionDescriptions.sendToBottom'),
    cemetery: t('gameBoard.card.quickActionDescriptions.cemetery'),
    banish: t('gameBoard.card.quickActionDescriptions.banish'),
    toEvolveDeck: t('gameBoard.card.quickActionDescriptions.toEvolveDeck'),
  };
  const compactQuickActionButtonStyle: React.CSSProperties = {
    padding: '2px 4px',
    fontSize: '10px',
    borderRadius: '2px',
    minWidth: '32px',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  };
  const counterAdjustButtonStyle: React.CSSProperties = {
    padding: '4px 5px',
    fontSize: '11px',
    borderRadius: '4px',
    minWidth: '28px',
    minHeight: '24px',
    border: '1px solid rgba(255,255,255,0.55)',
    fontWeight: 'bold',
    lineHeight: 1,
  };
  const coarseSheetButtonStyle: React.CSSProperties = {
    minHeight: '34px',
    width: '100%',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.25)',
    padding: '0.28rem 0.42rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    lineHeight: 1.15,
  };
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

        if (canToggleQuickActions) {
          setIsQuickActionsOpen(prev => {
            const nextOpen = !prev;
            if (nextOpen) {
              updateCoarseSheetPlacement();
            }
            return nextOpen;
          });
          return;
        }

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
              <span>{t('gameBoard.card.counter')}</span>
              <span style={{ color: '#f8fafc' }}>{genericCounterValue}</span>
            </div>
          )}

          {/* Quick Edit Overlay - desktop/fine path */}
          {canShowQuickActionOverlay && !isCoarseInput && (
            <div className="card-controls"
              data-testid="card-controls"
              data-quick-actions-open={String(isQuickActionsOpen)}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px',
                background: 'rgba(0,0,0,0.6)', opacity: isCoarseInput ? (isQuickActionsOpen ? 1 : 0) : 0, transition: 'opacity 0.2s ease',
                borderRadius: '4px',
                pointerEvents: quickActionsDisabled ? 'none' : isCoarseInput ? (isQuickActionsOpen ? 'auto' : 'none') : undefined
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
              {onModifyCounter && isStatDisplayZone && !disableCombatAndCounterControls && (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'atk', 1); }} style={{ ...counterAdjustButtonStyle, background: '#3b82f6', color: '#fff' }}>+A</button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'atk', -1); }} style={{ ...counterAdjustButtonStyle, background: '#1a1d24', color: '#fff' }}>-A</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'hp', 1); }} style={{ ...counterAdjustButtonStyle, background: '#ef4444', color: '#fff' }}>+H</button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'hp', -1); }} style={{ ...counterAdjustButtonStyle, background: '#1a1d24', color: '#fff' }}>-H</button>
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
                {onSendToBottom && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onSendToBottom(card.id); }}
                    title={quickActionDescriptions.sendToBottom}
                    aria-label={quickActionDescriptions.sendToBottom}
                    style={{ background: 'var(--bg-surface-elevated)', color: 'white', border: '1px solid gray', ...compactQuickActionButtonStyle }}
                  >
                    {quickActionLabels.sendToBottom}
                  </button>
                )}
                {onCemetery && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onCemetery(card.id); }}
                    title={quickActionDescriptions.cemetery}
                    aria-label={quickActionDescriptions.cemetery}
                    style={{ background: '#374151', color: 'white', border: '1px solid #9ca3af', ...compactQuickActionButtonStyle }}
                  >
                    {quickActionLabels.cemetery}
                  </button>
                )}
                {onBanish && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onBanish(card.id); }}
                    title={quickActionDescriptions.banish}
                    aria-label={quickActionDescriptions.banish}
                    style={{ background: '#4c1d95', color: 'white', border: '1px solid #c4b5fd', ...compactQuickActionButtonStyle }}
                  >
                    {quickActionLabels.banish}
                  </button>
                )}
              </div>
              {onReturnEvolve && card.isEvolveCard && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onReturnEvolve(card.id); }}
                    title={quickActionDescriptions.toEvolveDeck}
                    aria-label={quickActionDescriptions.toEvolveDeck}
                    style={{ background: 'var(--accent-primary)', color: 'black', border: '1px solid var(--accent-primary)', ...compactQuickActionButtonStyle, width: '100%', fontWeight: 'bold' }}
                  >
                    {quickActionLabels.toEvolveDeck}
                  </button>
                </div>
              )}
              {onTap && !disableCombatAndCounterControls && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onTap(card.id); }} style={{ background: card.isTapped ? '#fbbf24' : '#64748b', color: 'black', border: '1px solid #fff', padding: '4px 4px', fontSize: '11px', borderRadius: '4px', width: '100%', fontWeight: 'bold' }}>
                    {card.isTapped ? t('gameBoard.card.stand') : t('gameBoard.card.rest')}
                  </button>
                  {onAttack && card.zone.startsWith('field-') && !card.isTapped && (card.baseCardType === 'follower' || !!baseStats) && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onAttack(card.id); }}
                      style={{ background: '#f97316', color: 'white', border: '1px solid #fdba74', padding: '4px 4px', fontSize: '11px', borderRadius: '4px', width: '100%', fontWeight: 'bold' }}
                    >
                      {t('gameBoard.card.attack')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Coarse input uses an external action sheet with larger touch targets */}
          {canShowQuickActionOverlay && isCoarseInput && isQuickActionsOpen && typeof document !== 'undefined' && createPortal(
            <div
              ref={coarseActionSheetRef}
              data-testid="card-coarse-action-sheet"
              style={{
                position: 'fixed',
                top: coarseSheetPlacement ? `${coarseSheetPlacement.top}px` : '8px',
                left: coarseSheetPlacement ? `${coarseSheetPlacement.left}px` : '8px',
                zIndex: 1200,
                width: coarseSheetPlacement ? `${coarseSheetPlacement.width}px` : 'min(74vw, 300px)',
                maxHeight: coarseSheetPlacement ? `${coarseSheetPlacement.maxHeight}px` : '60vh',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.24rem',
                background: 'rgba(2, 6, 23, 0.97)',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                borderRadius: '8px',
                padding: '0.36rem',
                boxShadow: '0 12px 20px rgba(0,0,0,0.4)',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                visibility: coarseSheetPlacement ? 'visible' : 'hidden',
              }}
            >
                {onPlayToField && (card.zone.startsWith('hand') || card.zone.startsWith('ex-')) && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayToField(card.id);
                      setIsQuickActionsOpen(false);
                    }}
                    style={{ ...coarseSheetButtonStyle, gridColumn: '1 / -1', background: '#2563eb', color: 'white' }}
                  >
                    {playActionLabel}
                  </button>
                )}

                {onInspect && !card.isFlipped && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = cardElementRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      onInspect(card, {
                        top: rect.top,
                        left: rect.left,
                        right: rect.right,
                        bottom: rect.bottom,
                        width: rect.width,
                        height: rect.height,
                      });
                      setIsQuickActionsOpen(false);
                    }}
                    title={quickActionDescriptions.inspect}
                    aria-label={quickActionDescriptions.inspect}
                    style={{ ...coarseSheetButtonStyle, gridColumn: '1 / -1', background: '#0f172a', color: 'white' }}
                  >
                    {quickActionDescriptions.inspect}
                  </button>
                )}

                {onModifyCounter && isStatDisplayZone && !disableCombatAndCounterControls && (
                  <>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onModifyCounter(card.id, 'atk', 1);
                      }}
                      style={{ ...coarseSheetButtonStyle, background: '#3b82f6', color: '#fff' }}
                    >
                      +ATK
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onModifyCounter(card.id, 'atk', -1);
                      }}
                      style={{ ...coarseSheetButtonStyle, background: '#1e293b', color: '#fff' }}
                    >
                      -ATK
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onModifyCounter(card.id, 'hp', 1);
                      }}
                      style={{ ...coarseSheetButtonStyle, background: '#ef4444', color: '#fff' }}
                    >
                      +HP
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onModifyCounter(card.id, 'hp', -1);
                      }}
                      style={{ ...coarseSheetButtonStyle, background: '#1e293b', color: '#fff' }}
                    >
                      -HP
                    </button>
                  </>
                )}

                {onModifyGenericCounter && isStatDisplayZone && !disableCombatAndCounterControls && (
                  <>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onModifyGenericCounter(card.id, 1);
                      }}
                      style={{ ...coarseSheetButtonStyle, background: '#0f766e', color: '#fff' }}
                    >
                      +Counter
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onModifyGenericCounter(card.id, -1);
                      }}
                      style={{ ...coarseSheetButtonStyle, background: '#7f1d1d', color: '#fff' }}
                    >
                      -Counter
                    </button>
                  </>
                )}

                {onSendToBottom && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendToBottom(card.id);
                      setIsQuickActionsOpen(false);
                    }}
                    title={quickActionDescriptions.sendToBottom}
                    aria-label={quickActionDescriptions.sendToBottom}
                    style={{ ...coarseSheetButtonStyle, background: 'var(--bg-surface-elevated)', color: 'white' }}
                  >
                    {quickActionDescriptions.sendToBottom}
                  </button>
                )}
                {onCemetery && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCemetery(card.id);
                      setIsQuickActionsOpen(false);
                    }}
                    title={quickActionDescriptions.cemetery}
                    aria-label={quickActionDescriptions.cemetery}
                    style={{ ...coarseSheetButtonStyle, background: '#334155', color: 'white' }}
                  >
                    {quickActionDescriptions.cemetery}
                  </button>
                )}
                {onBanish && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBanish(card.id);
                      setIsQuickActionsOpen(false);
                    }}
                    title={quickActionDescriptions.banish}
                    aria-label={quickActionDescriptions.banish}
                    style={{ ...coarseSheetButtonStyle, background: '#7c3aed', color: 'white' }}
                  >
                    {quickActionDescriptions.banish}
                  </button>
                )}
                {onReturnEvolve && card.isEvolveCard && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReturnEvolve(card.id);
                      setIsQuickActionsOpen(false);
                    }}
                    title={quickActionDescriptions.toEvolveDeck}
                    aria-label={quickActionDescriptions.toEvolveDeck}
                    style={{ ...coarseSheetButtonStyle, background: 'var(--accent-primary)', color: 'white' }}
                  >
                    {quickActionDescriptions.toEvolveDeck}
                  </button>
                )}
                {onTap && !disableCombatAndCounterControls && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTap(card.id);
                      setIsQuickActionsOpen(false);
                    }}
                    style={{ ...coarseSheetButtonStyle, background: card.isTapped ? '#fbbf24' : '#64748b', color: card.isTapped ? 'black' : 'white' }}
                  >
                    {card.isTapped ? t('gameBoard.card.stand') : t('gameBoard.card.rest')}
                  </button>
                )}
                {onAttack && card.zone.startsWith('field-') && !card.isTapped && (card.baseCardType === 'follower' || !!baseStats) && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAttack(card.id);
                      setIsQuickActionsOpen(false);
                    }}
                    style={{ ...coarseSheetButtonStyle, background: '#f97316', color: 'white' }}
                  >
                    {t('gameBoard.card.attack')}
                  </button>
                )}
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
};

export default Card;
