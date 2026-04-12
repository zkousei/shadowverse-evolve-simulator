import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDeckBuilderLibraryFilters } from './useDeckBuilderLibraryFilters';

describe('useDeckBuilderLibraryFilters', () => {
  const subtypeTags = ['Elf', 'Human', 'Dragon', 'Spellcaster'];

  it('initializes with default values', () => {
    const { result } = renderHook(() => useDeckBuilderLibraryFilters({ subtypeTags }));

    expect(result.current.search).toBe('');
    expect(result.current.costFilter).toBe('All');
    expect(result.current.classFilter).toBe('All');
    expect(result.current.cardTypeFilter).toBe('All');
    expect(result.current.selectedSubtypeTags).toEqual([]);
    expect(result.current.page).toBe(0);
  });

  it('updates library filters via updateLibraryFilters', () => {
    const { result } = renderHook(() => useDeckBuilderLibraryFilters({ subtypeTags }));

    act(() => {
      result.current.updateLibraryFilters({ search: 'New Search', page: 2 });
    });

    expect(result.current.search).toBe('New Search');
    expect(result.current.page).toBe(2);
  });

  it('resets page when using updateLibraryFiltersWithPageReset', () => {
    const { result } = renderHook(() => useDeckBuilderLibraryFilters({ subtypeTags }));

    act(() => {
      result.current.updateLibraryFilters({ page: 5 });
    });
    expect(result.current.page).toBe(5);

    act(() => {
      result.current.updateLibraryFiltersWithPageReset({ search: 'Reset Page' });
    });

    expect(result.current.search).toBe('Reset Page');
    expect(result.current.page).toBe(0);
  });

  it('resets all filters using resetLibraryFilters', () => {
    const { result } = renderHook(() => useDeckBuilderLibraryFilters({ subtypeTags }));

    act(() => {
      result.current.updateLibraryFilters({ search: 'Modified', classFilter: 'ニュートラル' });
    });
    expect(result.current.search).toBe('Modified');

    act(() => {
      result.current.resetLibraryFilters();
    });

    expect(result.current.search).toBe('');
    expect(result.current.classFilter).toBe('All');
  });

  it('manages subtype tags', () => {
    const { result } = renderHook(() => useDeckBuilderLibraryFilters({ subtypeTags }));

    act(() => {
      result.current.addSubtypeTag('Elf');
    });
    expect(result.current.selectedSubtypeTags).toEqual(['Elf']);

    act(() => {
      result.current.removeSubtypeTag('Elf');
    });
    expect(result.current.selectedSubtypeTags).toEqual([]);
  });

  it('filters subtype options based on subtypeSearch', () => {
    const { result } = renderHook(() => useDeckBuilderLibraryFilters({ subtypeTags }));

    act(() => {
      result.current.updateLibraryFilters({ subtypeSearch: 'Drag' });
    });

    expect(result.current.filteredSubtypeOptions).toEqual(['Dragon']);
  });

  it('ignores invalid subtype tags in addSubtypeTag', () => {
    const { result } = renderHook(() => useDeckBuilderLibraryFilters({ subtypeTags }));

    act(() => {
      result.current.addSubtypeTag('InvalidTag');
    });

    expect(result.current.selectedSubtypeTags).toEqual([]);
  });
});
