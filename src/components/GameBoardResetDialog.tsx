import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardResetDialogProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

const GameBoardResetDialog: React.FC<GameBoardResetDialogProps> = ({
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
        aria-label={t('gameBoard.modals.resetGame.title')}
        style={{
          background: 'var(--bg-surface-elevated)',
          padding: '2rem',
          borderRadius: 'var(--radius-md)',
          maxWidth: '400px',
          textAlign: 'center',
          border: '1px solid var(--border-light)',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0', color: '#fca5a5' }}>{t('gameBoard.modals.resetGame.title')}</h3>
        <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)' }}>
          {t('gameBoard.modals.resetGame.description')}
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
            style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
          >
            {t('gameBoard.modals.resetGame.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameBoardResetDialog;
