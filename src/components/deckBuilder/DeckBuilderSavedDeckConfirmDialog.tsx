import React from 'react';
import { useTranslation } from 'react-i18next';

type DeckBuilderSavedDeckConfirmDialogKind = 'load' | 'delete';

type DeckBuilderSavedDeckConfirmDialogProps = {
  kind: DeckBuilderSavedDeckConfirmDialogKind;
  deckName: string;
  onCancel: () => void;
  onConfirm: () => void;
};

const DIALOG_CONFIG: Record<
  DeckBuilderSavedDeckConfirmDialogKind,
  {
    ariaKey: string;
    titleKey: string;
    descKey: string;
    noteKey: string;
    confirmKey: string;
    titleColor: string;
    confirmBorder: string;
    confirmBackground: string;
  }
> = {
  load: {
    ariaKey: 'deckBuilder.modals.loadDeck.aria',
    titleKey: 'deckBuilder.modals.loadDeck.title',
    descKey: 'deckBuilder.modals.loadDeck.desc',
    noteKey: 'deckBuilder.modals.loadDeck.note',
    confirmKey: 'deckBuilder.myDecks.actions.load',
    titleColor: '#fcd34d',
    confirmBorder: '1px solid rgba(255,255,255,0.08)',
    confirmBackground: 'var(--accent-primary)',
  },
  delete: {
    ariaKey: 'deckBuilder.modals.deleteDeck.aria',
    titleKey: 'deckBuilder.modals.deleteDeck.title',
    descKey: 'deckBuilder.modals.deleteDeck.desc',
    noteKey: 'deckBuilder.modals.deleteDeck.note',
    confirmKey: 'deckBuilder.modals.buttons.delete',
    titleColor: '#fca5a5',
    confirmBorder: '1px solid #dc2626',
    confirmBackground: '#ef4444',
  },
};

const DeckBuilderSavedDeckConfirmDialog: React.FC<DeckBuilderSavedDeckConfirmDialogProps> = ({
  kind,
  deckName,
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
        zIndex: 1100,
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
          {t(config.descKey, { name: deckName })}
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
            {t('deckBuilder.modals.buttons.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: config.confirmBorder,
              background: config.confirmBackground,
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

export default DeckBuilderSavedDeckConfirmDialog;
