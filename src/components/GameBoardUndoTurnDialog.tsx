import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardUndoTurnDialogProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

const GameBoardUndoTurnDialog: React.FC<GameBoardUndoTurnDialogProps> = ({
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
        aria-label={t('gameBoard.modals.undoTurn.title')}
        style={{
          background: 'var(--bg-surface-elevated)',
          padding: '2rem',
          borderRadius: 'var(--radius-md)',
          maxWidth: '420px',
          textAlign: 'center',
          border: '1px solid var(--border-light)',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0', color: '#f9a8d4' }}>{t('gameBoard.modals.undoTurn.title')}</h3>
        <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {t('gameBoard.modals.undoTurn.description')}
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
            style={{ padding: '0.5rem 1rem', background: '#ec4899', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
          >
            {t('gameBoard.modals.undoTurn.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameBoardUndoTurnDialog;
