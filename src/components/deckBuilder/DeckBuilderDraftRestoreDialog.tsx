import React from 'react';
import { useTranslation } from 'react-i18next';

type DeckBuilderDraftRestoreDialogProps = {
  onStartFresh: () => void;
  onContinue: () => void;
};

const DeckBuilderDraftRestoreDialog: React.FC<DeckBuilderDraftRestoreDialogProps> = ({
  onStartFresh,
  onContinue,
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('deckBuilder.modals.loadDeck.resumeAria')}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        zIndex: 1200,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <h3 style={{ margin: 0, color: '#fcd34d' }}>{t('deckBuilder.modals.loadDeck.resume')}</h3>
        <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
          {t('deckBuilder.modals.loadDeck.resumeSessionDesc')}
        </p>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
          {t('deckBuilder.modals.loadDeck.resumeSessionNote')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={onStartFresh}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(248, 113, 113, 0.35)',
              background: 'rgba(239, 68, 68, 0.10)',
              color: '#fca5a5',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t('deckBuilder.modals.loadDeck.startFresh')}
          </button>
          <button
            type="button"
            onClick={onContinue}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t('deckBuilder.modals.loadDeck.continue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilderDraftRestoreDialog;
