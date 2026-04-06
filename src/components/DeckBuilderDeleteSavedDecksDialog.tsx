import React from 'react';
import { useTranslation } from 'react-i18next';

type DeckBuilderDeleteSavedDecksDialogKind = 'all' | 'selected';

type DeckBuilderDeleteSavedDecksDialogProps = {
  kind: DeckBuilderDeleteSavedDecksDialogKind;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
};

const DIALOG_CONFIG: Record<
  DeckBuilderDeleteSavedDecksDialogKind,
  {
    ariaKey: string;
    titleKey: string;
    descKey: string;
    noteKey: string;
    confirmKey: string;
  }
> = {
  selected: {
    ariaKey: 'deckBuilder.modals.deleteSelectedDecks.aria',
    titleKey: 'deckBuilder.modals.deleteSelectedDecks.title',
    descKey: 'deckBuilder.modals.deleteSelectedDecks.desc',
    noteKey: 'deckBuilder.modals.deleteSelectedDecks.note',
    confirmKey: 'deckBuilder.myDecks.deleteSelected',
  },
  all: {
    ariaKey: 'deckBuilder.modals.deleteAllDecks.aria',
    titleKey: 'deckBuilder.modals.deleteAllDecks.title',
    descKey: 'deckBuilder.modals.deleteAllDecks.desc',
    noteKey: 'deckBuilder.modals.deleteAllDecks.note',
    confirmKey: 'deckBuilder.myDecks.deleteAll',
  },
};

const DeckBuilderDeleteSavedDecksDialog: React.FC<DeckBuilderDeleteSavedDecksDialogProps> = ({
  kind,
  count,
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
          maxWidth: '440px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <h3 style={{ margin: 0, color: '#fca5a5' }}>{t(config.titleKey)}</h3>
        <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
          {t(config.descKey, { count })}
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

export default DeckBuilderDeleteSavedDecksDialog;
