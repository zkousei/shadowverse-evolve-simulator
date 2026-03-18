import { describe, expect, it } from 'vitest';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import {
  canAddCardToSection,
  getAllowedSections,
  sanitizeImportedDeckState,
  sanitizeImportedSection,
  validateDeckState,
} from './deckBuilderRules';

const mainCard: DeckBuilderCardData = {
  id: 'BP01-001',
  name: 'Main Card',
  image: '/main.png',
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
  type: 'リーダー',
  card_kind_normalized: 'leader',
  deck_section: 'leader',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
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
});
