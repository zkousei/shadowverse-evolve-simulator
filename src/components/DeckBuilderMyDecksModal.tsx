import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FilteredSavedDeckEntry, SavedDeckSelectionUiState } from '../utils/deckBuilderSelections';
import DeckBuilderMyDecksToolbar from './DeckBuilderMyDecksToolbar';
import DeckBuilderSavedDeckItem from './DeckBuilderSavedDeckItem';

type DeckBuilderMyDecksModalProps = {
  canCreateNewSavedDeck: boolean;
  hardSavedDeckLimit: number;
  isSavedDeckSelectMode: boolean;
  savedDeckSelectionUiState: SavedDeckSelectionUiState;
  savedDeckSearch: string;
  filteredSavedDecks: FilteredSavedDeckEntry[];
  selectedSavedDeckIds: string[];
  selectedSavedDeckId: string | null;
  onClose: () => void;
  onSaveAsNew: () => void;
  onToggleSelectionMode: () => void;
  onDeleteAll: () => void;
  onSearchChange: (value: string) => void;
  onToggleShownSelection: () => void;
  onDeleteSelected: () => void;
  onToggleSelection: (deckId: string) => void;
  onLoad: (deckId: string) => void;
  onDuplicate: (deckId: string) => void;
  onExport: (deckId: string) => void;
  onDelete: (deckId: string) => void;
};

const DeckBuilderMyDecksModal: React.FC<DeckBuilderMyDecksModalProps> = ({
  canCreateNewSavedDeck,
  hardSavedDeckLimit,
  isSavedDeckSelectMode,
  savedDeckSelectionUiState,
  savedDeckSearch,
  filteredSavedDecks,
  selectedSavedDeckIds,
  selectedSavedDeckId,
  onClose,
  onSaveAsNew,
  onToggleSelectionMode,
  onDeleteAll,
  onSearchChange,
  onToggleShownSelection,
  onDeleteSelected,
  onToggleSelection,
  onLoad,
  onDuplicate,
  onExport,
  onDelete,
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('deckBuilder.myDecks.title')}
        onClick={(event) => event.stopPropagation()}
        className="glass-panel"
        style={{
          width: 'min(720px, calc(100vw - 32px))',
          maxHeight: 'min(80vh, 760px)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          overflow: 'hidden',
        }}
      >
        <DeckBuilderMyDecksToolbar
          canCreateNewSavedDeck={canCreateNewSavedDeck}
          hardSavedDeckLimit={hardSavedDeckLimit}
          isSavedDeckSelectMode={isSavedDeckSelectMode}
          savedDeckSelectionUiState={savedDeckSelectionUiState}
          savedDeckSearch={savedDeckSearch}
          filteredSavedDeckCount={filteredSavedDecks.length}
          selectedSavedDeckCount={selectedSavedDeckIds.length}
          onClose={onClose}
          onSaveAsNew={onSaveAsNew}
          onToggleSelectionMode={onToggleSelectionMode}
          onDeleteAll={onDeleteAll}
          onSearchChange={onSearchChange}
          onToggleShownSelection={onToggleShownSelection}
          onDeleteSelected={onDeleteSelected}
        />

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
          {filteredSavedDecks.length === 0 ? (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {t('deckBuilder.myDecks.noDecks')}
            </div>
          ) : (
            filteredSavedDecks.map(({ savedDeck, canExport }) => (
              <DeckBuilderSavedDeckItem
                key={savedDeck.id}
                savedDeck={savedDeck}
                canExport={canExport}
                isSavedDeckSelectMode={isSavedDeckSelectMode}
                isSelected={selectedSavedDeckIds.includes(savedDeck.id)}
                isCurrent={savedDeck.id === selectedSavedDeckId}
                canCreateNewSavedDeck={canCreateNewSavedDeck}
                hardSavedDeckLimit={hardSavedDeckLimit}
                onToggleSelection={() => onToggleSelection(savedDeck.id)}
                onLoad={() => onLoad(savedDeck.id)}
                onDuplicate={() => onDuplicate(savedDeck.id)}
                onExport={() => onExport(savedDeck.id)}
                onDelete={() => onDelete(savedDeck.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DeckBuilderMyDecksModal;
