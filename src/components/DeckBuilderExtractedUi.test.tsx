import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeckBuilderDeckControls from './DeckBuilderDeckControls';
import DeckBuilderDeckHeader from './DeckBuilderDeckHeader';
import DeckBuilderDeckLogImportDialog from './DeckBuilderDeckLogImportDialog';
import DeckBuilderDeckPane from './DeckBuilderDeckPane';
import DeckBuilderDeckSection from './DeckBuilderDeckSection';
import DeckBuilderDeleteSavedDecksDialog from './DeckBuilderDeleteSavedDecksDialog';
import DeckBuilderDraftRestoreDialog from './DeckBuilderDraftRestoreDialog';
import DeckBuilderHoverPreview from './DeckBuilderHoverPreview';
import DeckBuilderLibraryCard from './DeckBuilderLibraryCard';
import DeckBuilderLibraryFilters from './DeckBuilderLibraryFilters';
import DeckBuilderLibraryPane from './DeckBuilderLibraryPane';
import DeckBuilderMyDecksModal from './DeckBuilderMyDecksModal';
import DeckBuilderMyDecksToolbar from './DeckBuilderMyDecksToolbar';
import DeckBuilderPaginationControls from './DeckBuilderPaginationControls';
import DeckBuilderPreviewModal from './DeckBuilderPreviewModal';
import DeckBuilderResetDialog from './DeckBuilderResetDialog';
import DeckBuilderRulePanel from './DeckBuilderRulePanel';
import DeckBuilderSaveFeedback from './DeckBuilderSaveFeedback';
import DeckBuilderSavedDeckItem from './DeckBuilderSavedDeckItem';
import DeckBuilderSavedDeckConfirmDialog from './DeckBuilderSavedDeckConfirmDialog';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { FilteredSavedDeckEntry, SavedDeckSelectionUiState } from '../utils/deckBuilderSelections';
import type { CardDetail } from '../utils/cardDetails';
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

const bulkSelectionUiState: SavedDeckSelectionUiState = {
  showSelectionToggle: true,
  selectionToggleAction: 'cancel-selection',
  showDeleteAll: true,
  showBulkActions: true,
  hasSelectedDecks: true,
  bulkSelectionAction: 'clear-selection',
};

const singleSavedDeckEntry: FilteredSavedDeckEntry[] = [
  {
    savedDeck: sampleSavedDeck,
    canExport: true,
  },
];

