import { describe, expect, it } from 'vitest';
import {
  dedupeCardsByDisplayIdentity,
  getAvailableExpansions,
  getAvailableProductNames,
  getAvailableRarities,
  type DeckBuilderCardData,
} from './deckBuilderCard';

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

  it('dedupes same-name variants for display while keeping distinct deck sections', () => {
    const duplicatedCards: DeckBuilderCardData[] = [
      {
        id: 'BP01-001',
        name: 'Alpha Knight',
        image: '/alpha-base.png',
        class: 'ロイヤル',
        type: 'フォロワー',
        rarity: 'LG',
        product_name: 'Booster Pack 1',
        deck_section: 'main',
      },
      {
        id: 'PR-001',
        name: 'Alpha Knight',
        image: '/alpha-promo.png',
        class: 'ロイヤル',
        type: 'フォロワー',
        rarity: 'PR',
        product_name: 'Promo Pack',
        deck_section: 'main',
      },
      {
        id: 'EV01-001',
        name: 'Alpha Knight',
        image: '/alpha-evolve.png',
        class: 'ロイヤル',
        type: 'フォロワー・エボルヴ',
        rarity: 'LG',
        product_name: 'Booster Pack 1',
        deck_section: 'evolve',
      },
    ];

    expect(dedupeCardsByDisplayIdentity(duplicatedCards).map(card => card.id)).toEqual([
      'BP01-001',
      'EV01-001',
    ]);
  });
});
