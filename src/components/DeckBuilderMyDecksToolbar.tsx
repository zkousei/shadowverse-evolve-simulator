import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SavedDeckSelectionUiState } from '../utils/deckBuilderSelections';

type DeckBuilderMyDecksToolbarProps = {
  canCreateNewSavedDeck: boolean;
  hardSavedDeckLimit: number;
  isSavedDeckSelectMode: boolean;
  savedDeckSelectionUiState: SavedDeckSelectionUiState;
  savedDeckSearch: string;
  filteredSavedDeckCount: number;
  selectedSavedDeckCount: number;
  onClose: () => void;
  onSaveAsNew: () => void;
  onToggleSelectionMode: () => void;
  onDeleteAll: () => void;
  onSearchChange: (value: string) => void;
  onToggleShownSelection: () => void;
  onDeleteSelected: () => void;
};

const DeckBuilderMyDecksToolbar: React.FC<DeckBuilderMyDecksToolbarProps> = ({
  canCreateNewSavedDeck,
  hardSavedDeckLimit,
  isSavedDeckSelectMode,
  savedDeckSelectionUiState,
  savedDeckSearch,
  filteredSavedDeckCount,
  selectedSavedDeckCount,
  onClose,
  onSaveAsNew,
  onToggleSelectionMode,
  onDeleteAll,
  onSearchChange,
  onToggleShownSelection,
  onDeleteSelected,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>{t('deckBuilder.myDecks.title')}</h3>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {t('deckBuilder.myDecks.subtitle')}
          </p>
          <p style={{ margin: '0.35rem 0 0 0', color: '#fcd34d', fontSize: '0.78rem', lineHeight: 1.5, maxWidth: '38rem' }}>
            {t('deckBuilder.myDecks.disclaimer')}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            {t('common.buttons.close')}
          </button>
          <button
            type="button"
            onClick={onSaveAsNew}
            disabled={!canCreateNewSavedDeck}
            title={canCreateNewSavedDeck
              ? t('deckBuilder.deckArea.actions.saveAsNewTitle')
              : t('deckBuilder.deckArea.actions.saveDisabledTitle', { limit: hardSavedDeckLimit })}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${canCreateNewSavedDeck ? 'rgba(255,255,255,0.12)' : '#64748b'}`,
              background: canCreateNewSavedDeck ? 'var(--accent-secondary)' : '#475569',
              color: '#fff',
              fontWeight: 700,
              cursor: canCreateNewSavedDeck ? 'pointer' : 'not-allowed',
              opacity: canCreateNewSavedDeck ? 1 : 0.75,
            }}
          >
            {t('deckBuilder.deckArea.actions.saveAsNew')}
          </button>
          {savedDeckSelectionUiState.showSelectionToggle && (
            <button
              type="button"
              onClick={onToggleSelectionMode}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: isSavedDeckSelectMode ? 'var(--bg-overlay)' : 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {savedDeckSelectionUiState.selectionToggleAction === 'cancel-selection'
                ? t('deckBuilder.myDecks.cancelSelection')
                : t('deckBuilder.myDecks.select')}
            </button>
          )}
          {savedDeckSelectionUiState.showDeleteAll && (
            <button
              type="button"
              onClick={onDeleteAll}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(248, 113, 113, 0.45)',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t('deckBuilder.myDecks.deleteAll')}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={savedDeckSearch}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('deckBuilder.myDecks.search')}
          aria-label={t('deckBuilder.myDecks.searchAria')}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '0.65rem 0.8rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-surface)',
            color: 'var(--text-main)',
            outline: 'none',
          }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {t('deckBuilder.myDecks.shownCount', { count: filteredSavedDeckCount })}
        </span>
      </div>

      {savedDeckSelectionUiState.showBulkActions && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            padding: '0.75rem 0.9rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
            {t('deckBuilder.myDecks.selectedCount', { count: selectedSavedDeckCount })}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onToggleShownSelection}
              style={{
                padding: '0.45rem 0.7rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-overlay)',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              {savedDeckSelectionUiState.bulkSelectionAction === 'clear-selection'
                ? t('deckBuilder.myDecks.clearSelection')
                : t('deckBuilder.myDecks.selectAllShown')}
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              disabled={!savedDeckSelectionUiState.hasSelectedDecks}
              style={{
                padding: '0.45rem 0.7rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(248, 113, 113, 0.45)',
                background: savedDeckSelectionUiState.hasSelectedDecks ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface-elevated)',
                color: savedDeckSelectionUiState.hasSelectedDecks ? '#fca5a5' : 'var(--text-muted)',
                cursor: savedDeckSelectionUiState.hasSelectedDecks ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                opacity: savedDeckSelectionUiState.hasSelectedDecks ? 1 : 0.7,
              }}
            >
              {t('deckBuilder.myDecks.deleteSelected')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DeckBuilderMyDecksToolbar;
