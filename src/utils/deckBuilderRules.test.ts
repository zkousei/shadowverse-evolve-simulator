import { describe, expect, it } from 'vitest';
import { CLASS } from '../models/class';
import type { DeckRuleConfig } from '../models/deckRule';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import {
  canAddCardToDeckState,
  canAddCardToSection,
  getAllowedSections,
  getDeckLimit,
  getDeckValidationMessages,
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

const variantMainCard: DeckBuilderCardData = {
  ...mainCard,
  id: 'BP01-099',
  rarity: 'PR',
  product_name: 'Promo Pack',
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

const rapidFireCard: DeckBuilderCardData = {
  id: 'BP11-045',
  name: 'ラピッドファイア',
  image: '/rapid-fire.png',
  class: 'ウィッチ',
  type: 'スペル',
  card_kind_normalized: 'spell',
  deck_section: 'main',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const onionArmyCard: DeckBuilderCardData = {
  id: 'BP09-049',
  name: 'オニオン軍団',
  image: '/onion-army.png',
  class: 'ウィッチ',
  type: 'フォロワー',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const bannedConstructedCard: DeckBuilderCardData = {
  id: 'BP12-044',
  name: '運命への反逆',
  image: '/betrayal.png',
  class: 'ウィッチ',
  type: 'スペル',
  card_kind_normalized: 'spell',
  deck_section: 'main',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const limitedConstructedWitchCard: DeckBuilderCardData = {
  id: 'BP03-048',
  name: 'お菓子の家',
  image: '/candy-house.png',
  class: 'ウィッチ',
  type: 'アミュレット',
  card_kind_normalized: 'amulet',
  deck_section: 'main',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const limitedCrossoverMainCard: DeckBuilderCardData = {
  id: 'BP14-022',
  name: '天下の大泥棒・ジエモン',
  image: '/jiemon-main.png',
  class: 'ロイヤル',
  type: 'フォロワー',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const limitedCrossoverEvolveCard: DeckBuilderCardData = {
  id: 'BP14-023',
  name: '天下の大泥棒・ジエモン',
  image: '/jiemon-evolve.png',
  class: 'ロイヤル',
  type: 'フォロワー・エボルヴ',
  card_kind_normalized: 'evolve_follower',
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

const constructedWitchRule: DeckRuleConfig = {
  format: 'constructed',
  identityType: 'class',
  selectedClass: CLASS.WITCH,
  selectedTitle: null,
  selectedClasses: [null, null],
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

  it('prevents adding more than three effective copies per main or evolve deck', () => {
    expect(canAddCardToDeckState(mainCard, 'main', {
      mainDeck: [mainCard, variantMainCard, { ...variantMainCard, id: 'BP01-100' }],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    }, constructedRoyalRule)).toBe(false);

    expect(canAddCardToDeckState(evolveCard, 'evolve', {
      mainDeck: [],
      evolveDeck: [evolveCard, { ...evolveCard, id: 'EV01-002' }, { ...evolveCard, id: 'EV01-003' }],
      leaderCards: [],
      tokenDeck: [],
    }, constructedRoyalRule)).toBe(false);
  });

  it('allows ability-based copy limit exceptions for matching cards', () => {
    const rapidFireDeck = {
      mainDeck: Array.from({ length: 5 }, (_, index) => ({ ...rapidFireCard, id: `BP11-0${45 + index}` })),
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    };
    expect(canAddCardToDeckState(rapidFireCard, 'main', rapidFireDeck, crossoverRule)).toBe(true);

    const fullRapidFireDeck = {
      ...rapidFireDeck,
      mainDeck: [...rapidFireDeck.mainDeck, { ...rapidFireCard, id: 'BP11-P12' }],
    };
    expect(canAddCardToDeckState(rapidFireCard, 'main', fullRapidFireDeck, crossoverRule)).toBe(false);

    const onionArmyDeck = {
      mainDeck: Array.from({ length: 49 }, (_, index) => ({ ...onionArmyCard, id: `BP09-${100 + index}` })),
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    };
    expect(canAddCardToDeckState(onionArmyCard, 'main', onionArmyDeck, crossoverRule)).toBe(true);
  });

  it('applies policy bans and restrictions per format', () => {
    expect(canAddCardToDeckState(bannedConstructedCard, 'main', {
      mainDeck: [],
      evolveDeck: [],
      leaderCards: [royalLeaderCard],
      tokenDeck: [],
    }, constructedWitchRule)).toBe(false);

    expect(canAddCardToDeckState(limitedConstructedWitchCard, 'main', {
      mainDeck: [],
      evolveDeck: [],
      leaderCards: [witchLeaderCard],
      tokenDeck: [],
    }, constructedWitchRule)).toBe(true);

    expect(canAddCardToDeckState(limitedConstructedWitchCard, 'main', {
      mainDeck: [limitedConstructedWitchCard],
      evolveDeck: [],
      leaderCards: [witchLeaderCard],
      tokenDeck: [],
    }, constructedWitchRule)).toBe(false);

    expect(canAddCardToDeckState(limitedCrossoverMainCard, 'main', {
      mainDeck: [],
      evolveDeck: [],
      leaderCards: [royalLeaderCard, witchLeaderCard],
      tokenDeck: [],
    }, crossoverRule)).toBe(true);

    expect(canAddCardToDeckState(limitedCrossoverMainCard, 'main', {
      mainDeck: [limitedCrossoverMainCard],
      evolveDeck: [],
      leaderCards: [royalLeaderCard, witchLeaderCard],
      tokenDeck: [],
    }, crossoverRule)).toBe(false);

    expect(canAddCardToDeckState(limitedCrossoverEvolveCard, 'evolve', {
      mainDeck: [limitedCrossoverMainCard],
      evolveDeck: [limitedCrossoverEvolveCard, { ...limitedCrossoverEvolveCard, id: 'BP14-P06' }],
      leaderCards: [royalLeaderCard, witchLeaderCard],
      tokenDeck: [],
    }, crossoverRule)).toBe(true);
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

  it('sanitizes imported duplicate variants beyond the effective three-copy limit', () => {
    const duplicateMainCards = [
      mainCard,
      variantMainCard,
      { ...variantMainCard, id: 'BP01-100' },
      { ...variantMainCard, id: 'BP01-101' },
    ];

    const sanitizedMain = sanitizeImportedSection(duplicateMainCards, duplicateMainCards, 'main', constructedRoyalRule);
    expect(sanitizedMain).toHaveLength(3);
  });

  it('keeps ability-based extra copies during import sanitize', () => {
    const rapidFireCopies = Array.from({ length: 7 }, (_, index) => ({
      ...rapidFireCard,
      id: `BP11-RF-${index + 1}`,
    }));

    const sanitizedMain = sanitizeImportedSection(rapidFireCopies, rapidFireCopies, 'main', crossoverRule);
    expect(sanitizedMain).toHaveLength(6);
  });

  it('drops banned cards and trims limited cards during import sanitize', () => {
    const sanitizedMain = sanitizeImportedSection(
      [
        bannedConstructedCard,
        limitedConstructedWitchCard,
        { ...limitedConstructedWitchCard, id: 'PR-121' },
      ],
      [
        bannedConstructedCard,
        limitedConstructedWitchCard,
        { ...limitedConstructedWitchCard, id: 'PR-121' },
      ],
      'main',
      constructedWitchRule
    );

    expect(sanitizedMain).toEqual([limitedConstructedWitchCard]);
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

  it('builds readable validation messages for export blocking issues', () => {
    const messages = getDeckValidationMessages({
      mainDeck: [mainCard, variantMainCard, { ...variantMainCard, id: 'BP01-100' }, { ...variantMainCard, id: 'BP01-101' }],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    }, constructedRoyalRule);

    expect(messages).toEqual(
      expect.arrayContaining([
        'Main Deck must contain at least 40 cards (4/40).',
        'This constructed deck requires exactly 1 leader (0/1).',
        'Main Deck contains too many copies of Main Card (4/3).',
      ])
    );
  });

  it('reports ability-based copy limit overruns with the effective limit', () => {
    const messages = getDeckValidationMessages({
      mainDeck: Array.from({ length: 7 }, (_, index) => ({
        ...rapidFireCard,
        id: `BP11-RF-${index + 1}`,
      })),
      evolveDeck: [],
      leaderCards: [royalLeaderCard, witchLeaderCard],
      tokenDeck: [],
    }, crossoverRule);

    expect(messages).toEqual(
      expect.arrayContaining([
        'Main Deck must contain at least 40 cards (7/40).',
        'Main Deck contains too many copies of ラピッドファイア (7/6).',
      ])
    );
  });

  it('reports banned and limited policy cards with readable messages', () => {
    const messages = getDeckValidationMessages({
      mainDeck: [
        bannedConstructedCard,
        limitedConstructedWitchCard,
        { ...limitedConstructedWitchCard, id: 'PR-121' },
      ],
      evolveDeck: [],
      leaderCards: [witchLeaderCard],
      tokenDeck: [],
    }, constructedWitchRule);

    expect(messages).toEqual(
      expect.arrayContaining([
        'Main Deck must contain at least 40 cards (3/40).',
        '運命への反逆 is banned in constructed.',
        'お菓子の家 is limited to 1 copy in constructed (2/1).',
      ])
    );
  });
});
