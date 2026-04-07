import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeckBuilderDeckControls from './DeckBuilderDeckControls';
import DeckBuilderDeckHeader from './DeckBuilderDeckHeader';
import DeckBuilderDeckPane from './DeckBuilderDeckPane';
import DeckBuilderDeckSection from './DeckBuilderDeckSection';
import DeckBuilderRulePanel from './DeckBuilderRulePanel';

import type { DeckBuilderCardData } from '../models/deckBuilderCard';

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

const spellCard: DeckBuilderCardData = {
  ...sampleCard,
  id: 'BP01-002',
  name: 'Magic Missile',
  type: 'スペル',
  card_kind_normalized: 'spell',
};

const amuletCard: DeckBuilderCardData = {
  ...sampleCard,
  id: 'BP01-003',
  name: 'Sacred Bell',
  type: 'アミュレット',
  card_kind_normalized: 'amulet',
};

describe('DeckBuilder extracted UI components - deck', () => {
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
        mainDeckCount={6}
        groupedMainDeck={[
          { card: sampleCard, count: 3 },
          { card: spellCard, count: 2 },
          { card: amuletCard, count: 1 },
        ]}
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
    expect(screen.getByText('Main Deck')).toBeInTheDocument();
    expect(screen.getByText('6/50')).toBeInTheDocument();
    expect(screen.getByText('Follower: 3 / Spell: 2 / Amulet: 1')).toBeInTheDocument();
    expect(screen.getAllByTestId('deck-section-summary')).toHaveLength(1);
  });
});
