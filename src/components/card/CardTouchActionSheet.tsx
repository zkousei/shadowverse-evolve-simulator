import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { BaseCardStats } from '../../utils/card/cardStats';
import type { CardInspectAnchor, CardInstance } from '../Card';
import type { CoarseSheetPlacement } from './cardCoarsePlacement';

export interface CardTouchActionSheetProps {
  card: CardInstance;
  cardElementRef: React.RefObject<HTMLElement | null>;
  sheetRef: React.RefObject<HTMLDivElement | null>;
  placement: CoarseSheetPlacement | null;
  canShowQuickActionOverlay: boolean;
  quickActionsDisabled?: boolean;
  isCoarseInput: boolean;
  isQuickActionsOpen: boolean;
  onClose: () => void;
  isStatDisplayZone: boolean;
  disableCombatAndCounterControls?: boolean;
  baseStats?: BaseCardStats;
  playActionLabel: string;
  quickActionDescriptions: {
    inspect: string;
    sendToBottom: string;
    cemetery: string;
    banish: string;
    toEvolveDeck: string;
  };
  onPlayToField?: (id: string) => void;
  onInspect?: (card: CardInstance, anchor: CardInspectAnchor) => void;
  onModifyCounter?: (id: string, stat: 'atk' | 'hp', delta: number) => void;
  onModifyGenericCounter?: (id: string, delta: number) => void;
  onSendToBottom?: (id: string) => void;
  onCemetery?: (id: string) => void;
  onBanish?: (id: string) => void;
  onReturnEvolve?: (id: string) => void;
  onTap?: (id: string) => void;
  onAttack?: (id: string) => void;
}

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

export const CardTouchActionSheet: React.FC<CardTouchActionSheetProps> = ({
  card,
  cardElementRef,
  sheetRef,
  placement,
  canShowQuickActionOverlay,
  quickActionsDisabled,
  isCoarseInput,
  isQuickActionsOpen,
  onClose,
  isStatDisplayZone,
  disableCombatAndCounterControls,
  baseStats,
  playActionLabel,
  quickActionDescriptions,
  onPlayToField,
  onInspect,
  onModifyCounter,
  onModifyGenericCounter,
  onSendToBottom,
  onCemetery,
  onBanish,
  onReturnEvolve,
  onTap,
  onAttack,
}) => {
  const { t } = useTranslation();

  if (
    !canShowQuickActionOverlay ||
    quickActionsDisabled ||
    !isCoarseInput ||
    !isQuickActionsOpen ||
    typeof document === 'undefined'
  ) {
    return null;
  }

  return createPortal(
    <div
      ref={sheetRef}
      data-testid="card-coarse-action-sheet"
      style={{
        position: 'fixed',
        top: placement ? `${placement.top}px` : '8px',
        left: placement ? `${placement.left}px` : '8px',
        zIndex: 1200,
        width: placement ? `${placement.width}px` : 'min(74vw, 300px)',
        maxHeight: placement ? `${placement.maxHeight}px` : '60vh',
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
        visibility: placement ? 'visible' : 'hidden',
      }}
    >
      {onPlayToField && (card.zone.startsWith('hand') || card.zone.startsWith('ex-')) && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onPlayToField(card.id);
            onClose();
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
            onClose();
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
            onClose();
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
            onClose();
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
            onClose();
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
            onClose();
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
            onClose();
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
            onClose();
          }}
          style={{ ...coarseSheetButtonStyle, background: '#f97316', color: 'white' }}
        >
          {t('gameBoard.card.attack')}
        </button>
      )}
    </div>,
    document.body
  );
};
