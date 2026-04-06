import { describe, expect, it } from 'vitest';
import {
  mergeLookTopSummaryIntoOverlay,
  prependAttackHistoryEntry,
  prependEventHistoryEntry,
} from './gameBoardTransientUi';

describe('gameBoardTransientUi', () => {
  it('prepends event history entries and caps them at five', () => {
    expect(
      prependEventHistoryEntry(['2', '3', '4', '5', '6'], '1')
    ).toEqual(['1', '2', '3', '4', '5']);
  });

  it('prepends attack history entries and caps them at three', () => {
    expect(
      prependAttackHistoryEntry(['b', 'c', 'd'], 'a')
    ).toEqual(['a', 'b', 'c']);
  });

  it('merges look-top summary lines only into look-top overlays', () => {
    expect(
      mergeLookTopSummaryIntoOverlay({
        type: 'look-top',
        title: 'Look Top',
        cards: [{ cardId: 'c1', name: 'Card 1', image: '' }],
      }, ['Top: 1'])
    ).toEqual({
      type: 'look-top',
      title: 'Look Top',
      cards: [{ cardId: 'c1', name: 'Card 1', image: '' }],
      summaryLines: ['Top: 1'],
    });

    expect(
      mergeLookTopSummaryIntoOverlay({
        type: 'search',
        title: 'Search',
        cards: [{ cardId: 'c2', name: 'Card 2', image: '' }],
      }, ['ignored'])
    ).toEqual({
      type: 'search',
      title: 'Search',
      cards: [{ cardId: 'c2', name: 'Card 2', image: '' }],
    });
  });
});
