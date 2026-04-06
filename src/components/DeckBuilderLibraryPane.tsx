import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClassFilter } from '../models/class';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { CardDetail } from '../utils/cardDetails';
import type {
  DeckBuilderCardTypeFilter,
  DeckBuilderDeckSectionFilter,
} from '../utils/deckBuilderFilters';
import type { DeckTargetSection } from '../utils/deckBuilderRules';
import DeckBuilderLibraryCard from './DeckBuilderLibraryCard';
import DeckBuilderLibraryFilters from './DeckBuilderLibraryFilters';
import DeckBuilderPaginationControls from './DeckBuilderPaginationControls';

type DeckBuilderLibraryPaneProps = {
  isLoading: boolean;
  paginatedCards: DeckBuilderCardData[];
  cardDetailLookup: Record<string, CardDetail>;
  search: string;
  hideSameNameVariants: boolean;
  deckSectionFilter: DeckBuilderDeckSectionFilter;
  classFilter: ClassFilter;
  cardTypeFilter: DeckBuilderCardTypeFilter;
  costFilter: string;
  expansionFilter: string;
  rarityFilter: string;
  productNameFilter: string;
  subtypeSearch: string;
  selectedSubtypeTags: string[];
  filteredSubtypeOptions: string[];
  costFilterValues: readonly string[];
  deckSectionFilterValues: readonly DeckBuilderDeckSectionFilter[];
  cardTypeFilterValues: readonly DeckBuilderCardTypeFilter[];
  expansions: string[];
  rarities: string[];
  productNames: string[];
  canAddSubtype: boolean;
  page: number;
  totalPages: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  getAllowedSections: (card: DeckBuilderCardData) => DeckTargetSection[];
  canAddToSection: (card: DeckBuilderCardData, section: DeckTargetSection) => boolean;
  onSearchChange: (value: string) => void;
  onHideSameNameVariantsChange: (checked: boolean) => void;
  onReset: () => void;
  onDeckSectionFilterChange: (value: DeckBuilderDeckSectionFilter) => void;
  onClassFilterChange: (value: ClassFilter) => void;
  onCardTypeFilterChange: (value: DeckBuilderCardTypeFilter) => void;
  onCostFilterChange: (value: string) => void;
  onExpansionFilterChange: (value: string) => void;
  onRarityFilterChange: (value: string) => void;
  onProductNameFilterChange: (value: string) => void;
  onSubtypeSearchChange: (value: string) => void;
  onAddSubtype: () => void;
  onRemoveSubtype: (tag: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenPreview: (card: DeckBuilderCardData) => void;
  onAddToSection: (card: DeckBuilderCardData, section: DeckTargetSection) => void;
};

const DeckBuilderLibraryPane: React.FC<DeckBuilderLibraryPaneProps> = ({
  isLoading,
  paginatedCards,
  cardDetailLookup,
  search,
  hideSameNameVariants,
  deckSectionFilter,
  classFilter,
  cardTypeFilter,
  costFilter,
  expansionFilter,
  rarityFilter,
  productNameFilter,
  subtypeSearch,
  selectedSubtypeTags,
  filteredSubtypeOptions,
  costFilterValues,
  deckSectionFilterValues,
  cardTypeFilterValues,
  expansions,
  rarities,
  productNames,
  canAddSubtype,
  page,
  totalPages,
  canGoPrev,
  canGoNext,
  getAllowedSections,
  canAddToSection,
  onSearchChange,
  onHideSameNameVariantsChange,
  onReset,
  onDeckSectionFilterChange,
  onClassFilterChange,
  onCardTypeFilterChange,
  onCostFilterChange,
  onExpansionFilterChange,
  onRarityFilterChange,
  onProductNameFilterChange,
  onSubtypeSearchChange,
  onAddSubtype,
  onRemoveSubtype,
  onPrev,
  onNext,
  onOpenPreview,
  onAddToSection,
}) => {
  const { t } = useTranslation();

  return (
    <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{t('deckBuilder.title')}</h1>

      <DeckBuilderLibraryFilters
        search={search}
        hideSameNameVariants={hideSameNameVariants}
        deckSectionFilter={deckSectionFilter}
        classFilter={classFilter}
        cardTypeFilter={cardTypeFilter}
        costFilter={costFilter}
        expansionFilter={expansionFilter}
        rarityFilter={rarityFilter}
        productNameFilter={productNameFilter}
        subtypeSearch={subtypeSearch}
        selectedSubtypeTags={selectedSubtypeTags}
        filteredSubtypeOptions={filteredSubtypeOptions}
        costFilterValues={costFilterValues}
        deckSectionFilterValues={deckSectionFilterValues}
        cardTypeFilterValues={cardTypeFilterValues}
        expansions={expansions}
        rarities={rarities}
        productNames={productNames}
        canAddSubtype={canAddSubtype}
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

      <DeckBuilderPaginationControls
        page={page}
        totalPages={totalPages}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={onPrev}
        onNext={onNext}
      />

      {isLoading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>{t('deckBuilder.loading')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
          {paginatedCards.map((card) => (
            <DeckBuilderLibraryCard
              key={card.id}
              card={card}
              detail={cardDetailLookup[card.id]}
              allowedSections={getAllowedSections(card)}
              canAddToSection={(section) => canAddToSection(card, section)}
              onOpenPreview={onOpenPreview}
              onAddToSection={onAddToSection}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DeckBuilderLibraryPane;
