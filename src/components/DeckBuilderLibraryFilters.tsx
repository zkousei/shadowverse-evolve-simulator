import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { CLASS, CLASS_FILTER_VALUES } from '../models/class';
import type { ClassFilter } from '../models/class';
import type {
  DeckBuilderCardTypeFilter,
  DeckBuilderDeckSectionFilter,
} from '../utils/deckBuilderFilters';

const CLASS_FILTER_LABEL_KEYS: Record<ClassFilter, string> = {
  All: 'all',
  [CLASS.ELF]: 'elf',
  [CLASS.ROYAL]: 'royal',
  [CLASS.WITCH]: 'witch',
  [CLASS.DRAGON]: 'dragon',
  [CLASS.NIGHTMARE]: 'nightmare',
  [CLASS.BISHOP]: 'bishop',
  [CLASS.NEUTRAL]: 'neutral',
};

const CARD_TYPE_LABEL_KEYS: Record<DeckBuilderCardTypeFilter, string> = {
  All: 'all',
  follower: 'follower',
  spell: 'spell',
  amulet: 'amulet',
};

const DECK_SECTION_LABEL_KEYS: Record<DeckBuilderDeckSectionFilter, string> = {
  All: 'all',
  main: 'main',
  evolve: 'evolve',
  leader: 'leader',
  token: 'token',
};

type DeckBuilderLibraryFiltersProps = {
  search: string;
  hideSameNameVariants: boolean;
  deckSectionFilter: DeckBuilderDeckSectionFilter;
  cardTypeFilter: DeckBuilderCardTypeFilter;
  costFilter: string;
  classFilter: ClassFilter;
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
};

const segmentedGroupStyle: React.CSSProperties = {
  display: 'flex',
  background: 'var(--bg-surface)',
  padding: '0.25rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-light)',
  flexWrap: 'wrap',
  gap: '0.25rem',
  alignItems: 'center',
};

