import { describe, expect, it } from 'vitest';
import { getAvailableExpansions, getAvailableProductNames, getAvailableRarities, type DeckBuilderCardData } from './deckBuilderCard';

const cards: DeckBuilderCardData[] = [
  {
    id: 'BP02-010',
    name: 'Card A',
    image: '/a.png',
    rarity: 'LG',
    product_name: 'ブースターパック第2弾',
  },
  {
    id: 'BP01-001',
    name: 'Card B',
    image: '/b.png',
    rarity: '-',
    product_name: 'ブースターパック第1弾',
  },
  {
    id: 'BP01-099',
    name: 'Card C',
    image: '/c.png',
    rarity: 'GR',
    product_name: 'ブースターパック第1弾',
  },
  {
    id: 'CP02-001',
    name: 'Card D',
    image: '/d.png',
    rarity: 'LG',
    product_name: 'コラボパック',
  },
];

describe('deckBuilderCard helpers', () => {
  it('collects unique expansion values in locale order', () => {
    expect(getAvailableExpansions(cards)).toEqual(['BP01', 'BP02', 'CP02']);
  });

  it('collects unique rarity values and skips dash placeholders', () => {
    expect(getAvailableRarities(cards)).toEqual(['GR', 'LG']);
  });

  it('collects unique product names in locale order', () => {
    expect(getAvailableProductNames(cards)).toEqual([
      'コラボパック',
      'ブースターパック第1弾',
      'ブースターパック第2弾',
    ]);
  });
});
