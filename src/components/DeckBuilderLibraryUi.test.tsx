import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeckBuilderLibraryCard from './DeckBuilderLibraryCard';
import DeckBuilderLibraryFilters from './DeckBuilderLibraryFilters';
import DeckBuilderLibraryPane from './DeckBuilderLibraryPane';
import DeckBuilderPaginationControls from './DeckBuilderPaginationControls';

import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { CardDetail } from '../utils/cardDetails';

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

describe('DeckBuilder extracted UI components - library', () => {
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
});
