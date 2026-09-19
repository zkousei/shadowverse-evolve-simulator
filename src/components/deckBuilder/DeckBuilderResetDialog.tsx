import React from 'react';
import { useTranslation } from 'react-i18next';

type DeckBuilderResetDialogKind = 'deck' | 'builder';

type DeckBuilderResetDialogProps = {
  kind: DeckBuilderResetDialogKind;
  onCancel: () => void;
  onConfirm: () => void;
};

const DIALOG_CONFIG: Record<
  DeckBuilderResetDialogKind,
  {
    ariaKey: string;
    titleKey: string;
    descKey: string;
    noteKey: string;
    confirmKey: string;
    titleColor: string;
  }
> = {
  deck: {
    ariaKey: 'deckBuilder.modals.resetDeck.aria',
    titleKey: 'deckBuilder.modals.resetDeck.title',
    descKey: 'deckBuilder.modals.resetDeck.desc',
    noteKey: 'deckBuilder.modals.resetDeck.descNote',
    confirmKey: 'deckBuilder.modals.resetDeck.confirm',
    titleColor: '#fcd34d',
  },
  builder: {
    ariaKey: 'deckBuilder.modals.resetBuilder.aria',
    titleKey: 'deckBuilder.modals.resetBuilder.title',
    descKey: 'deckBuilder.modals.resetBuilder.desc',
    noteKey: 'deckBuilder.modals.resetBuilder.descNote',
    confirmKey: 'deckBuilder.modals.resetBuilder.confirm',
    titleColor: '#fca5a5',
  },
};

const DeckBuilderResetDialog: React.FC<DeckBuilderResetDialogProps> = ({
  kind,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const config = DIALOG_CONFIG[kind];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(config.ariaKey)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        zIndex: 1000,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <h3 style={{ margin: 0, color: config.titleColor }}>{t(config.titleKey)}</h3>
        <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
          {t(config.descKey)}
        </p>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
          {t(config.noteKey)}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            {t('common.buttons.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #dc2626',
              background: '#ef4444',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t(config.confirmKey)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilderResetDialog;
