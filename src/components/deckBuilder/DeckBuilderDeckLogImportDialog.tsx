import React from 'react';
import { useTranslation } from 'react-i18next';

type DeckBuilderDeckLogImportDialogProps = {
  deckLogInput: string;
  isImportingDeckLog: boolean;
  onDeckLogInputChange: (value: string) => void;
  onCancel: () => void;
  onImport: () => void;
};

const DeckBuilderDeckLogImportDialog: React.FC<DeckBuilderDeckLogImportDialogProps> = ({
  deckLogInput,
  isImportingDeckLog,
  onDeckLogInputChange,
  onCancel,
  onImport,
}) => {
  const { t } = useTranslation();
  const isImportDisabled = isImportingDeckLog || deckLogInput.trim().length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('deckBuilder.modals.deckLogImport.aria')}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        zIndex: 1100,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, color: '#67e8f9' }}>{t('deckBuilder.modals.deckLogImport.title')}</h3>
          <span
            style={{
              padding: '0.12rem 0.42rem',
              borderRadius: '999px',
              background: 'rgba(245, 158, 11, 0.18)',
              color: '#fcd34d',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {t('deckBuilder.deckArea.actions.betaBadge')}
          </span>
        </div>
        <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
          {t('deckBuilder.modals.deckLogImport.desc')}
        </p>
        <input
          type="text"
          value={deckLogInput}
          onChange={(event) => onDeckLogInputChange(event.target.value)}
          placeholder={t('deckBuilder.modals.deckLogImport.placeholder')}
          autoFocus
          style={{
            width: '100%',
            padding: '0.7rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-overlay)',
            color: 'var(--text-main)',
            fontSize: '0.95rem',
          }}
        />
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
          {t('deckBuilder.modals.deckLogImport.note')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              cursor: isImportingDeckLog ? 'not-allowed' : 'pointer',
              opacity: isImportingDeckLog ? 0.7 : 1,
            }}
          >
            {t('common.buttons.cancel')}
          </button>
          <button
            type="button"
            onClick={onImport}
            disabled={isImportDisabled}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontWeight: 700,
              cursor: isImportDisabled ? 'not-allowed' : 'pointer',
              opacity: isImportDisabled ? 0.75 : 1,
            }}
          >
            {isImportingDeckLog
              ? t('deckBuilder.modals.deckLogImport.importing')
              : t('deckBuilder.modals.deckLogImport.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilderDeckLogImportDialog;
