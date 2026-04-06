import { describe, expect, it } from 'vitest';
import { CLASS } from '../models/class';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { createDefaultDeckRuleConfig } from '../models/deckRule';
import { buildDeckBuilderCatalogView, getCrossoverClassOptions } from './deckBuilderCatalog';

const mockCards: DeckBuilderCardData[] = [
  {
    id: 'BP01-001',
    name: 'Alpha Knight',
    image: '/alpha.png',
    cost: '1',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'フォロワー',
    subtype: '兵士',
    rarity: 'LG',
    product_name: 'Booster Pack 1',
    card_kind_normalized: 'follower',
    deck_section: 'main',
  },
  {
    id: 'BP01-002',
    name: 'Alpha Knight',
    image: '/alpha-2.png',
    cost: '2',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'フォロワー',
    subtype: '兵士',
    rarity: 'LG',
    product_name: 'Booster Pack 1',
    card_kind_normalized: 'follower',
    deck_section: 'main',
  },
  {
    id: 'BP02-007',
    name: 'Beta Mage',
    image: '/beta.png',
    cost: '7',
    class: 'ウィッチ',
    title: 'Mage Tale',
    type: 'スペル',
    subtype: '魔法使い・学院',
    rarity: 'GR',
    product_name: 'Booster Pack 2',
    card_kind_normalized: 'spell',
    deck_section: 'main',
  },
  {
    id: 'LDR01-001',
    name: 'Leader Luna',
    image: '/leader.png',
    cost: '-',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'リーダー',
    subtype: '指揮官',
    rarity: 'PR',
    product_name: 'Leader Set',
    card_kind_normalized: 'leader',
    deck_section: 'leader',
  },
  {
    id: 'TK01-001',
    name: 'Knight Token',
    image: '/token.png',
    cost: '1',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'アミュレット・トークン',
    subtype: '兵士',
    rarity: 'PR',
    product_name: 'Token Pack',
    card_kind_normalized: 'token_amulet',
    deck_section: 'token',
    is_token: true,
  },
];

describe('deckBuilderCatalog', () => {
  it('filters cards by search, type, rarity, product, subtype, and section', () => {
    const view = buildDeckBuilderCatalogView(mockCards, {
      ...createDefaultDeckRuleConfig(),
      format: 'other',
    }, {
      search: 'knight',
      costFilter: 'All',
      expansionFilter: 'All',
      classFilter: 'All',
      cardTypeFilter: 'amulet',
      rarityFilter: 'PR',
      productNameFilter: 'Token Pack',
      selectedSubtypeTags: ['兵士'],
      deckSectionFilter: 'token',
      hideSameNameVariants: false,
      page: 0,
      pageSize: 50,
    });

    expect(view.filteredCards.map(card => card.id)).toEqual(['TK01-001']);
    expect(view.paginatedCards.map(card => card.id)).toEqual(['TK01-001']);
    expect(view.totalPages).toBe(1);
  });

  it('applies rule filtering, dedupe, and pagination for the card catalog', () => {
    const view = buildDeckBuilderCatalogView(mockCards, {
      ...createDefaultDeckRuleConfig(),
      selectedClass: CLASS.ROYAL,
    }, {
      search: '',
      costFilter: 'All',
      expansionFilter: 'All',
      classFilter: 'All',
      cardTypeFilter: 'All',
      rarityFilter: 'All',
      productNameFilter: 'All',
      selectedSubtypeTags: [],
      deckSectionFilter: 'All',
      hideSameNameVariants: true,
      page: 0,
      pageSize: 2,
    });

    expect(view.filteredCards.map(card => card.id)).toEqual(['BP01-001', 'BP01-002', 'LDR01-001', 'TK01-001']);
    expect(view.displayCards.map(card => card.id)).toEqual(['BP01-001', 'LDR01-001', 'TK01-001']);
    expect(view.paginatedCards.map(card => card.id)).toEqual(['BP01-001', 'LDR01-001']);
    expect(view.totalPages).toBe(2);
  });

  it('supports cost and expansion filters including the 7+ bucket', () => {
    const sevenPlus = buildDeckBuilderCatalogView(mockCards, {
      ...createDefaultDeckRuleConfig(),
      format: 'other',
    }, {
      search: '',
      costFilter: '7+',
      expansionFilter: 'BP02',
      classFilter: 'All',
      cardTypeFilter: 'All',
      rarityFilter: 'All',
      productNameFilter: 'All',
      selectedSubtypeTags: [],
      deckSectionFilter: 'All',
      hideSameNameVariants: false,
      page: 0,
      pageSize: 50,
    });

    expect(sevenPlus.filteredCards.map(card => card.id)).toEqual(['BP02-007']);
  });

  it('builds crossover class options while preventing duplicate class picks', () => {
    expect(getCrossoverClassOptions([CLASS.ROYAL, CLASS.WITCH])).toEqual({
      firstOptions: [CLASS.ELF, CLASS.ROYAL, CLASS.DRAGON, CLASS.NIGHTMARE, CLASS.BISHOP],
      secondOptions: [CLASS.ELF, CLASS.WITCH, CLASS.DRAGON, CLASS.NIGHTMARE, CLASS.BISHOP],
    });
  });
});
