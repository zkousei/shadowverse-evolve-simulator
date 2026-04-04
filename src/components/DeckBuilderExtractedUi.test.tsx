import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeckBuilderDeckControls from './DeckBuilderDeckControls';
import DeckBuilderDeckHeader from './DeckBuilderDeckHeader';
import DeckBuilderDeckLogImportDialog from './DeckBuilderDeckLogImportDialog';
import DeckBuilderDeleteSavedDecksDialog from './DeckBuilderDeleteSavedDecksDialog';
import DeckBuilderDraftRestoreDialog from './DeckBuilderDraftRestoreDialog';
import DeckBuilderLibraryFilters from './DeckBuilderLibraryFilters';
import DeckBuilderPaginationControls from './DeckBuilderPaginationControls';
import DeckBuilderResetDialog from './DeckBuilderResetDialog';
import DeckBuilderRulePanel from './DeckBuilderRulePanel';
import DeckBuilderSaveFeedback from './DeckBuilderSaveFeedback';
import DeckBuilderSavedDeckConfirmDialog from './DeckBuilderSavedDeckConfirmDialog';

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
});
