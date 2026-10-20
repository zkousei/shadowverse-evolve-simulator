import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeckBuilderLibraryFilters from './DeckBuilderLibraryFilters';
import DeckBuilderDeckSection from './DeckBuilderDeckSection';
import DeckBuilderLibraryCard from './DeckBuilderLibraryCard';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { createEmptyDeckState } from '../../models/deckState';
import { createDefaultDeckRuleConfig } from '../../models/deckRule';
import enTranslations from '../../i18n/en/translation.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const parts = key.split('.');
      let result: unknown = enTranslations;
      for (const p of parts) {
        if (result == null) return key;
        result = typeof result === 'object' ? (result as Record<string, unknown>)[p] : undefined;
      }
      if (typeof result !== 'string') return key;
      let finalStr = result;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          finalStr = finalStr.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        }
      }
      return finalStr;
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}));

describe('DeckBuilder responsive components', () => {
  const baseFilterProps = {
    search: '',
    hideSameNameVariants: false,
    showPreviewCards: false,
    deckSectionFilter: 'All' as const,
    cardTypeFilter: 'All' as const,
    costFilter: 'All',
    classFilter: 'All' as const,
    expansionFilter: 'All',
    rarityFilter: 'All',
    productNameFilter: 'All',
    subtypeSearch: '',
    selectedSubtypeTags: [] as string[],
    filteredSubtypeOptions: ['兵士', '学院'],
    costFilterValues: ['All', '0', '1', '2', '3', '4', '5', '6', '7+'] as const,
    deckSectionFilterValues: ['All', 'main', 'evolve', 'leader', 'token'] as const,
    cardTypeFilterValues: ['All', 'follower', 'spell', 'amulet'] as const,
    expansions: ['BP01', 'BP02'],
    rarities: ['LG', 'GR'],
    productNames: ['Booster Pack 1'],
    canAddSubtype: false,
    onSearchChange: vi.fn(),
    onHideSameNameVariantsChange: vi.fn(),
    onShowPreviewCardsChange: vi.fn(),
    onReset: vi.fn(),
    onDeckSectionFilterChange: vi.fn(),
    onClassFilterChange: vi.fn(),
    onCardTypeFilterChange: vi.fn(),
    onCostFilterChange: vi.fn(),
    onExpansionFilterChange: vi.fn(),
    onRarityFilterChange: vi.fn(),
    onProductNameFilterChange: vi.fn(),
    onSubtypeSearchChange: vi.fn(),
    onAddSubtype: vi.fn(),
    onRemoveSubtype: vi.fn(),
  };

  it('collapses advanced filters by default in compact mode and toggles them open with active count badge', () => {
    render(
      <DeckBuilderLibraryFilters
        {...baseFilterProps}
        isCompact={true}
        expansionFilter="BP01"
        hideSameNameVariants={true}
      />
    );

    // Primary filters remain visible
    expect(screen.getByPlaceholderText('Search cards by name...')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Deck section filter' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Class filter' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cost filter' })).toBeInTheDocument();

    // Advanced filters are collapsed initially
    expect(screen.queryByRole('combobox', { name: 'Expansion filter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Card type filter' })).not.toBeInTheDocument();

    // Toggle button shows active advanced filter count (2)
    const toggleBtn = screen.getByRole('button', { name: 'Advanced Filters (2)' });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('combobox', { name: 'Expansion filter' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Card type filter' })).toBeInTheDocument();
  });

  it('opens card preview modal when tapping/clicking a card name in DeckBuilderDeckSection', () => {
    const onOpenPreview = vi.fn();
    const mockCard = {
      id: 'BP01-001',
      name: 'Alpha Knight',
      cost: '1',
      deck_section: 'main',
    } as DeckBuilderCardData;

    render(
      <DeckBuilderDeckSection
        title="Main Deck"
        countLabel="1/50"
        groupedCards={[{ card: mockCard, count: 1 }]}
        targetSection="main"
        removeTitle="Remove one copy"
        onRemove={vi.fn()}
        onOpenPreview={onOpenPreview}
        onCardMouseEnter={vi.fn()}
        onCardMouseMove={vi.fn()}
        onCardMouseLeave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Alpha Knight'));
    expect(onOpenPreview).toHaveBeenCalledWith(mockCard);
  });

  it('renders a quick remove button on DeckBuilderLibraryCard when count > 0 and onRemoveFromSection is provided', () => {
    const onRemoveFromSection = vi.fn();
    const mockCard = {
      id: 'BP01-001',
      name: 'Alpha Knight',
      cost: '1',
      deck_section: 'main',
      card_kind_normalized: 'follower',
      image: '/alpha.png',
    } as DeckBuilderCardData;
    const deckState = {
      ...createEmptyDeckState(),
      mainDeck: [mockCard, mockCard],
    };

    render(
      <DeckBuilderLibraryCard
        card={mockCard}
        deckRuleConfig={createDefaultDeckRuleConfig()}
        deckState={deckState}
        allowedSections={['main']}
        canAddToSection={() => true}
        onOpenPreview={vi.fn()}
        onAddToSection={vi.fn()}
        onRemoveFromSection={onRemoveFromSection}
      />
    );

    const removeBtn = screen.getByTestId('library-card-remove-main-BP01-001');
    expect(removeBtn).toBeInTheDocument();
    fireEvent.click(removeBtn);
    expect(onRemoveFromSection).toHaveBeenCalledWith('main', 'BP01-001');
  });
});

