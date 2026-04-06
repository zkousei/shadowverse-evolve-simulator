import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardTopNDialogProps = {
  value: number;
  onValueChange: (value: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const GameBoardTopNDialog: React.FC<GameBoardTopNDialogProps> = ({
  value,
  onValueChange,
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
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('gameBoard.modals.topN.title')}
        style={{
          background: 'var(--bg-surface)',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          textAlign: 'center',
        }}
      >
        <h3 style={{ marginBottom: '1rem', color: 'white' }}>{t('gameBoard.modals.topN.title')}</h3>
        <input
          type="number"
          aria-label={t('gameBoard.modals.topN.title')}
          value={value}
          onChange={(event) => onValueChange(Number(event.target.value))}
          min="1"
          max="50"
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            background: 'black',
            color: 'white',
            border: '1px solid #444',
            fontSize: '1.25rem',
            textAlign: 'center',
            width: '80px',
            marginBottom: '1.5rem',
          }}
        />
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: '0.5rem 1.5rem', background: '#333', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
          >
            {t('common.buttons.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ padding: '0.5rem 1.5rem', background: 'var(--accent-primary)', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}
          >
            {t('gameBoard.modals.topN.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameBoardTopNDialog;
