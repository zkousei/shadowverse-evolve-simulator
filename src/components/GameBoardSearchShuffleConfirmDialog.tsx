import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardSearchShuffleConfirmDialogProps = {
  targetLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

const GameBoardSearchShuffleConfirmDialog: React.FC<GameBoardSearchShuffleConfirmDialogProps> = ({
  targetLabel,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('gameBoard.modals.searchShuffle.title', { label: targetLabel })}
        style={{
          background: 'var(--bg-surface-elevated)',
          padding: '2rem',
          borderRadius: 'var(--radius-md)',
          maxWidth: '420px',
          textAlign: 'center',
          border: '1px solid var(--border-light)',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0', color: '#93c5fd' }}>
          {t('gameBoard.modals.searchShuffle.title', { label: targetLabel })}
        </h3>
        <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {t('gameBoard.modals.searchShuffle.description')}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', color: 'white', cursor: 'pointer', borderRadius: '4px' }}
          >
            {t('common.buttons.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ padding: '0.5rem 1rem', background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
          >
            {t('gameBoard.modals.searchShuffle.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameBoardSearchShuffleConfirmDialog;
