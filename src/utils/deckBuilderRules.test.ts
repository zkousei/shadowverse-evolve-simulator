import { describe, expect, it } from 'vitest';
import { CLASS } from '../models/class';
import type { DeckRuleConfig } from '../models/deckRule';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import {
  canAddCardToSection,
  getAllowedSections,
  getDeckLimit,
  isCardAllowedByRule,
  isRuleConfigured,
  sanitizeImportedDeckState,
  sanitizeImportedSection,
  validateDeckState,
} from './deckBuilderRules';

const mainCard: DeckBuilderCardData = {
  id: 'BP01-001',
  name: 'Main Card',
  image: '/main.png',
  class: 'ロイヤル',
  type: 'フォロワー',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const neutralCard: DeckBuilderCardData = {
  ...mainCard,
  id: 'BP01-002',
  name: 'Neutral Card',
  class: 'ニュートラル',
};

const witchCard: DeckBuilderCardData = {
  ...mainCard,
  id: 'BP01-003',
  name: 'Witch Card',
  class: 'ウィッチ',
};

const dragonCard: DeckBuilderCardData = {
  ...mainCard,
  id: 'BP01-004',
  name: 'Dragon Card',
  class: 'ドラゴン',
};

const evolveCard: DeckBuilderCardData = {
  id: 'EV01-001',
  name: 'Evolve Card',
  image: '/evolve.png',
  class: 'ロイヤル',
  type: 'フォロワー・アドバンス',
  card_kind_normalized: 'advance_follower',
  deck_section: 'evolve',
  is_token: false,
  is_evolve_card: true,
  is_deck_build_legal: true,
};

const tokenCard: DeckBuilderCardData = {
  id: 'TK01-001',
  name: 'Token Card',
  image: '/token.png',
  class: 'エルフ',
  type: 'アミュレット・トークン',
  card_kind_normalized: 'token_amulet',
  deck_section: 'token',
  is_token: true,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const royalLeaderCard: DeckBuilderCardData = {
  id: 'LDR01-001',
  name: 'Royal Leader',
  image: '/leader-royal.png',
  class: 'ロイヤル',
  type: 'リーダー',
  card_kind_normalized: 'leader',
  deck_section: 'leader',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const witchLeaderCard: DeckBuilderCardData = {
  ...royalLeaderCard,
  id: 'LDR01-002',
  name: 'Witch Leader',
  image: '/leader-witch.png',
  class: 'ウィッチ',
};

const titleCard: DeckBuilderCardData = {
  ...mainCard,
  id: 'CP01-001',
  name: 'Title Card',
  title: 'ウマ娘 プリティーダービー',
};

const titleTokenCard: DeckBuilderCardData = {
  ...tokenCard,
  id: 'CP01-T01',
  name: 'Title Token',
  title: 'ウマ娘 プリティーダービー',
};

const constructedRoyalRule: DeckRuleConfig = {
  format: 'constructed',
  identityType: 'class',
  selectedClass: CLASS.ROYAL,
  selectedTitle: null,
  selectedClasses: [null, null],
};

const crossoverRule: DeckRuleConfig = {
  format: 'crossover',
  identityType: 'class',
  selectedClass: null,
  selectedTitle: null,
  selectedClasses: [CLASS.ROYAL, CLASS.WITCH],
};

describe('deckBuilderRules', () => {
  it('returns the allowed deck section for each card', () => {
    expect(getAllowedSections(mainCard)).toEqual(['main']);
    expect(getAllowedSections(evolveCard)).toEqual(['evolve']);
    expect(getAllowedSections(royalLeaderCard)).toEqual(['leader']);
    expect(getAllowedSections(tokenCard)).toEqual(['token']);
  });

  it('accepts cards only in their legal deck section', () => {
    expect(canAddCardToSection(mainCard, 'main')).toBe(true);
    expect(canAddCardToSection(mainCard, 'evolve')).toBe(false);
    expect(canAddCardToSection(evolveCard, 'evolve')).toBe(true);
    expect(canAddCardToSection(evolveCard, 'main')).toBe(false);
    expect(canAddCardToSection(royalLeaderCard, 'leader')).toBe(true);
    expect(canAddCardToSection(tokenCard, 'main')).toBe(false);
  });

  it('applies constructed class and title restrictions when adding cards', () => {
    expect(isRuleConfigured(constructedRoyalRule)).toBe(true);
    expect(canAddCardToSection(mainCard, 'main', constructedRoyalRule)).toBe(true);
    expect(canAddCardToSection(neutralCard, 'main', constructedRoyalRule)).toBe(true);
    expect(canAddCardToSection(evolveCard, 'evolve', constructedRoyalRule)).toBe(true);
    expect(canAddCardToSection(royalLeaderCard, 'leader', constructedRoyalRule)).toBe(true);
    expect(canAddCardToSection(tokenCard, 'token', constructedRoyalRule)).toBe(true);
    expect(isCardAllowedByRule(dragonCard, constructedRoyalRule)).toBe(false);

    const constructedTitleRule: DeckRuleConfig = {
      format: 'constructed',
      identityType: 'title',
      selectedClass: null,
      selectedTitle: 'ウマ娘 プリティーダービー',
      selectedClasses: [null, null],
    };
    expect(canAddCardToSection(titleCard, 'main', constructedTitleRule)).toBe(true);
    expect(canAddCardToSection(titleTokenCard, 'token', constructedTitleRule)).toBe(true);
    expect(isCardAllowedByRule(mainCard, constructedTitleRule)).toBe(false);
  });

  it('applies crossover restrictions to the selected classes, neutral cards, and tokens', () => {
    expect(isRuleConfigured(crossoverRule)).toBe(true);
    expect(getDeckLimit('leader', crossoverRule)).toBe(2);
    expect(canAddCardToSection(mainCard, 'main', crossoverRule)).toBe(true);
    expect(canAddCardToSection(witchCard, 'main', crossoverRule)).toBe(true);
    expect(canAddCardToSection(neutralCard, 'main', crossoverRule)).toBe(true);
    expect(canAddCardToSection(tokenCard, 'token', crossoverRule)).toBe(true);
    expect(canAddCardToSection(royalLeaderCard, 'leader', crossoverRule)).toBe(true);
    expect(canAddCardToSection(witchLeaderCard, 'leader', crossoverRule)).toBe(true);
    expect(canAddCardToSection(dragonCard, 'main', crossoverRule)).toBe(false);

    const duplicateClassRule: DeckRuleConfig = {
      ...crossoverRule,
      selectedClasses: [CLASS.ROYAL, CLASS.ROYAL],
    };
    expect(isRuleConfigured(duplicateClassRule)).toBe(false);
  });

  it('sanitizes imported deck sections against the current card catalog', () => {
    const sanitizedMain = sanitizeImportedSection([mainCard, evolveCard], [mainCard, evolveCard], 'main');
    const sanitizedEvolve = sanitizeImportedSection([mainCard, evolveCard], [mainCard, evolveCard], 'evolve');

    expect(sanitizedMain).toEqual([mainCard]);
    expect(sanitizedEvolve).toEqual([evolveCard]);
  });

  it('sanitizes imported deck states for both new and legacy leader formats', () => {
    const catalog = [
      mainCard,
      witchCard,
      evolveCard,
      royalLeaderCard,
      witchLeaderCard,
      tokenCard,
      dragonCard,
    ];

    const sanitizedCrossoverDeck = sanitizeImportedDeckState({
      mainDeck: [mainCard, dragonCard],
      evolveDeck: [evolveCard],
      leaderCards: [royalLeaderCard, witchLeaderCard],
      tokenDeck: [tokenCard],
    }, catalog, crossoverRule);

    expect(sanitizedCrossoverDeck).toEqual({
      mainDeck: [mainCard],
      evolveDeck: [evolveCard],
      leaderCards: [royalLeaderCard, witchLeaderCard],
      tokenDeck: [tokenCard],
    });

    const sanitizedLegacyDeck = sanitizeImportedDeckState({
      leaderCard: royalLeaderCard,
    }, catalog, constructedRoyalRule);

    expect(sanitizedLegacyDeck.leaderCards).toEqual([royalLeaderCard]);
  });

  it('reports invalid deck placements and deck size overflow', () => {
    const issues = validateDeckState({
      mainDeck: [mainCard, evolveCard],
      evolveDeck: Array.from({ length: 11 }, () => evolveCard),
      leaderCards: [],
      tokenDeck: [],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        { code: 'invalid-section', deck: 'main', cardId: evolveCard.id },
        { code: 'limit-exceeded', deck: 'evolve' },
      ])
    );
  });

  it('reports rule violations for cards that do not match the selected rule', () => {
    const issues = validateDeckState({
      mainDeck: [mainCard, dragonCard],
      evolveDeck: [],
      leaderCards: [royalLeaderCard, witchLeaderCard],
      tokenDeck: [],
    }, crossoverRule);

    expect(issues).toEqual(
      expect.arrayContaining([
        { code: 'invalid-rule', deck: 'main', cardId: dragonCard.id },
      ])
    );
  });
});