const DeckBuilderLibraryFilters: React.FC<DeckBuilderLibraryFiltersProps> = ({
  search,
  hideSameNameVariants,
  deckSectionFilter,
  cardTypeFilter,
  costFilter,
  classFilter,
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
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder={t('deckBuilder.filters.searchCards')}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              fontSize: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              outline: 'none',
            }}
          />
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap',
          }}
        >
          <input
            type="checkbox"
            checked={hideSameNameVariants}
            onChange={(event) => onHideSameNameVariantsChange(event.target.checked)}
          />
          {t('deckBuilder.filters.hideSameNameVariants')}
        </label>

        <button
          type="button"
          onClick={onReset}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-surface)',
            color: 'var(--text-main)',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap',
          }}
        >
          {t('deckBuilder.filters.reset', 'Reset Filters')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div
          role="group"
          aria-label={t('deckBuilder.filters.aria.section')}
          style={segmentedGroupStyle}
        >
          <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('deckBuilder.filters.labels.section')}:
          </span>

          {deckSectionFilterValues.map((section) => (
            <button
              key={section}
              type="button"
              aria-pressed={deckSectionFilter === section}
              onClick={() => onDeckSectionFilterChange(section)}
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                background: deckSectionFilter === section ? 'var(--brand-accent)' : 'transparent',
                color: deckSectionFilter === section ? '#fff' : 'var(--text-main)',
                fontWeight: deckSectionFilter === section ? 'bold' : 'normal',
              }}
            >
              {t(`deckBuilder.filters.deckSection.${DECK_SECTION_LABEL_KEYS[section]}`)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div
          role="group"
          aria-label={t('deckBuilder.filters.aria.class')}
          style={segmentedGroupStyle}
        >
          <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('deckBuilder.filters.labels.class')}:
          </span>

          {CLASS_FILTER_VALUES.map((filterValue) => (
            <button
              key={filterValue}
              type="button"
              aria-pressed={classFilter === filterValue}
              onClick={() => onClassFilterChange(filterValue)}
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                background: classFilter === filterValue ? 'var(--brand-accent)' : 'transparent',
                color: classFilter === filterValue ? '#fff' : 'var(--text-main)',
                fontWeight: classFilter === filterValue ? 'bold' : 'normal',
              }}
            >
              {t(`common.classes.${CLASS_FILTER_LABEL_KEYS[filterValue]}`)}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label={t('deckBuilder.filters.aria.cardType')}
          style={segmentedGroupStyle}
        >
          <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('deckBuilder.filters.labels.cardType')}:
          </span>

          {cardTypeFilterValues.map((cardType) => (
            <button
              key={cardType}
              type="button"
              aria-pressed={cardTypeFilter === cardType}
              onClick={() => onCardTypeFilterChange(cardType)}
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                background: cardTypeFilter === cardType ? 'var(--brand-accent)' : 'transparent',
                color: cardTypeFilter === cardType ? '#fff' : 'var(--text-main)',
                fontWeight: cardTypeFilter === cardType ? 'bold' : 'normal',
              }}
            >
              {t(`deckBuilder.filters.cardType.${CARD_TYPE_LABEL_KEYS[cardType]}`)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div
          role="group"
          aria-label={t('deckBuilder.filters.aria.cost')}
          style={{ display: 'flex', background: 'var(--bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
        >
          <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('deckBuilder.filters.labels.cost')}:
          </span>
          {costFilterValues.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={costFilter === value}
              onClick={() => onCostFilterChange(value)}
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                background: costFilter === value ? 'var(--brand-accent)' : 'transparent',
                color: costFilter === value ? '#fff' : 'var(--text-main)',
                fontWeight: costFilter === value ? 'bold' : 'normal',
              }}
            >
              {value}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('deckBuilder.filters.labels.expansion')}:
          </span>
          <select
            aria-label={t('deckBuilder.filters.aria.expansion')}
            value={expansionFilter}
            onChange={(event) => onExpansionFilterChange(event.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              outline: 'none',
              minWidth: '120px',
            }}
          >
            <option value="All">{t('deckBuilder.filters.allExpansions')}</option>
            {expansions.map((expansion) => (
              <option key={expansion} value={expansion}>
                {expansion}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('deckBuilder.filters.labels.rarity')}:
          </span>
          <select
            aria-label={t('deckBuilder.filters.aria.rarity')}
            value={rarityFilter}
            onChange={(event) => onRarityFilterChange(event.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              outline: 'none',
              minWidth: '120px',
            }}
          >
            <option value="All">{t('deckBuilder.filters.allRarities')}</option>
            {rarities.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('deckBuilder.filters.labels.productName')}:
          </span>
          <select
            aria-label={t('deckBuilder.filters.aria.productName')}
            value={productNameFilter}
            onChange={(event) => onProductNameFilterChange(event.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              outline: 'none',
              minWidth: '220px',
              maxWidth: '320px',
            }}
          >
            <option value="All">{t('deckBuilder.filters.allProducts')}</option>
            {productNames.map((productName) => (
              <option key={productName} value={productName}>
                {productName}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('deckBuilder.filters.labels.subtype')}:
            </span>
            <input
              type="text"
              aria-label={t('deckBuilder.filters.aria.subtypeInput')}
              list="subtype-filter-options"
              placeholder={t('deckBuilder.filters.searchSubtype')}
              value={subtypeSearch}
              onChange={(event) => onSubtypeSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onAddSubtype();
                }
              }}
              style={{
                flex: 1,
                minWidth: '160px',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                outline: 'none',
              }}
            />
            <datalist id="subtype-filter-options">
              {filteredSubtypeOptions.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={onAddSubtype}
              disabled={!canAddSubtype}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              {t('deckBuilder.filters.addSubtype')}
            </button>
          </div>

          {selectedSubtypeTags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {selectedSubtypeTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onRemoveSubtype(tag)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '999px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  title={t('deckBuilder.filters.removeSubtypeFilter', { tag })}
                >
                  <span>{tag}</span>
                  <span style={{ color: 'var(--text-muted)' }}>×</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DeckBuilderLibraryFilters;
