import { describe, expect, it } from 'vitest';
import { createEmptyDeckState } from '../models/deckState';
import { createDefaultDeckRuleConfig } from '../models/deckRule';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { addCardToDeckState, removeCardFromDeckState, removeLastCardById } from './deckBuilderMutations';

const makeCard = (overrides: Partial<DeckBuilderCardData> = {}): DeckBuilderCardData => ({
  id: 'BP01-001',
  name: 'Alpha Knight',
  image: '/alpha.png',
  class: 'ロイヤル',
  title: 'Hero Tale',
  type: 'フォロワー',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  ...overrides,
});

describe('deckBuilderMutations', () => {
  it('removes the last matching card id from a deck list', () => {
    const alphaA = makeCard({ id: 'A' });
    const beta = makeCard({ id: 'B' });
    const alphaB = makeCard({ id: 'A', name: 'Alpha Knight 2' });

    expect(removeLastCardById([alphaA, beta, alphaB], 'A')).toEqual([alphaA, beta]);
    expect(removeLastCardById([alphaA, beta], 'Z')).toEqual([alphaA, beta]);
    expect(removeLastCardById([alphaA, beta])).toEqual([alphaA, beta]);
  });

  it('adds cards to main and evolve sections within their limits', () => {
    const card = makeCard();
    const baseState = createEmptyDeckState();

    expect(
      addCardToDeckState(baseState, card, 'main', {
        deckRuleConfig: createDefaultDeckRuleConfig(),
        leaderLimit: 1,
      }).mainDeck
    ).toEqual([card]);

    expect(
      addCardToDeckState(baseState, card, 'evolve', {
        deckRuleConfig: createDefaultDeckRuleConfig(),
        leaderLimit: 1,
      }).evolveDeck
    ).toEqual([card]);
  });

  it('blocks main and evolve additions when the section is already full', () => {
    const card = makeCard();
    const fullMainState = {
      ...createEmptyDeckState(),
      mainDeck: Array.from({ length: 50 }, (_, index) => makeCard({ id: `M-${index}` })),
    };
    const fullEvolveState = {
      ...createEmptyDeckState(),
      evolveDeck: Array.from({ length: 10 }, (_, index) => makeCard({ id: `E-${index}` })),
    };

    expect(addCardToDeckState(fullMainState, card, 'main', {
      deckRuleConfig: createDefaultDeckRuleConfig(),
      leaderLimit: 1,
    })).toBe(fullMainState);

    expect(addCardToDeckState(fullEvolveState, card, 'evolve', {
      deckRuleConfig: createDefaultDeckRuleConfig(),
      leaderLimit: 1,
    })).toBe(fullEvolveState);
  });

  it('replaces the single leader in non-crossover formats', () => {
    const firstLeader = makeCard({ id: 'L-1', deck_section: 'leader', type: 'リーダー' });
    const secondLeader = makeCard({ id: 'L-2', deck_section: 'leader', type: 'リーダー', class: 'ウィッチ' });

    const nextState = addCardToDeckState({
      ...createEmptyDeckState(),
      leaderCards: [firstLeader],
    }, secondLeader, 'leader', {
      deckRuleConfig: createDefaultDeckRuleConfig(),
      leaderLimit: 1,
    });

    expect(nextState.leaderCards).toEqual([secondLeader]);
  });

  it('handles crossover leaders by class replacement and leader limit', () => {
    const ruleConfig = {
      ...createDefaultDeckRuleConfig(),
      format: 'crossover' as const,
    };
    const royalLeader = makeCard({ id: 'L-ROYAL', deck_section: 'leader', type: 'リーダー', class: 'ロイヤル' });
    const witchLeader = makeCard({ id: 'L-WITCH', deck_section: 'leader', type: 'リーダー', class: 'ウィッチ' });
    const royalLeaderReplacement = makeCard({ id: 'L-ROYAL-2', deck_section: 'leader', type: 'リーダー', class: 'ロイヤル' });
    const dragonLeader = makeCard({ id: 'L-DRAGON', deck_section: 'leader', type: 'リーダー', class: 'ドラゴン' });

    const withTwoLeaders = addCardToDeckState(
      addCardToDeckState(createEmptyDeckState(), royalLeader, 'leader', { deckRuleConfig: ruleConfig, leaderLimit: 2 }),
      witchLeader,
      'leader',
      { deckRuleConfig: ruleConfig, leaderLimit: 2 }
    );
    expect(withTwoLeaders.leaderCards).toEqual([royalLeader, witchLeader]);

    const replacedState = addCardToDeckState(withTwoLeaders, royalLeaderReplacement, 'leader', {
      deckRuleConfig: ruleConfig,
      leaderLimit: 2,
    });
    expect(replacedState.leaderCards).toEqual([royalLeaderReplacement, witchLeader]);

    expect(addCardToDeckState(withTwoLeaders, dragonLeader, 'leader', {
      deckRuleConfig: ruleConfig,
      leaderLimit: 2,
    })).toBe(withTwoLeaders);
  });

  it('rejects invalid crossover leader classes and removes cards by section', () => {
    const ruleConfig = {
      ...createDefaultDeckRuleConfig(),
      format: 'crossover' as const,
    };
    const neutralLeader = makeCard({
      id: 'L-N',
      deck_section: 'leader',
      type: 'リーダー',
      class: 'ニュートラル',
    });
    const tokenCard = makeCard({ id: 'T-1', deck_section: 'token', is_token: true });
    const nextState = addCardToDeckState(createEmptyDeckState(), tokenCard, 'token', {
      deckRuleConfig: createDefaultDeckRuleConfig(),
      leaderLimit: 1,
    });

    expect(addCardToDeckState(createEmptyDeckState(), neutralLeader, 'leader', {
      deckRuleConfig: ruleConfig,
      leaderLimit: 2,
    })).toEqual(createEmptyDeckState());

    expect(removeCardFromDeckState({
      ...nextState,
      mainDeck: [makeCard({ id: 'A' }), makeCard({ id: 'B' }), makeCard({ id: 'A' })],
    }, 'main', 'A').mainDeck.map(card => card.id)).toEqual(['A', 'B']);
    expect(removeCardFromDeckState(nextState, 'token', 'T-1').tokenDeck).toEqual([]);
  });
});
