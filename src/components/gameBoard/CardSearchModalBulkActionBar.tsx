import React from 'react';
import type { PlayerRole } from '../../types/game';
import { useTranslation } from 'react-i18next';

export interface CardSearchModalBulkActionBarProps {
  isBulkSelecting: boolean;
  selectedCountLabel: string;
  actionRole?: PlayerRole;
  isPreparingMainDeckSearch: boolean;
  canBulkPlayToField: boolean;
  canBulkAddToHand: boolean;
  canBulkRevealToHand: boolean;
  canBulkAddToEx: boolean;
  canBulkSendToCemetery: boolean;
  canBulkSendToBottom: boolean;
  canBulkBanish: boolean;
  onBulkPlayToField: () => void;
  onBulkAddToHand: () => void;
  onBulkRevealToHand: () => void;
  onBulkAddToEx: () => void;
  onBulkSendToCemetery: () => void;
  onBulkSendToBottom: () => void;
  onBulkBanish: () => void;
}

export const CardSearchModalBulkActionBar: React.FC<CardSearchModalBulkActionBarProps> = ({
  isBulkSelecting,
  selectedCountLabel,
  actionRole,
  isPreparingMainDeckSearch,
  canBulkPlayToField,
  canBulkAddToHand,
  canBulkRevealToHand,
  canBulkAddToEx,
  canBulkSendToCemetery,
  canBulkSendToBottom,
  canBulkBanish,
  onBulkPlayToField,
  onBulkAddToHand,
  onBulkRevealToHand,
  onBulkAddToEx,
  onBulkSendToCemetery,
  onBulkSendToBottom,
  onBulkBanish,
}) => {
  const { t } = useTranslation();

  if (!isBulkSelecting) return null;

  return (
    <div
      style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '1rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.6rem',
        background: 'rgba(15, 23, 42, 0.92)'
      }}
    >
      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginRight: '0.2rem' }}>
        {selectedCountLabel}
      </span>
      {canBulkPlayToField && actionRole && (
        <button
          onClick={onBulkPlayToField}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isPreparingMainDeckSearch ? t('gameBoard.modals.search.setFaceDown') : t('gameBoard.modals.search.playToField')}
        </button>
      )}
      {canBulkAddToHand && actionRole && (
        <button
          onClick={onBulkAddToHand}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {t('gameBoard.modals.search.addToHand')}
        </button>
      )}
      {canBulkRevealToHand && actionRole && (
        <button
          onClick={onBulkRevealToHand}
          style={{
            background: '#14b8a6',
            color: 'white',
            border: 'none',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {t('gameBoard.modals.search.revealAndAddToHand')}
        </button>
      )}
      {canBulkAddToEx && actionRole && (
        <button
          onClick={onBulkAddToEx}
          style={{
            background: '#a855f7',
            color: 'white',
            border: 'none',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {t('gameBoard.modals.search.addToEx')}
        </button>
      )}
      {canBulkSendToCemetery && (
        <button
          onClick={onBulkSendToCemetery}
          style={{
            background: '#7c3aed',
            color: 'white',
            border: 'none',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {t('gameBoard.card.quickActionDescriptions.cemetery')}
        </button>
      )}
      {canBulkSendToBottom && (
        <button
          onClick={onBulkSendToBottom}
          style={{
            background: '#475569',
            color: 'white',
            border: 'none',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {t('gameBoard.card.quickActionDescriptions.sendToBottom')}
        </button>
      )}
      {canBulkBanish && (
        <button
          onClick={onBulkBanish}
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {t('gameBoard.card.quickActionDescriptions.banish')}
        </button>
      )}
    </div>
  );
};

export default CardSearchModalBulkActionBar;
