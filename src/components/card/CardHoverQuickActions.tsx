import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BaseCardStats } from '../../utils/card/cardStats';
import type { CardInstance } from '../Card';

export interface CardHoverQuickActionsProps {
  card: CardInstance;
  canShowQuickActionOverlay: boolean;
  quickActionsDisabled?: boolean;
  isCoarseInput: boolean;
  isQuickActionsOpen: boolean;
  isOverviewQuickActions: boolean;
  isStatDisplayZone: boolean;
  disableCombatAndCounterControls?: boolean;
  baseStats?: BaseCardStats;
  playActionLabel: string;
  quickActionLabels: {
    sendToBottom: string;
    cemetery: string;
    banish: string;
    toEvolveDeck: string;
  };
  quickActionDescriptions: {
    sendToBottom: string;
    cemetery: string;
    banish: string;
    toEvolveDeck: string;
  };
  onPlayToField?: (id: string) => void;
  onModifyCounter?: (id: string, stat: 'atk' | 'hp', delta: number) => void;
  onModifyGenericCounter?: (id: string, delta: number) => void;
  onSendToBottom?: (id: string) => void;
  onCemetery?: (id: string) => void;
  onBanish?: (id: string) => void;
  onReturnEvolve?: (id: string) => void;
  onTap?: (id: string) => void;
  onAttack?: (id: string) => void;
}

export const CardHoverQuickActions: React.FC<CardHoverQuickActionsProps> = ({
  card,
  canShowQuickActionOverlay,
  quickActionsDisabled,
  isCoarseInput,
  isQuickActionsOpen,
  isOverviewQuickActions,
  isStatDisplayZone,
  disableCombatAndCounterControls,
  baseStats,
  playActionLabel,
  quickActionLabels,
  quickActionDescriptions,
  onPlayToField,
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

  if (!canShowQuickActionOverlay || quickActionsDisabled || isCoarseInput) {
    return null;
  }

  const compactQuickActionButtonStyle: React.CSSProperties = {
    padding: isOverviewQuickActions ? '1px 3px' : '2px 4px',
    fontSize: isOverviewQuickActions ? '9px' : '10px',
    borderRadius: '2px',
    minWidth: isOverviewQuickActions ? '28px' : '32px',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  };

  const counterAdjustButtonStyle: React.CSSProperties = {
    padding: isOverviewQuickActions ? '1px 2px' : '3px 4px',
    fontSize: isOverviewQuickActions ? '9px' : '11px',
    borderRadius: '4px',
    minWidth: isOverviewQuickActions ? '20px' : '24px',
    minHeight: isOverviewQuickActions ? '17px' : '22px',
    border: '1px solid rgba(255,255,255,0.55)',
    fontWeight: 'bold',
    lineHeight: 1,
  };

  const genericCounterButtonStyle: React.CSSProperties = {
    padding: isOverviewQuickActions ? '0 2px' : '1px 4px',
    fontSize: isOverviewQuickActions ? '8px' : '10px',
    borderRadius: '2px',
    width: isOverviewQuickActions ? '18px' : '100%',
    minHeight: isOverviewQuickActions ? '15px' : '18px',
    lineHeight: 1.05,
  };

  const combatActionButtonStyle: React.CSSProperties = {
    padding: isOverviewQuickActions ? '1px 3px' : '2px 5px',
    minHeight: isOverviewQuickActions ? '18px' : '22px',
    fontSize: isOverviewQuickActions ? '8px' : '10px',
    lineHeight: isOverviewQuickActions ? 1.05 : 1,
    borderRadius: '3px',
    flex: '1 1 0',
    minWidth: isOverviewQuickActions ? '30px' : 0,
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    textOverflow: 'clip',
    wordBreak: 'keep-all',
  };

  return (
    <div
      className="card-controls"
      data-testid="card-controls"
      data-quick-actions-open={String(isQuickActionsOpen)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: isOverviewQuickActions ? '1px' : '2px',
        padding: isOverviewQuickActions ? '3px' : '4px',
        background: 'rgba(0,0,0,0.6)',
        opacity: isCoarseInput ? (isQuickActionsOpen ? 1 : 0) : 0,
        transition: 'opacity 0.2s ease',
        borderRadius: '4px',
        pointerEvents: quickActionsDisabled ? 'none' : isCoarseInput ? (isQuickActionsOpen ? 'auto' : 'none') : undefined,
      }}
    >
      {onPlayToField && (card.zone.startsWith('hand') || card.zone.startsWith('ex-')) && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: isOverviewQuickActions ? '2px' : '4px', marginBottom: isOverviewQuickActions ? '1px' : '2px' }}>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onPlayToField(card.id); }}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: '1px solid #fff',
              padding: isOverviewQuickActions ? '3px 3px' : '4px 4px',
              fontSize: isOverviewQuickActions ? '10px' : '11px',
              borderRadius: '4px',
              width: '100%',
              fontWeight: 'bold',
              minHeight: isOverviewQuickActions ? '20px' : undefined,
            }}
          >
            {playActionLabel}
          </button>
        </div>
      )}
      {onModifyCounter && isStatDisplayZone && !disableCombatAndCounterControls && (
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isOverviewQuickActions ? '2px' : '3px' }}>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'atk', 1); }} style={{ ...counterAdjustButtonStyle, background: '#3b82f6', color: '#fff' }}>+A</button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'atk', -1); }} style={{ ...counterAdjustButtonStyle, background: '#1a1d24', color: '#fff' }}>-A</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isOverviewQuickActions ? '2px' : '3px' }}>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'hp', 1); }} style={{ ...counterAdjustButtonStyle, background: '#ef4444', color: '#fff' }}>+H</button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyCounter(card.id, 'hp', -1); }} style={{ ...counterAdjustButtonStyle, background: '#1a1d24', color: '#fff' }}>-H</button>
          </div>
        </div>
      )}
      {onModifyGenericCounter && isStatDisplayZone && !disableCombatAndCounterControls && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: isOverviewQuickActions ? '2px' : '4px', width: '100%' }}>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyGenericCounter(card.id, 1); }} style={{ ...genericCounterButtonStyle, background: '#0f766e', color: '#fff' }}>+C</button>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onModifyGenericCounter(card.id, -1); }} style={{ ...genericCounterButtonStyle, background: '#7f1d1d', color: '#fff' }}>-C</button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: isOverviewQuickActions ? '2px' : '4px', marginTop: 'auto' }}>
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: isOverviewQuickActions ? '2px' : '4px', marginTop: isOverviewQuickActions ? '1px' : '2px' }}>
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: isOverviewQuickActions ? '2px' : '3px', marginTop: isOverviewQuickActions ? '1px' : '2px' }}>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onTap(card.id); }}
            style={{
              ...combatActionButtonStyle,
              background: card.isTapped ? '#fbbf24' : '#64748b',
              color: card.isTapped ? 'black' : 'white',
              border: '1px solid rgba(255,255,255,0.65)',
            }}
          >
            {card.isTapped ? t('gameBoard.card.stand') : t('gameBoard.card.rest')}
          </button>
          {onAttack && card.zone.startsWith('field-') && !card.isTapped && (card.baseCardType === 'follower' || !!baseStats) && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onAttack(card.id); }}
              style={{
                ...combatActionButtonStyle,
                background: '#f97316',
                color: 'white',
                border: '1px solid #fdba74',
              }}
            >
              {t('gameBoard.card.attack')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