const sampleCard: DeckBuilderCardData = {
  id: 'BP01-001',
  name: 'Alpha Knight',
  image: '/alpha.png',
  cost: '1',
  class: 'ロイヤル',
  title: 'Hero Tale',
  type: 'フォロワー',
  subtype: '兵士',
  rarity: 'LG',
  product_name: 'Booster Pack 1',
  atk: '2',
  hp: '2',
  ability_text: '[ファンファーレ] テスト能力。',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const sampleCardDetail: CardDetail = {
  id: 'BP01-001',
  name: 'Alpha Knight',
  image: '/alpha.png',
  className: 'ロイヤル',
  title: 'Hero Tale',
  type: 'フォロワー',
  subtype: '兵士',
  cost: '1',
  atk: 2,
  hp: 2,
  abilityText: '[ファンファーレ] テスト能力。',
};

describe('DeckBuilder extracted UI components', () => {
  it('renders deck header actions and wires callbacks', () => {
    const onDeckNameChange = vi.fn();
    const onSave = vi.fn();
    const onMakeUnsavedCopy = vi.fn();
    const onOpenMyDecks = vi.fn();
    const onImportDeck = vi.fn();
    const onOpenDeckLogImport = vi.fn();
    const onExportDeck = vi.fn();

    const { container } = render(
      <DeckBuilderDeckHeader
        deckName="Alpha Deck"
        canSaveCurrentDeck={true}
        canExportDeck={true}
        selectedSavedDeckId="saved-1"
        saveStateMessage="Unsaved changes"
        draftRestored={false}
        hasReachedSoftLimit={false}
        hasReachedHardLimit={false}
        savedDeckCount={1}
        hardSavedDeckLimit={200}
        onDeckNameChange={onDeckNameChange}
        onSave={onSave}
        onMakeUnsavedCopy={onMakeUnsavedCopy}
        onOpenMyDecks={onOpenMyDecks}
        onImportDeck={onImportDeck}
        onOpenDeckLogImport={onOpenDeckLogImport}
        onExportDeck={onExportDeck}
      />
    );

    fireEvent.change(screen.getByDisplayValue('Alpha Deck'), { target: { value: 'Beta Deck' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Make Unsaved Copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    fireEvent.click(screen.getByRole('button', { name: /Import from DeckLog/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [new File(['{}'], 'deck.json', { type: 'application/json' })] },
    });

    expect(onDeckNameChange).toHaveBeenCalledWith('Beta Deck');
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onMakeUnsavedCopy).toHaveBeenCalledTimes(1);
    expect(onOpenMyDecks).toHaveBeenCalledTimes(1);
    expect(onOpenDeckLogImport).toHaveBeenCalledTimes(1);
    expect(onExportDeck).toHaveBeenCalledTimes(1);
    expect(onImportDeck).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('renders deck controls and wires sort and reset actions', () => {
    const onDeckSortModeChange = vi.fn();
    const onOpenResetDeckDialog = vi.fn();
    const onOpenResetBuilderDialog = vi.fn();

    render(
      <DeckBuilderDeckControls
        deckSortMode="added"
        onDeckSortModeChange={onDeckSortModeChange}
        onOpenResetDeckDialog={onOpenResetDeckDialog}
        onOpenResetBuilderDialog={onOpenResetBuilderDialog}
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck sort' }), { target: { value: 'cost' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Builder' }));

    expect(onDeckSortModeChange).toHaveBeenCalledWith('cost');
    expect(onOpenResetDeckDialog).toHaveBeenCalledTimes(1);
    expect(onOpenResetBuilderDialog).toHaveBeenCalledTimes(1);
  });

  it('renders DeckLog import dialog and enforces import availability', () => {
    const onDeckLogInputChange = vi.fn();
    const onCancel = vi.fn();
    const onImport = vi.fn();

    render(
      <DeckBuilderDeckLogImportDialog
        deckLogInput=""
        isImportingDeckLog={false}
        onDeckLogInputChange={onDeckLogInputChange}
        onCancel={onCancel}
        onImport={onImport}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. a DeckLog code or a public DeckLog URL'), {
      target: { value: 'ABC123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDeckLogInputChange).toHaveBeenCalledWith('ABC123');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
  });

  it('renders saved deck confirm dialogs for load and delete', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    const { rerender } = render(
      <DeckBuilderSavedDeckConfirmDialog
        kind="load"
        deckName="Alpha Deck"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Load saved deck confirmation' })).toBeInTheDocument();
    expect(screen.getByText('Replace the current unsaved changes with "Alpha Deck"?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    rerender(
      <DeckBuilderSavedDeckConfirmDialog
        kind="delete"
        deckName="Alpha Deck"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Delete saved deck confirmation' })).toBeInTheDocument();
    expect(screen.getByText('Delete "Alpha Deck" from My Decks on this browser?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders bulk delete dialog and wires actions', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeckBuilderDeleteSavedDecksDialog
        kind="selected"
        count={3}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Delete selected saved decks confirmation' })).toBeInTheDocument();
    expect(screen.getByText('Delete 3 selected saved decks from My Decks on this browser?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders draft restore dialog and wires both choices', () => {
    const onStartFresh = vi.fn();
    const onContinue = vi.fn();

    render(
      <DeckBuilderDraftRestoreDialog
        onStartFresh={onStartFresh}
        onContinue={onContinue}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Resume previous session' })).toBeInTheDocument();
    expect(screen.getByText('Restore the last Deck Builder session from this browser?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start Fresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onStartFresh).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders reset dialogs for deck and builder actions', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    const { rerender } = render(
      <DeckBuilderResetDialog
        kind="deck"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Reset deck confirmation' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    rerender(
      <DeckBuilderResetDialog
        kind="builder"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Reset builder confirmation' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset' }));

    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders save feedback with correct live regions', () => {
    const { rerender } = render(
      <DeckBuilderSaveFeedback
        kind="success"
        message="Saved Alpha Deck."
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Saved Alpha Deck.');

    rerender(
      <DeckBuilderSaveFeedback
        kind="warning"
        message="Saving is disabled."
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Saving is disabled.');
  });

  it('renders pagination controls and wires navigation callbacks', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    render(
      <DeckBuilderPaginationControls
        page={1}
        totalPages={4}
        canGoPrev={true}
        canGoNext={true}
        onPrev={onPrev}
        onNext={onNext}
      />
    );

    expect(screen.getByText('2 / 4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Prev' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('renders library filters and wires filter callbacks', () => {
    const onSearchChange = vi.fn();
    const onHideSameNameVariantsChange = vi.fn();
    const onReset = vi.fn();
    const onDeckSectionFilterChange = vi.fn();
    const onClassFilterChange = vi.fn();
    const onCardTypeFilterChange = vi.fn();
    const onCostFilterChange = vi.fn();
    const onExpansionFilterChange = vi.fn();
    const onRarityFilterChange = vi.fn();
    const onProductNameFilterChange = vi.fn();
    const onSubtypeSearchChange = vi.fn();
    const onAddSubtype = vi.fn();
    const onRemoveSubtype = vi.fn();

    render(
      <DeckBuilderLibraryFilters
        search=""
        hideSameNameVariants={false}
        deckSectionFilter="All"
        cardTypeFilter="All"
        costFilter="All"
        classFilter="All"
        expansionFilter="All"
        rarityFilter="All"
        productNameFilter="All"
        subtypeSearch=""
        selectedSubtypeTags={['Soldier']}
        filteredSubtypeOptions={['Soldier', 'Academy']}
        costFilterValues={['All', '1', '2']}
        deckSectionFilterValues={['All', 'main', 'evolve', 'leader', 'token']}
        cardTypeFilterValues={['All', 'follower', 'spell', 'amulet']}
        expansions={['Booster Pack 1']}
        rarities={['LG']}
        productNames={['Booster Pack 1']}
        canAddSubtype={true}
        onSearchChange={onSearchChange}
        onHideSameNameVariantsChange={onHideSameNameVariantsChange}
        onReset={onReset}
        onDeckSectionFilterChange={onDeckSectionFilterChange}
        onClassFilterChange={onClassFilterChange}
        onCardTypeFilterChange={onCardTypeFilterChange}
        onCostFilterChange={onCostFilterChange}
        onExpansionFilterChange={onExpansionFilterChange}
        onRarityFilterChange={onRarityFilterChange}
        onProductNameFilterChange={onProductNameFilterChange}
        onSubtypeSearchChange={onSubtypeSearchChange}
        onAddSubtype={onAddSubtype}
        onRemoveSubtype={onRemoveSubtype}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search cards by name...'), { target: { value: 'Alpha' } });
    fireEvent.click(screen.getByLabelText('Hide same-name variants'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Filters' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Deck section filter' })).getByRole('button', { name: 'Main' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Class filter' })).getByRole('button', { name: 'Royal' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Card type filter' })).getByRole('button', { name: 'Follower' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Cost filter' })).getByRole('button', { name: '2' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Expansion filter' }), { target: { value: 'Booster Pack 1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Rarity filter' }), { target: { value: 'LG' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Product filter' }), { target: { value: 'Booster Pack 1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Subtype filter input' }), { target: { value: 'Soldier' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: /Soldier/ }));

    expect(onSearchChange).toHaveBeenCalledWith('Alpha');
    expect(onHideSameNameVariantsChange).toHaveBeenCalledWith(true);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onDeckSectionFilterChange).toHaveBeenCalledWith('main');
    expect(onClassFilterChange).toHaveBeenCalledWith('ロイヤル');
    expect(onCardTypeFilterChange).toHaveBeenCalledWith('follower');
    expect(onCostFilterChange).toHaveBeenCalledWith('2');
    expect(onExpansionFilterChange).toHaveBeenCalledWith('Booster Pack 1');
    expect(onRarityFilterChange).toHaveBeenCalledWith('LG');
    expect(onProductNameFilterChange).toHaveBeenCalledWith('Booster Pack 1');
    expect(onSubtypeSearchChange).toHaveBeenCalledWith('Soldier');
    expect(onAddSubtype).toHaveBeenCalledTimes(1);
    expect(onRemoveSubtype).toHaveBeenCalledWith('Soldier');
  });

  it('renders rule panel across constructed and crossover states', () => {
    const onDeckFormatChange = vi.fn();
    const onDeckIdentityTypeChange = vi.fn();
    const onConstructedClassChange = vi.fn();
    const onConstructedTitleChange = vi.fn();
    const onCrossoverClassChange = vi.fn();

    const { rerender } = render(
      <DeckBuilderRulePanel
        deckRuleConfig={{
          format: 'constructed',
          identityType: 'class',
          selectedClass: null,
          selectedTitle: null,
          selectedClasses: [null, null],
        }}
        titles={['Hero Tale']}
        crossoverClassOptionsA={['ロイヤル', 'ウィッチ']}
        crossoverClassOptionsB={['ウィッチ']}
        isRuleReady={false}
        deckIssueMessages={[]}
        onDeckFormatChange={onDeckFormatChange}
        onDeckIdentityTypeChange={onDeckIdentityTypeChange}
        onConstructedClassChange={onConstructedClassChange}
        onConstructedTitleChange={onConstructedTitleChange}
        onCrossoverClassChange={onCrossoverClassChange}
      />
    );

    expect(screen.getByText('Select a class or title to enable constructed deck building.')).toBeInTheDocument();
    expect(screen.getByText('This deck is legal and ready to export.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck format' }), { target: { value: 'crossover' } });
    fireEvent.click(screen.getByRole('button', { name: 'Title' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Constructed class' }), { target: { value: 'ロイヤル' } });

    rerender(
      <DeckBuilderRulePanel
        deckRuleConfig={{
          format: 'constructed',
          identityType: 'title',
          selectedClass: null,
          selectedTitle: null,
          selectedClasses: [null, null],
        }}
        titles={['Hero Tale']}
        crossoverClassOptionsA={['ロイヤル', 'ウィッチ']}
        crossoverClassOptionsB={['ウィッチ']}
        isRuleReady={false}
        deckIssueMessages={[]}
        onDeckFormatChange={onDeckFormatChange}
        onDeckIdentityTypeChange={onDeckIdentityTypeChange}
        onConstructedClassChange={onConstructedClassChange}
        onConstructedTitleChange={onConstructedTitleChange}
        onCrossoverClassChange={onCrossoverClassChange}
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Constructed title' }), { target: { value: 'Hero Tale' } });

    rerender(
      <DeckBuilderRulePanel
        deckRuleConfig={{
          format: 'crossover',
          identityType: 'class',
          selectedClass: null,
          selectedTitle: null,
          selectedClasses: [null, null],
        }}
        titles={['Hero Tale']}
        crossoverClassOptionsA={['ロイヤル', 'ウィッチ']}
        crossoverClassOptionsB={['ウィッチ']}
        isRuleReady={false}
        deckIssueMessages={[]}
        onDeckFormatChange={onDeckFormatChange}
        onDeckIdentityTypeChange={onDeckIdentityTypeChange}
        onConstructedClassChange={onConstructedClassChange}
        onConstructedTitleChange={onConstructedTitleChange}
        onCrossoverClassChange={onCrossoverClassChange}
      />
    );

    expect(screen.getByText('Select two different classes to enable crossover deck building.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Crossover class A' }), { target: { value: 'ロイヤル' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Crossover class B' }), { target: { value: 'ウィッチ' } });

    expect(onDeckFormatChange).toHaveBeenCalledWith('crossover');
    expect(onDeckIdentityTypeChange).toHaveBeenCalledWith('title');
    expect(onConstructedClassChange).toHaveBeenCalledWith('ロイヤル');
    expect(onConstructedTitleChange).toHaveBeenCalledWith('Hero Tale');
    expect(onCrossoverClassChange).toHaveBeenNthCalledWith(1, 0, 'ロイヤル');
    expect(onCrossoverClassChange).toHaveBeenNthCalledWith(2, 1, 'ウィッチ');
  });

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

  it('renders a library card and wires preview and add actions', () => {
    const onOpenPreview = vi.fn();
    const onAddToSection = vi.fn();

    render(
      <DeckBuilderLibraryCard
        card={sampleCard}
        detail={sampleCardDetail}
        allowedSections={['main', 'token']}
        canAddToSection={(section) => section === 'main'}
        onOpenPreview={onOpenPreview}
        onAddToSection={onAddToSection}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview Alpha Knight' }));
    fireEvent.click(screen.getByTitle('Add to Main Deck'));
    expect(screen.getByTitle('Add to Token Deck')).toBeDisabled();

    expect(onOpenPreview).toHaveBeenCalledWith(sampleCard);
    expect(onAddToSection).toHaveBeenCalledWith(sampleCard, 'main');
  });

  it('renders deck section rows and wires hover, add, and remove actions', () => {
    const onRemove = vi.fn();
    const onAdd = vi.fn();
    const onCardMouseEnter = vi.fn();
    const onCardMouseMove = vi.fn();
    const onCardMouseLeave = vi.fn();

    render(
      <DeckBuilderDeckSection
        title="Main Deck"
        countLabel="1/50"
        groupedCards={[{ card: sampleCard, count: 2 }]}
        targetSection="main"
        removeTitle="Remove one copy from Main Deck"
        addTitle="Add to Main Deck"
        canAddCard={() => true}
        onRemove={onRemove}
        onAdd={onAdd}
        onCardMouseEnter={onCardMouseEnter}
        onCardMouseMove={onCardMouseMove}
        onCardMouseLeave={onCardMouseLeave}
      />
    );

    const cardName = screen.getByText('Alpha Knight');
    fireEvent.mouseEnter(cardName);
    fireEvent.mouseMove(cardName);
    fireEvent.mouseLeave(cardName);
    fireEvent.click(screen.getByTitle('Remove one copy from Main Deck'));
    fireEvent.click(screen.getByTitle('Add to Main Deck'));

    expect(screen.getByText('× 2')).toBeInTheDocument();
    expect(onCardMouseEnter).toHaveBeenCalled();
    expect(onCardMouseMove).toHaveBeenCalled();
    expect(onCardMouseLeave).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('BP01-001');
    expect(onAdd).toHaveBeenCalledWith(sampleCard);
  });

  it('renders the preview modal and wires overlay and close button actions', () => {
    const onClose = vi.fn();

    render(
      <DeckBuilderPreviewModal
        previewCard={sampleCard}
        previewDetail={sampleCardDetail}
        onClose={onClose}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Alpha Knight preview' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('BP01-001')).toBeInTheDocument();
    expect(screen.getByText('[ファンファーレ] テスト能力。')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close card preview' }));
    fireEvent.click(dialog.parentElement as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders hover preview content with the expected fixed position', () => {
    const { container } = render(
      <DeckBuilderHoverPreview
        hoveredDeckCard={sampleCard}
        hoveredDetail={sampleCardDetail}
        left={120}
        top={240}
        width={180}
        maxHeight={320}
      />
    );

    expect(screen.getByText('Alpha Knight')).toBeInTheDocument();
    const image = screen.getByAltText('Alpha Knight');
    expect(image).toBeInTheDocument();
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.left).toBe('120px');
    expect(wrapper.style.top).toBe('240px');
    expect(wrapper.style.width).toBe('180px');
    expect(wrapper.style.maxHeight).toBe('320px');
  });

  it('renders the library pane and delegates filter, pagination, and card actions', () => {
    const onSearchChange = vi.fn();
    const onHideSameNameVariantsChange = vi.fn();
    const onReset = vi.fn();
    const onDeckSectionFilterChange = vi.fn();
    const onClassFilterChange = vi.fn();
    const onCardTypeFilterChange = vi.fn();
    const onCostFilterChange = vi.fn();
    const onExpansionFilterChange = vi.fn();
    const onRarityFilterChange = vi.fn();
    const onProductNameFilterChange = vi.fn();
    const onSubtypeSearchChange = vi.fn();
    const onAddSubtype = vi.fn();
    const onRemoveSubtype = vi.fn();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onOpenPreview = vi.fn();
    const onAddToSection = vi.fn();

    render(
      <DeckBuilderLibraryPane
        isLoading={false}
        paginatedCards={[sampleCard]}
        cardDetailLookup={{ 'BP01-001': sampleCardDetail }}
        search=""
        hideSameNameVariants={false}
        deckSectionFilter="All"
        classFilter="All"
        cardTypeFilter="All"
        costFilter="All"
        expansionFilter="All"
        rarityFilter="All"
        productNameFilter="All"
        subtypeSearch=""
        selectedSubtypeTags={[]}
        filteredSubtypeOptions={['兵士']}
        costFilterValues={['All', '1']}
        deckSectionFilterValues={['All', 'main']}
        cardTypeFilterValues={['All', 'follower']}
        expansions={['Booster Pack 1']}
        rarities={['LG']}
        productNames={['Booster Pack 1']}
        canAddSubtype={true}
        page={0}
        totalPages={2}
        canGoPrev={false}
        canGoNext={true}
        getAllowedSections={() => ['main']}
        canAddToSection={() => true}
        onSearchChange={onSearchChange}
        onHideSameNameVariantsChange={onHideSameNameVariantsChange}
        onReset={onReset}
        onDeckSectionFilterChange={onDeckSectionFilterChange}
        onClassFilterChange={onClassFilterChange}
        onCardTypeFilterChange={onCardTypeFilterChange}
        onCostFilterChange={onCostFilterChange}
        onExpansionFilterChange={onExpansionFilterChange}
        onRarityFilterChange={onRarityFilterChange}
        onProductNameFilterChange={onProductNameFilterChange}
        onSubtypeSearchChange={onSubtypeSearchChange}
        onAddSubtype={onAddSubtype}
        onRemoveSubtype={onRemoveSubtype}
        onPrev={onPrev}
        onNext={onNext}
        onOpenPreview={onOpenPreview}
        onAddToSection={onAddToSection}
      />
    );

    expect(screen.getByRole('heading', { name: 'Card Library' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview Alpha Knight' }));
    fireEvent.click(screen.getByTitle('Add to Main Deck'));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onOpenPreview).toHaveBeenCalledWith(sampleCard);
    expect(onAddToSection).toHaveBeenCalledWith(sampleCard, 'main');
  });

  it('renders the deck pane and delegates header, rules, controls, and section actions', () => {
    const onDeckNameChange = vi.fn();
    const onSave = vi.fn();
    const onMakeUnsavedCopy = vi.fn();
    const onOpenMyDecks = vi.fn();
    const onImportDeck = vi.fn();
    const onOpenDeckLogImport = vi.fn();
    const onExportDeck = vi.fn();
    const onDeckFormatChange = vi.fn();
    const onDeckIdentityTypeChange = vi.fn();
    const onConstructedClassChange = vi.fn();
    const onConstructedTitleChange = vi.fn();
    const onCrossoverClassChange = vi.fn();
    const onDeckSortModeChange = vi.fn();
    const onOpenResetDeckDialog = vi.fn();
    const onOpenResetBuilderDialog = vi.fn();
    const onRemoveLeader = vi.fn();
    const onRemoveMain = vi.fn();
    const onAddMain = vi.fn();
    const onRemoveEvolve = vi.fn();
    const onAddEvolve = vi.fn();
    const onRemoveToken = vi.fn();
    const onAddToken = vi.fn();
    const onDeckCardMouseEnter = vi.fn();
    const onDeckCardMouseMove = vi.fn();
    const onDeckCardMouseLeave = vi.fn();

    const { container } = render(
      <DeckBuilderDeckPane
        deckName="Alpha Deck"
        canSaveCurrentDeck={true}
        canExportDeck={true}
        selectedSavedDeckId={null}
        saveStateMessage="Unsaved changes"
        draftRestored={false}
        hasReachedSoftLimit={false}
        hasReachedHardLimit={false}
        savedDeckCount={1}
        hardSavedDeckLimit={200}
        deckRuleConfig={{
          format: 'constructed',
          identityType: 'class',
          selectedClass: 'ロイヤル',
          selectedTitle: null,
          selectedClasses: [null, null],
        }}
        titles={['Hero Tale']}
        crossoverClassOptionsA={['ロイヤル', 'ウィッチ']}
        crossoverClassOptionsB={['ウィッチ']}
        isRuleReady={true}
        deckIssueMessages={[]}
        deckSortMode="added"
        leaderCount={1}
        leaderLimit={1}
        groupedLeaderCards={[{ card: { ...sampleCard, id: 'LDR01-001', name: 'Leader Luna', deck_section: 'leader', card_kind_normalized: 'leader' }, count: 1 }]}
        mainDeckCount={1}
        groupedMainDeck={[{ card: sampleCard, count: 1 }]}
        evolveDeckCount={1}
        groupedEvolveDeck={[{ card: { ...sampleCard, id: 'EV01-001', name: 'Evolve Angel', deck_section: 'evolve', is_evolve_card: true, card_kind_normalized: 'evolve_follower' }, count: 1 }]}
        tokenDeckCount={1}
        groupedTokenDeck={[{ card: { ...sampleCard, id: 'TK01-001', name: 'Knight Token', deck_section: 'token', is_token: true, card_kind_normalized: 'token_amulet' }, count: 1 }]}
        onDeckNameChange={onDeckNameChange}
        onSave={onSave}
        onMakeUnsavedCopy={onMakeUnsavedCopy}
        onOpenMyDecks={onOpenMyDecks}
        onImportDeck={onImportDeck}
        onOpenDeckLogImport={onOpenDeckLogImport}
        onExportDeck={onExportDeck}
        onDeckFormatChange={onDeckFormatChange}
        onDeckIdentityTypeChange={onDeckIdentityTypeChange}
        onConstructedClassChange={onConstructedClassChange}
        onConstructedTitleChange={onConstructedTitleChange}
        onCrossoverClassChange={onCrossoverClassChange}
        onDeckSortModeChange={onDeckSortModeChange}
        onOpenResetDeckDialog={onOpenResetDeckDialog}
        onOpenResetBuilderDialog={onOpenResetBuilderDialog}
        canAddMainCard={() => true}
        canAddEvolveCard={() => true}
        canAddTokenCard={() => true}
        onRemoveLeader={onRemoveLeader}
        onRemoveMain={onRemoveMain}
        onAddMain={onAddMain}
        onRemoveEvolve={onRemoveEvolve}
        onAddEvolve={onAddEvolve}
        onRemoveToken={onRemoveToken}
        onAddToken={onAddToken}
        onDeckCardMouseEnter={onDeckCardMouseEnter}
        onDeckCardMouseMove={onDeckCardMouseMove}
        onDeckCardMouseLeave={onDeckCardMouseLeave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Builder' }));
    fireEvent.click(screen.getAllByTitle('Remove one copy from Main Deck')[0]);

    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [new File(['{}'], 'deck.json', { type: 'application/json' })] },
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onOpenResetBuilderDialog).toHaveBeenCalledTimes(1);
    expect(onRemoveMain).toHaveBeenCalledWith('BP01-001');
    expect(onAddMain).not.toHaveBeenCalled();
    expect(onImportDeck).toHaveBeenCalledTimes(1);
  });
});
