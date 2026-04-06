import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatSavedDeckUpdatedAt } from '../utils/deckBuilderDisplay';
import { formatSavedDeckCountSummary, formatSavedDeckRuleSummary } from '../utils/savedDeckPresentation';
import type { SavedDeckRecordV1 } from '../utils/deckStorage';

type DeckBuilderSavedDeckItemProps = {
  savedDeck: SavedDeckRecordV1;
  canExport: boolean;
  isSavedDeckSelectMode: boolean;
  isSelected: boolean;
  isCurrent: boolean;
  canCreateNewSavedDeck: boolean;
  hardSavedDeckLimit: number;
  onToggleSelection: () => void;
  onLoad: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
};

const DeckBuilderSavedDeckItem: React.FC<DeckBuilderSavedDeckItemProps> = ({
  savedDeck,
  canExport,
  isSavedDeckSelectMode,
  isSelected,
  isCurrent,
  canCreateNewSavedDeck,
  hardSavedDeckLimit,
  onToggleSelection,
  onLoad,
  onDuplicate,
  onExport,
  onDelete,
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.9rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface)',
        border: isCurrent
          ? '1px solid rgba(56, 189, 248, 0.5)'
          : '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap',
      }}
    >
      {isSavedDeckSelectMode && (
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '0.2rem',
          }}
        >
          <input
            type="checkbox"
            aria-label={t('deckBuilder.myDecks.selectDeck', { name: savedDeck.name })}
            checked={isSelected}
            onChange={onToggleSelection}
          />
        </label>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{savedDeck.name}</div>
          {isCurrent && (
            <span style={{ fontSize: '0.72rem', color: '#67e8f9', border: '1px solid rgba(103, 232, 249, 0.35)', borderRadius: '999px', padding: '0.12rem 0.45rem' }}>
              {t('deckBuilder.myDecks.current')}
            </span>
          )}
          {!canExport && (
            <span style={{ fontSize: '0.72rem', color: '#fca5a5', border: '1px solid rgba(248, 113, 113, 0.35)', borderRadius: '999px', padding: '0.12rem 0.45rem' }}>
              {t('deckBuilder.modals.loadDeck.illegalDeck')}
            </span>
          )}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
          {formatSavedDeckRuleSummary(savedDeck, t)}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
          {formatSavedDeckCountSummary(savedDeck, t)}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
          {t('deckBuilder.modals.loadDeck.updated', { at: formatSavedDeckUpdatedAt(savedDeck.updatedAt, i18n.language) })}
        </div>
        {!canExport && (
          <div style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: '0.3rem', lineHeight: 1.5 }}>
            {t('deckBuilder.modals.loadDeck.resolveIssues')}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
        {isSavedDeckSelectMode ? (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: '0.35rem' }}>
            {t('deckBuilder.modals.loadDeck.deleteBulkHint')}
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={onLoad}
              style={{
                padding: '0.45rem 0.7rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'var(--accent-primary)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t('deckBuilder.myDecks.actions.load')}
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              disabled={!canCreateNewSavedDeck}
              title={canCreateNewSavedDeck
                ? t('deckBuilder.myDecks.actions.duplicateTitle')
                : t('deckBuilder.deckArea.actions.duplicateDisabledTitle', { limit: hardSavedDeckLimit })}
              style={{
                padding: '0.45rem 0.7rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: canCreateNewSavedDeck ? 'var(--bg-overlay)' : 'var(--bg-surface-elevated)',
                color: canCreateNewSavedDeck ? 'var(--text-main)' : 'var(--text-muted)',
                cursor: canCreateNewSavedDeck ? 'pointer' : 'not-allowed',
                opacity: canCreateNewSavedDeck ? 1 : 0.7,
              }}
            >
              {t('deckBuilder.myDecks.actions.duplicate')}
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={!canExport}
              title={canExport ? t('deckBuilder.myDecks.actions.exportTitle') : t('deckBuilder.modals.loadDeck.resolveIssues')}
              style={{
                padding: '0.45rem 0.7rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: canExport ? 'var(--bg-overlay)' : 'var(--bg-surface-elevated)',
                color: canExport ? 'var(--text-main)' : 'var(--text-muted)',
                cursor: canExport ? 'pointer' : 'not-allowed',
                opacity: canExport ? 1 : 0.7,
              }}
            >
              {t('deckBuilder.myDecks.actions.export')}
            </button>
            <button
              type="button"
              onClick={onDelete}
              style={{
                padding: '0.45rem 0.7rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(248, 113, 113, 0.45)',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                cursor: 'pointer',
              }}
            >
              {t('deckBuilder.modals.buttons.delete')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DeckBuilderSavedDeckItem;
