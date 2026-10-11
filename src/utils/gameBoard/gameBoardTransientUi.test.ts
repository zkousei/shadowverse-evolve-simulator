import { describe, expect, it } from 'vitest';
import {
  mergeLookTopSummaryIntoOverlay,
  prependAttackHistoryEntry,
  prependEventHistoryEntry,
} from './gameBoardTransientUi';

describe('gameBoardTransientUi', () => {
  it('retains the newest 100 event entries in order without changing previous history', () => {
    const previous = Array.from({ length: 100 }, (_, index) => `Event ${100 - index}`);
    const result = prependEventHistoryEntry(previous, 'Event 101');
    expect(result).toHaveLength(100);
    expect(result).toEqual(['Event 101', ...previous.slice(0, 99)]);
    expect(previous).toHaveLength(100);
    expect(previous.at(-1)).toBe('Event 1');
  });

  it('keeps entries beyond the old five-entry limit, including repeated text', () => {
    let history: string[] = [];
    for (let index = 0; index < 10; index += 1) history = prependEventHistoryEntry(history, 'Same event');
    expect(history).toEqual(Array(10).fill('Same event'));
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
