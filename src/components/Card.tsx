import { useBoardMultiSelectionContext } from '../contexts/gameBoardMultiSelectionContext';
import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import type { BaseCardStats } from '../utils/card/cardStats';
import { isMainDeckSpellCard, type RuntimeBaseCardType } from '../utils/card/cardType';
import { resolveSelectedCardFaceDetail, type CardDetail, type CardFaceSide } from '../utils/card/cardDetails';
import CardArtwork from './CardArtwork';
import { useGameBoardBoardDensity, useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';
import { getCardSizeForInputProfile } from '../utils/gameBoard/gameBoardCardLayout';
import { computeCoarseSheetPlacement, type CoarseSheetPlacement } from './card/cardCoarsePlacement';
import { CardStatBadges } from './card/CardStatBadges';
import { CardHoverQuickActions } from './card/CardHoverQuickActions';
import { CardTouchActionSheet } from './card/CardTouchActionSheet';

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
  selectedFaceSide?: CardFaceSide;
}

export interface CardInspectAnchor {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface CardTapAnchor {
  x: number;
  y: number;
}

interface Props {
  card: CardInstance;
  baseStats?: BaseCardStats;
  detail?: CardDetail;
  displayCounters?: { atk: number; hp: number };
  hideCurrentStats?: boolean;
  highlightTone?: 'attack-source' | 'attack-target';
  onInspect?: (card: CardInstance, anchor: CardInspectAnchor) => void;
  onAttack?: (id: string) => void;
  onTap?: (id: string) => void;
  onModifyCounter?: (id: string, stat: 'atk' | 'hp', delta: number) => void;
  onModifyGenericCounter?: (id: string, delta: number) => void;
  onSendToTop?: (id: string) => void;
  onSendToBottom?: (id: string) => void;
  onSendToHand?: (id: string) => void;
  onSendToEx?: (id: string) => void;
  onStartAttach?: (id: string) => void;
  onBanish?: (id: string) => void;
  onReturnEvolve?: (id: string) => void;
  onCemetery?: (id: string) => void;
  onPlayToField?: (id: string) => void;
  onCardTapAction?: (card: CardInstance, anchor: CardTapAnchor) => boolean | void;
  onQuickActionsHoverChange?: (id: string, isHovered: boolean) => void;
  isHidden?: boolean; // if true, STRICTLY render card back only
  isLocked?: boolean; // if true, prevent dragging and operating (opponent's hand/deck/ex)
  quickActionsDisabled?: boolean;
  disableCombatAndCounterControls?: boolean;
  debugIndex?: number;
}

const Card: React.FC<Props> = ({ card, baseStats, detail, displayCounters, hideCurrentStats, highlightTone, onInspect, onAttack, onTap, onModifyCounter, onModifyGenericCounter, onSendToTop, onSendToBottom, onSendToHand, onSendToEx, onStartAttach, onBanish, onReturnEvolve, onCemetery, onPlayToField, onCardTapAction, onQuickActionsHoverChange, isHidden, isLocked, quickActionsDisabled, disableCombatAndCounterControls, debugIndex }) => {
  const { t } = useTranslation();
  const selection = useBoardMultiSelectionContext();
  const selectionTone = selection?.tone(card.id);
  const selectionShortcutHandledRef = React.useRef(false);
  const inspectPointerStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const cardElementRef = React.useRef<HTMLElement | null>(null);
  const coarseActionSheetRef = React.useRef<HTMLDivElement | null>(null);
  const inputProfile = useGameBoardInputProfile();
  const boardDensity = useGameBoardBoardDensity();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = React.useState(false);
  const [coarseSheetPlacement, setCoarseSheetPlacement] = React.useState<CoarseSheetPlacement | null>(null);
  const [isDesktopQuickActionsHovered, setIsDesktopQuickActionsHovered] = React.useState(false);
  const isCoarseInput = inputProfile === 'coarse';
  const isOverviewQuickActions = !isCoarseInput && boardDensity === 'overview';
  const cardSize = getCardSizeForInputProfile(inputProfile, boardDensity);
  const isInteractionLocked = isLocked || card.isLeaderCard || card.zone.startsWith('leader-');
  const canShowQuickActionOverlay = !isHidden && !isInteractionLocked && !selection?.active;
  const canToggleQuickActions = isCoarseInput && canShowQuickActionOverlay && !quickActionsDisabled;
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card },
    disabled: isInteractionLocked || Boolean(selection?.active)
  });

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: card.id,
    data: { type: 'card', card }
  });

  // Remember that this press became a drag even if it is later cancelled.
  React.useEffect(() => {
    if (isDragging) inspectPointerStartRef.current = null;
  }, [isDragging]);

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

  React.useEffect(() => {
    if (isDesktopQuickActionsHovered && !canShowQuickActionOverlay) {
      setIsDesktopQuickActionsHovered(false);
      onQuickActionsHoverChange?.(card.id, false);
    }
  }, [isDesktopQuickActionsHovered, canShowQuickActionOverlay, card.id, onQuickActionsHoverChange]);

  const updateCoarseSheetPlacement = React.useCallback(() => {
    if (!isCoarseInput || typeof window === 'undefined') return;

    const cardElement = cardElementRef.current;
    if (!cardElement) return;

    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;

    setCoarseSheetPlacement(computeCoarseSheetPlacement({
      cardRect: cardElement.getBoundingClientRect(),
      viewport: {
        left: viewportLeft,
        top: viewportTop,
        width: viewportWidth,
        height: viewportHeight,
      },
      measuredSheetHeight: coarseActionSheetRef.current?.offsetHeight ?? 0,
      isExZoneCard: card.zone.startsWith('ex-'),
    }));
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
    zIndex: transform ? 999 : isDesktopQuickActionsHovered ? 140 : 1,
    cursor: selection?.active ? selection.canSelectZone(card.zone) ? 'pointer' : 'default' : isInteractionLocked ? 'default' : 'grab',
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
  const displayDetail = resolveSelectedCardFaceDetail(detail, card.selectedFaceSide) ?? undefined;
  const resolvedImage = displayDetail?.image || card.image;
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
    sendToTop: t('gameBoard.card.quickActionDescriptions.sendToTop'),
    sendToBottom: t('gameBoard.card.quickActionDescriptions.sendToBottom'),
    toHand: t('gameBoard.card.quickActionDescriptions.toHand'),
    toEx: t('gameBoard.card.quickActionDescriptions.toEx'),
    attachToCard: t('gameBoard.card.quickActionDescriptions.attachToCard'),
    cemetery: t('gameBoard.card.quickActionDescriptions.cemetery'),
    banish: t('gameBoard.card.quickActionDescriptions.banish'),
    toEvolveDeck: t('gameBoard.card.quickActionDescriptions.toEvolveDeck'),
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
      data-selection-tone={selectionTone}
      aria-label={selection?.active ? card.isFlipped || isHidden ? t('gameBoard.multiSelect.hiddenCard') : card.name : undefined}
      aria-selected={selection?.active ? Boolean(selectionTone) : undefined}
      className="game-card"
      style={{ ...style, border: selectionTone ? `2px solid ${selectionTone === 'selected' ? '#38bdf8' : '#7dd3fc'}` : isOver ? '2px solid var(--vivid-green-cyan)' : highlightStyle?.border ?? 'none', boxShadow: selectionTone ? '0 0 0 2px rgba(56,189,248,0.25)' : highlightStyle?.boxShadow, borderRadius: '4px' }}
      {...listeners}
      {...attributes}
      aria-disabled={selection?.active ? !selection.canSelectZone(card.zone) : attributes['aria-disabled']}
      role={selection?.active && selection.canSelectZone(card.zone) ? 'option' : attributes.role}
      tabIndex={selection?.active && selection.canSelectZone(card.zone) ? 0 : attributes.tabIndex}
      onClickCapture={(event) => {
        if (selection?.active || (selectionShortcutHandledRef.current && (event.ctrlKey || event.metaKey))) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') inspectPointerStartRef.current = null;
        if (selection?.active && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          selection.select(card, false);
        } else listeners?.onKeyDown?.(event);
      }}
      onPointerDownCapture={(event) => {
        selectionShortcutHandledRef.current = false;
        if (event.button !== 0) return;
        if (selection?.canSelectZone(card.zone) && (event.ctrlKey || event.metaKey) && selection.select(card, true)) {
          selectionShortcutHandledRef.current = true;
          inspectPointerStartRef.current = null;
          event.stopPropagation();
          return;
        }

        if ((event.target as HTMLElement).closest('button')) return;
        inspectPointerStartRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUpCapture={(event) => {
        const pointerStart = inspectPointerStartRef.current;
        inspectPointerStartRef.current = null;

        if (!pointerStart || isDragging) return;
        if ((event.target as HTMLElement).closest('button')) return;

        const deltaX = Math.abs(event.clientX - pointerStart.x);
        const deltaY = Math.abs(event.clientY - pointerStart.y);
        if (deltaX > 6 || deltaY > 6) return;

        if (selection?.select(card, event.ctrlKey || event.metaKey)) return;
        if (selection?.active) return;

        const tapActionHandled = onCardTapAction?.(card, {
          x: event.clientX,
          y: event.clientY,
        });
        if (tapActionHandled) return;
        if (isHidden || card.isFlipped) return;

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
        selectionShortcutHandledRef.current = false;
      }}
      onPointerEnter={() => {
        if (!isCoarseInput && canShowQuickActionOverlay) {
          setIsDesktopQuickActionsHovered(true);
          onQuickActionsHoverChange?.(card.id, true);
        }
      }}
      onPointerLeave={() => {
        setIsDesktopQuickActionsHovered(false);
        if (!isCoarseInput && (canShowQuickActionOverlay || isDesktopQuickActionsHovered)) {
          onQuickActionsHoverChange?.(card.id, false);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        inspectPointerStartRef.current = null;
        if (isInteractionLocked || selection?.active || (selectionShortcutHandledRef.current && (e.ctrlKey || e.metaKey))) return;
        if (disableCombatAndCounterControls) return;
        onTap?.(card.id);
      }}
    >
      {selectionTone && <span aria-hidden="true" style={{ position: 'absolute', top: 2, left: 2, zIndex: 150, background: selectionTone === 'selected' ? '#0284c7' : '#334155', color: 'white', borderRadius: 4, padding: '0 4px', pointerEvents: 'none' }}>✓</span>}
      {(isHidden || card.isFlipped) ? (
        <CardArtwork
          image={resolvedImage}
          alt={card.name}
          isBack={true}
          detail={displayDetail}
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
            detail={displayDetail}
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

          <CardStatBadges
            shouldShowCounterOverlay={shouldShowCounterOverlay}
            atkCounter={card.counters.atk}
            hpCounter={card.counters.hp}
            currentStats={currentStats}
            showGenericCounter={!isHidden && !card.isFlipped && genericCounterValue > 0}
            genericCounterValue={genericCounterValue}
            counterLabel={t('gameBoard.card.counter')}
          />

          <CardHoverQuickActions
            card={card}
            canShowQuickActionOverlay={canShowQuickActionOverlay}
            quickActionsDisabled={quickActionsDisabled}
            isCoarseInput={isCoarseInput}
            isQuickActionsOpen={isQuickActionsOpen}
            isOverviewQuickActions={isOverviewQuickActions}
            isStatDisplayZone={isStatDisplayZone}
            disableCombatAndCounterControls={disableCombatAndCounterControls}
            baseStats={baseStats}
            playActionLabel={playActionLabel}
            quickActionLabels={quickActionLabels}
            quickActionDescriptions={quickActionDescriptions}
            onPlayToField={onPlayToField}
            onModifyCounter={onModifyCounter}
            onModifyGenericCounter={onModifyGenericCounter}
            onSendToBottom={onSendToBottom}
            onCemetery={onCemetery}
            onBanish={onBanish}
            onReturnEvolve={onReturnEvolve}
            onTap={onTap}
            onAttack={onAttack}
          />

          <CardTouchActionSheet
            card={card}
            cardElementRef={cardElementRef}
            sheetRef={coarseActionSheetRef}
            placement={coarseSheetPlacement}
            canShowQuickActionOverlay={canShowQuickActionOverlay}
            quickActionsDisabled={quickActionsDisabled}
            isCoarseInput={isCoarseInput}
            isQuickActionsOpen={isQuickActionsOpen}
            onClose={() => setIsQuickActionsOpen(false)}
            isStatDisplayZone={isStatDisplayZone}
            disableCombatAndCounterControls={disableCombatAndCounterControls}
            baseStats={baseStats}
            playActionLabel={playActionLabel}
            quickActionDescriptions={quickActionDescriptions}
            onPlayToField={onPlayToField}
            onInspect={onInspect}
            onModifyCounter={onModifyCounter}
            onModifyGenericCounter={onModifyGenericCounter}
            onSendToTop={onSendToTop}
            onSendToBottom={onSendToBottom}
            onSendToHand={onSendToHand}
            onSendToEx={onSendToEx}
            onStartAttach={onStartAttach}
            onCemetery={onCemetery}
            onBanish={onBanish}
            onReturnEvolve={onReturnEvolve}
            onTap={onTap}
            onAttack={onAttack}
          />
        </>
      )}
    </div>
  );
};

export default Card;
