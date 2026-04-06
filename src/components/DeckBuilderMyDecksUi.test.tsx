import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeckBuilderMyDecksModal from './DeckBuilderMyDecksModal';
import DeckBuilderMyDecksToolbar from './DeckBuilderMyDecksToolbar';
import DeckBuilderSavedDeckItem from './DeckBuilderSavedDeckItem';

import type { FilteredSavedDeckEntry, SavedDeckSelectionUiState } from '../utils/deckBuilderSelections';
import type { SavedDeckRecordV1 } from '../utils/deckStorage';

const sampleSavedDeck: SavedDeckRecordV1 = {
  schemaVersion: 1,
  id: 'saved-1',
  name: 'Alpha Deck',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-05T12:34:56.000Z',
  ruleConfig: {
    format: 'constructed',
    identityType: 'class',
    selectedClass: 'ロイヤル',
    selectedTitle: null,
    selectedClasses: [null, null],
  },
  sections: {
    main: [{ cardId: 'BP01-001', count: 40 }],
    evolve: [{ cardId: 'EV01-001', count: 10 }],
    leader: [{ cardId: 'LDR01-001', count: 1 }],
    token: [{ cardId: 'TK01-001', count: 2 }],
  },
};

const singleSavedDeckEntry: FilteredSavedDeckEntry[] = [
  {
    savedDeck: sampleSavedDeck,
    canExport: true,
  },
];

const bulkSelectionUiState: SavedDeckSelectionUiState = {
  showSelectionToggle: true,
  selectionToggleAction: 'cancel-selection',
  showDeleteAll: true,
  showBulkActions: true,
  hasSelectedDecks: true,
  bulkSelectionAction: 'clear-selection',
};

describe('DeckBuilder extracted UI components - my decks', () => {
  it('renders My Decks toolbar and wires bulk actions', () => {
    const onClose = vi.fn();
    const onSaveAsNew = vi.fn();
    const onToggleSelectionMode = vi.fn();
    const onDeleteAll = vi.fn();
    const onSearchChange = vi.fn();
    const onToggleShownSelection = vi.fn();
    const onDeleteSelected = vi.fn();

    render(
      <DeckBuilderMyDecksToolbar
        canCreateNewSavedDeck={true}
        hardSavedDeckLimit={200}
        isSavedDeckSelectMode={true}
        savedDeckSelectionUiState={bulkSelectionUiState}
        savedDeckSearch=""
        filteredSavedDeckCount={3}
        selectedSavedDeckCount={2}
        onClose={onClose}
        onSaveAsNew={onSaveAsNew}
        onToggleSelectionMode={onToggleSelectionMode}
        onDeleteAll={onDeleteAll}
        onSearchChange={onSearchChange}
        onToggleShownSelection={onToggleShownSelection}
        onDeleteSelected={onDeleteSelected}
      />
    );

    expect(screen.getByText('Saved in this browser')).toBeInTheDocument();
    expect(screen.getByText('3 decks')).toBeInTheDocument();
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save as New Deck' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Selection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete All' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search saved decks' }), { target: { value: 'Alpha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear Selection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaveAsNew).toHaveBeenCalledTimes(1);
    expect(onToggleSelectionMode).toHaveBeenCalledTimes(1);
    expect(onDeleteAll).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('Alpha');
    expect(onToggleShownSelection).toHaveBeenCalledTimes(1);
    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
  });

  it('renders saved deck item actions and select mode states', () => {
    const onToggleSelection = vi.fn();
    const onLoad = vi.fn();
    const onDuplicate = vi.fn();
    const onExport = vi.fn();
    const onDelete = vi.fn();

    const { rerender } = render(
      <DeckBuilderSavedDeckItem
        savedDeck={sampleSavedDeck}
        canExport={false}
        isSavedDeckSelectMode={false}
        isSelected={false}
        isCurrent={true}
        canCreateNewSavedDeck={true}
        hardSavedDeckLimit={200}
        onToggleSelection={onToggleSelection}
        onLoad={onLoad}
        onDuplicate={onDuplicate}
        onExport={onExport}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Alpha Deck')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Illegal deck')).toBeInTheDocument();
    expect(screen.getByText('Resolve deck issues after loading before exporting.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onExport).not.toHaveBeenCalled();

    rerender(
      <DeckBuilderSavedDeckItem
        savedDeck={sampleSavedDeck}
        canExport={true}
        isSavedDeckSelectMode={true}
        isSelected={true}
        isCurrent={false}
        canCreateNewSavedDeck={true}
        hardSavedDeckLimit={200}
        onToggleSelection={onToggleSelection}
        onLoad={onLoad}
        onDuplicate={onDuplicate}
        onExport={onExport}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Alpha Deck' }));
    expect(screen.getByText('Select decks to delete them in bulk.')).toBeInTheDocument();
    expect(onToggleSelection).toHaveBeenCalledTimes(1);
  });

  it('renders My Decks modal and wires backdrop and deck-specific actions', () => {
    const onClose = vi.fn();
    const onSaveAsNew = vi.fn();
    const onToggleSelectionMode = vi.fn();
    const onDeleteAll = vi.fn();
    const onSearchChange = vi.fn();
    const onToggleShownSelection = vi.fn();
    const onDeleteSelected = vi.fn();
    const onToggleSelection = vi.fn();
    const onLoad = vi.fn();
    const onDuplicate = vi.fn();
    const onExport = vi.fn();
    const onDelete = vi.fn();

    render(
      <DeckBuilderMyDecksModal
        canCreateNewSavedDeck={true}
        hardSavedDeckLimit={200}
        isSavedDeckSelectMode={false}
        savedDeckSelectionUiState={{
          showSelectionToggle: true,
          selectionToggleAction: 'enter-selection',
          showDeleteAll: true,
          showBulkActions: false,
          hasSelectedDecks: false,
          bulkSelectionAction: 'select-all-shown',
        }}
        savedDeckSearch=""
        filteredSavedDecks={singleSavedDeckEntry}
        selectedSavedDeckIds={[]}
        selectedSavedDeckId="saved-1"
        onClose={onClose}
        onSaveAsNew={onSaveAsNew}
        onToggleSelectionMode={onToggleSelectionMode}
        onDeleteAll={onDeleteAll}
        onSearchChange={onSearchChange}
        onToggleShownSelection={onToggleShownSelection}
        onDeleteSelected={onDeleteSelected}
        onToggleSelection={onToggleSelection}
        onLoad={onLoad}
        onDuplicate={onDuplicate}
        onExport={onExport}
        onDelete={onDelete}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'My Decks' });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onLoad).toHaveBeenCalledWith('saved-1');
    expect(onDuplicate).toHaveBeenCalledWith('saved-1');
    expect(onExport).toHaveBeenCalledWith('saved-1');
    expect(onDelete).toHaveBeenCalledWith('saved-1');

    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
