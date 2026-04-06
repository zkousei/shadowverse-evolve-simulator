import { describe, expect, it, vi } from 'vitest';
import type { TokenOption } from '../types/game';
import {
  buildImportedDeckPayload,
  buildSpawnTokenInstance,
  buildSpawnTokens,
  type ImportableDeckData
} from './gameBoardDeckActions';

describe('gameBoardDeckActions', () => {
  it('builds imported deck payloads for main, evolve, leader, and token sections', () => {
    const createId = vi
      .fn<() => string>()
      .mockReturnValueOnce('card-1')
      .mockReturnValueOnce('card-2')
      .mockReturnValueOnce('card-3');

    const payload = buildImportedDeckPayload({
      mainDeck: [
        { id: 'main-1', name: 'Main Card', image: '/main.png', deck_section: 'main', card_kind_normalized: 'follower' },
        { id: 'skip-main', name: 'Skip Main', image: '/skip.png', deck_section: 'token', card_kind_normalized: 'follower' },
      ],
      evolveDeck: [
        { id: 'evolve-1', name: 'Evolve Card', image: '/evolve.png', deck_section: 'evolve', card_kind_normalized: 'follower' },
      ],
      leaderCards: [
        { id: 'leader-1', name: 'Leader Card', image: '/leader.png', deck_section: 'leader', card_kind_normalized: 'leader' },
      ],
      tokenDeck: [
        { id: 'token-1', name: 'Token A', image: '/token-a.png', deck_section: 'token', card_kind_normalized: 'token' },
        { id: 'token-1', name: 'Token A', image: '/token-a.png', deck_section: 'token', card_kind_normalized: 'token' },
      ],
    }, 'host', createId);

    expect(payload.cards).toHaveLength(3);
    expect(payload.cards.map((card) => card.zone)).toEqual([
      'mainDeck-host',
      'evolveDeck-host',
      'leader-host',
    ]);
    expect(payload.cards[1].isEvolveCard).toBe(true);
    expect(payload.cards[2].isLeaderCard).toBe(true);
    expect(payload.cards[2].isFlipped).toBe(false);
    expect(payload.tokenOptions).toEqual([
      {
        cardId: 'token-1',
        name: 'Token A',
        image: '/token-a.png',
        baseCardType: null,
        cardKindNormalized: 'token',
      },
    ]);
  });

  it('accepts a legacy single leaderCard payload', () => {
    const createId = vi.fn<() => string>().mockReturnValue('leader-card-id');
    const payload = buildImportedDeckPayload({
      leaderCard: {
        id: 'leader-legacy',
        name: 'Legacy Leader',
        image: '/leader.png',
        deck_section: 'leader',
        type: 'leader',
      },
    } satisfies ImportableDeckData, 'guest', createId);

    expect(payload.cards).toHaveLength(1);
    expect(payload.cards[0]).toMatchObject({
      id: 'leader-card-id',
      cardId: 'leader-legacy',
      zone: 'leader-guest',
      owner: 'guest',
      isLeaderCard: true,
      isFlipped: false,
    });
  });

  it('builds a single token instance with token-specific stats', () => {
    const tokenOption: TokenOption = {
      cardId: 'token',
      name: 'Token',
      image: '/token.png',
      baseCardType: 'follower',
    };

    const token = buildSpawnTokenInstance('host', tokenOption, 'field', () => 'token-id');

    expect(token).toMatchObject({
      id: 'token-id',
      zone: 'field-host',
      owner: 'host',
      isTokenCard: true,
      counters: { atk: 1, hp: 1 },
    });
  });

  it('builds batched token spawns and ignores zero counts', () => {
    const createId = vi
      .fn<() => string>()
      .mockReturnValueOnce('token-1')
      .mockReturnValueOnce('token-2')
      .mockReturnValueOnce('token-3');

    const tokens = buildSpawnTokens('guest', [
      {
        tokenOption: {
          cardId: 'alpha',
          name: 'Alpha',
          image: '/alpha.png',
          baseCardType: 'follower',
        },
        count: 2,
      },
      {
        tokenOption: {
          cardId: 'beta',
          name: 'Beta',
          image: '/beta.png',
          baseCardType: 'amulet',
        },
        count: 0,
      },
      {
        tokenOption: {
          cardId: 'gamma',
          name: 'Gamma',
          image: '/gamma.png',
          baseCardType: 'follower',
        },
        count: 1,
      },
    ], 'ex', createId);

    expect(tokens).toHaveLength(3);
    expect(tokens.map((token) => token.id)).toEqual(['token-1', 'token-2', 'token-3']);
    expect(tokens.every((token) => token.zone === 'ex-guest')).toBe(true);
  });
});
