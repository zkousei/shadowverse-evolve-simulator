import { describe, expect, it } from 'vitest';
import { CLASS } from '../models/class';
import type { DeckRuleConfig } from '../models/deckRule';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import {
  canAddCardToSection,
  getAllowedSections,
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

const leaderCard: DeckBuilderCardData = {
  id: 'LDR01-001',
  name: 'Leader Card',
  image: '/leader.png',
  class: 'ロイヤル',
  type: 'リーダー',
  card_kind_normalized: 'leader',
  deck_section: 'leader',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
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
};

describe('deckBuilderRules', () => {
  it('returns the allowed deck section for each card', () => {
    expect(getAllowedSections(mainCard)).toEqual(['main']);
    expect(getAllowedSections(evolveCard)).toEqual(['evolve']);
    expect(getAllowedSections(leaderCard)).toEqual(['leader']);
    expect(getAllowedSections(tokenCard)).toEqual(['token']);
  });

  it('accepts cards only in their legal deck section', () => {
    expect(canAddCardToSection(mainCard, 'main')).toBe(true);
    expect(canAddCardToSection(mainCard, 'evolve')).toBe(false);
    expect(canAddCardToSection(evolveCard, 'evolve')).toBe(true);
    expect(canAddCardToSection(evolveCard, 'main')).toBe(false);
    expect(canAddCardToSection(leaderCard, 'leader')).toBe(true);
    expect(canAddCardToSection(tokenCard, 'main')).toBe(false);
  });

  it('applies constructed class and title restrictions when adding cards', () => {
    expect(isRuleConfigured(constructedRoyalRule)).toBe(true);
    expect(canAddCardToSection(mainCard, 'main', constructedRoyalRule)).toBe(true);
    expect(canAddCardToSection(evolveCard, 'evolve', constructedRoyalRule)).toBe(true);
    expect(canAddCardToSection(leaderCard, 'leader', constructedRoyalRule)).toBe(true);
    expect(canAddCardToSection(tokenCard, 'token', constructedRoyalRule)).toBe(true);

    const offClassCard = { ...mainCard, id: 'BP01-099', class: 'ドラゴン' as const };
    expect(isCardAllowedByRule(offClassCard, constructedRoyalRule)).toBe(false);

    const constructedTitleRule: DeckRuleConfig = {
      format: 'constructed',
      identityType: 'title',
      selectedClass: null,
      selectedTitle: 'ウマ娘 プリティーダービー',
    };
    expect(canAddCardToSection(titleCard, 'main', constructedTitleRule)).toBe(true);
    expect(canAddCardToSection(titleTokenCard, 'token', constructedTitleRule)).toBe(true);
    expect(isCardAllowedByRule(mainCard, constructedTitleRule)).toBe(false);
  });

  it('sanitizes imported deck sections against the current card catalog', () => {
    const sanitizedMain = sanitizeImportedSection([mainCard, evolveCard], [mainCard, evolveCard], 'main');
    const sanitizedEvolve = sanitizeImportedSection([mainCard, evolveCard], [mainCard, evolveCard], 'evolve');

    expect(sanitizedMain).toEqual([mainCard]);
    expect(sanitizedEvolve).toEqual([evolveCard]);
  });

  it('sanitizes a full imported deck state including leader and token sections', () => {
    const sanitizedDeck = sanitizeImportedDeckState({
      mainDeck: [mainCard, evolveCard],
      evolveDeck: [evolveCard, mainCard],
      leaderCard,
      tokenDeck: [tokenCard, mainCard],
    }, [mainCard, evolveCard, leaderCard, tokenCard]);

    expect(sanitizedDeck).toEqual({
      mainDeck: [mainCard],
      evolveDeck: [evolveCard],
      leaderCard,
      tokenDeck: [tokenCard],
    });
  });

  it('reports invalid deck placements and deck size overflow', () => {
    const issues = validateDeckState({
      mainDeck: [mainCard, evolveCard],
      evolveDeck: Array.from({ length: 11 }, () => evolveCard),
      leaderCard: null,
      tokenDeck: [],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        { code: 'invalid-section', deck: 'main', cardId: evolveCard.id },
        { code: 'limit-exceeded', deck: 'evolve' },
      ])
    );
  });

  it('reports rule violations for cards that do not match the selected constructed identity', () => {
    const offClassCard = { ...mainCard, id: 'BP01-099', class: 'ドラゴン' as const };
    const issues = validateDeckState({
      mainDeck: [mainCard, offClassCard],
      evolveDeck: [],
      leaderCard: null,
      tokenDeck: [],
    }, constructedRoyalRule);

    expect(issues).toEqual(
      expect.arrayContaining([
        { code: 'invalid-rule', deck: 'main', cardId: offClassCard.id },
      ])
    );
  });
});
