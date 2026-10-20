import { describe, expect, it } from 'vitest';
import {
  getAdvancedDeckBuilderFilterCount,
  isCompactDeckBuilderViewport,
  shouldEnableDeckCardHoverPreview,
} from './deckBuilderResponsiveLayout';

describe('deckBuilderResponsiveLayout', () => {
  describe('isCompactDeckBuilderViewport', () => {
    it('returns true for smartphone and portrait tablet widths below 900px', () => {
      expect(isCompactDeckBuilderViewport(375)).toBe(true);
      expect(isCompactDeckBuilderViewport(768)).toBe(true);
      expect(isCompactDeckBuilderViewport(899)).toBe(true);
    });

    it('returns false for landscape tablet and desktop widths from 900px and above', () => {
      expect(isCompactDeckBuilderViewport(900)).toBe(false);
      expect(isCompactDeckBuilderViewport(1024)).toBe(false);
      expect(isCompactDeckBuilderViewport(1440)).toBe(false);
    });
  });

  describe('getAdvancedDeckBuilderFilterCount', () => {
    const defaultAdvancedFilters = {
      cardTypeFilter: 'All' as const,
      expansionFilter: 'All',
      rarityFilter: 'All',
      productNameFilter: 'All',
      selectedSubtypeTags: [] as string[],
      hideSameNameVariants: false,
      showPreviewCards: false,
    };

    it('returns 0 when all advanced filters are at default values', () => {
      expect(getAdvancedDeckBuilderFilterCount(defaultAdvancedFilters)).toBe(0);
    });

    it('counts each active advanced filter and subtype tag', () => {
      expect(
        getAdvancedDeckBuilderFilterCount({
          ...defaultAdvancedFilters,
          cardTypeFilter: 'follower',
          expansionFilter: 'BP01',
          rarityFilter: 'LG',
          productNameFilter: 'Starter',
          selectedSubtypeTags: ['学院', '兵士'],
          hideSameNameVariants: true,
          showPreviewCards: true,
        })
      ).toBe(8);
    });
  });

  describe('shouldEnableDeckCardHoverPreview', () => {
    it('returns true when matchMedia is unavailable or pointer is fine', () => {
      expect(shouldEnableDeckCardHoverPreview()).toBe(true);
      expect(
        shouldEnableDeckCardHoverPreview((query) => ({
          matches: query === '(pointer: fine)',
        }))
      ).toBe(true);
    });

    it('returns false when primary pointer is coarse (touch device)', () => {
      expect(
        shouldEnableDeckCardHoverPreview((query) => ({
          matches: query === '(pointer: coarse)',
        }))
      ).toBe(false);
    });
  });
});
