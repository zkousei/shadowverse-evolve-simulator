import { describe, expect, it } from 'vitest';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import {
  DECK_HOVER_PREVIEW_MAX_HEIGHT,
  DECK_HOVER_PREVIEW_WIDTH,
  formatSavedDeckUpdatedAt,
  getDeckHoverPreviewPosition,
  groupDeckCardsForDisplay,
  parseNullableStat,
  resolveDeckName,
  sortDeckCardsForDisplay,
} from './deckBuilderDisplay';

const makeCard = (overrides: Partial<DeckBuilderCardData> = {}): DeckBuilderCardData => ({
  id: 'BP01-001',
  name: 'Alpha Knight',
  image: '/alpha.png',
  class: 'ロイヤル',
  title: 'Hero Tale',
  type: 'フォロワー',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  cost: '2',
  ...overrides,
});

describe('deckBuilderDisplay', () => {
  it('sorts by added order without cloning the list', () => {
    const cards = [makeCard({ id: 'B' }), makeCard({ id: 'A' })];

    expect(sortDeckCardsForDisplay(cards, 'added')).toBe(cards);
  });

  it('sorts by cost and falls back to card id order', () => {
    const cards = [
      makeCard({ id: 'BP01-010', cost: '-' }),
      makeCard({ id: 'BP01-002', cost: '2' }),
      makeCard({ id: 'BP01-001', cost: '2' }),
      makeCard({ id: 'BP01-003', cost: '1' }),
    ];

    expect(sortDeckCardsForDisplay(cards, 'cost').map(card => card.id)).toEqual([
      'BP01-003',
      'BP01-001',
      'BP01-002',
      'BP01-010',
    ]);
  });

  it('sorts by card id when requested', () => {
    const cards = [makeCard({ id: 'BP01-010' }), makeCard({ id: 'BP01-002' })];

    expect(sortDeckCardsForDisplay(cards, 'id').map(card => card.id)).toEqual([
      'BP01-002',
      'BP01-010',
    ]);
  });

  it('groups repeated card ids in order of first appearance', () => {
    const cards = [
      makeCard({ id: 'A' }),
      makeCard({ id: 'B' }),
      makeCard({ id: 'A' }),
    ];

    expect(groupDeckCardsForDisplay(cards)).toEqual([
      { card: cards[0], count: 2 },
      { card: cards[1], count: 1 },
    ]);
  });

  it('parses nullable stats and keeps invalid values as null', () => {
    expect(parseNullableStat('7')).toBe(7);
    expect(parseNullableStat('-')).toBeNull();
    expect(parseNullableStat('')).toBeNull();
    expect(parseNullableStat('abc')).toBeNull();
    expect(parseNullableStat(undefined)).toBeNull();
  });

  it('formats saved deck timestamps and falls back to the raw value on invalid dates', () => {
    expect(formatSavedDeckUpdatedAt('invalid')).toBe('invalid');
    expect(formatSavedDeckUpdatedAt('2026-04-04T12:34:00.000Z', 'ja-JP')).not.toBe('2026-04-04T12:34:00.000Z');
  });

  it('resolves deck names with trimming and default fallback', () => {
    expect(resolveDeckName('  Alpha Deck  ')).toBe('Alpha Deck');
    expect(resolveDeckName('   ')).toBe('My Deck');
  });

  it('positions the deck hover preview within the viewport bounds', () => {
    expect(getDeckHoverPreviewPosition({ x: 120, y: 140 }, { width: 1280, height: 720 })).toEqual({
      left: 136,
      top: 156,
    });

    expect(getDeckHoverPreviewPosition({ x: 1260, y: 710 }, { width: 1280, height: 720 })).toEqual({
      left: 1280 - DECK_HOVER_PREVIEW_WIDTH - 8,
      top: 720 - DECK_HOVER_PREVIEW_MAX_HEIGHT - 8,
    });

    expect(getDeckHoverPreviewPosition({ x: -100, y: -100 }, { width: 200, height: 200 })).toEqual({
      left: 8,
      top: 8,
    });
  });
});
