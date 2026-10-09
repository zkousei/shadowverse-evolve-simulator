import { describe, expect, it, vi } from 'vitest';
import { initialState, type SyncState } from '../../types/game';
import type { GameSyncEvent } from '../../types/sync';
import { applyGameSyncEvent } from './gameSyncReducer';
import * as CardLogic from '../card/cardLogic';

const createState = (overrides: Partial<SyncState> = {}): SyncState => ({
  ...initialState,
  ...overrides,
});

describe('gameSyncReducer', () => {
  it('treats shared coin and die events as no-ops for state', () => {
    const state = createState({ revision: 9 });

    const coinResult = applyGameSyncEvent(state, {
      id: 'evt-shared-coin',
      type: 'FLIP_SHARED_COIN',
      actor: 'host',
    });
    expect(coinResult).toBe(state);

    const dieResult = applyGameSyncEvent(state, {
      id: 'evt-shared-die',
      type: 'ROLL_SHARED_DIE',
      actor: 'guest',
    });
    expect(dieResult).toBe(state);
  });

  it('rejects host-only events from non-host requesters', () => {
    const startState = createState({
      revision: 3,
      host: { ...initialState.host, isReady: true },
      guest: { ...initialState.guest, isReady: true },
    });

    const startDenied = applyGameSyncEvent(startState, {
      id: 'evt-host-only-start',
      type: 'START_GAME',
      actor: 'host',
    }, 'guest');
    expect(startDenied).toBe(startState);

    const resetState = createState({
      revision: 4,
      gameStatus: 'playing',
      cards: [
        {
          id: 'field-host-card',
          cardId: 'BP01-001',
          name: 'Field Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const resetDenied = applyGameSyncEvent(resetState, {
      id: 'evt-host-only-reset',
      type: 'RESET_GAME',
      actor: 'host',
    }, 'guest');
    expect(resetDenied).toBe(resetState);
  });

  it('rejects actor-scoped events when the requester does not match the actor', () => {
    const drawState = createState({
      revision: 5,
      gameStatus: 'playing',
      cards: [
        {
          id: 'deck-host-card',
          cardId: 'BP01-002',
          name: 'Deck Card',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const drawDenied = applyGameSyncEvent(drawState, {
      id: 'evt-actor-only-draw',
      type: 'DRAW_CARD',
      actor: 'host',
    }, 'guest');
    expect(drawDenied).toBe(drawState);

    const importDenied = applyGameSyncEvent(createState({
      revision: 6,
      cards: [
        {
          id: 'original-host-card',
          cardId: 'BP01-003',
          name: 'Original',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    }), {
      id: 'evt-actor-only-import',
      type: 'IMPORT_DECK',
      actor: 'host',
      cards: [
        {
          id: 'new-host-card',
          cardId: 'BP01-999',
          name: 'Blocked Import',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    }, 'guest');
    expect(importDenied.cards.map(c => c.id)).toContain('original-host-card');
    expect(importDenied.cards.map(c => c.id)).not.toContain('new-host-card');
  });

  it('keeps actor-scoped setup events as no-ops when the requester does not match the actor', () => {
    const state = createState({
      revision: 7,
      cards: [
        {
          id: 'deck-host-1',
          cardId: 'BP01-010',
          name: 'Deck Host 1',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'deck-host-2',
          cardId: 'BP01-011',
          name: 'Deck Host 2',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'hand-host-1',
          cardId: 'BP01-012',
          name: 'Hand Host 1',
          image: '',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const deniedInitialHand = applyGameSyncEvent(state, {
      id: 'evt-actor-only-initial-hand',
      type: 'DRAW_INITIAL_HAND',
      actor: 'host',
    }, 'guest');
    expect(deniedInitialHand).toBe(state);

    const deniedMulligan = applyGameSyncEvent(state, {
      id: 'evt-actor-only-mulligan',
      type: 'EXECUTE_MULLIGAN',
      actor: 'host',
      selectedIds: ['hand-host-1'],
    }, 'guest');
    expect(deniedMulligan).toBe(state);

    const deniedShuffle = applyGameSyncEvent(state, {
      id: 'evt-actor-only-shuffle',
      type: 'SHUFFLE_DECK',
      actor: 'host',
    }, 'guest');
    expect(deniedShuffle).toBe(state);
  });

  it('blocks moving a hand card to the field while preparing', () => {
    const state = createState({
      revision: 8,
      gameStatus: 'preparing',
      cards: [
        {
          id: 'hand-host-card',
          cardId: 'BP01-020',
          name: 'Opening Hand Card',
          image: '',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-preparing-hand-play-blocked',
      type: 'PLAY_TO_FIELD',
      actor: 'host',
      cardId: 'hand-host-card',
    });

    expect(result).toBe(state);
  });

  it('sends main-deck spells to cemetery when PLAY_TO_FIELD is used during play', () => {
    const state = createState({
      revision: 8,
      gameStatus: 'playing',
      cards: [
        {
          id: 'spell-hand-card',
          cardId: 'BP01-099',
          name: 'Spell Card',
          image: '',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          baseCardType: 'spell',
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-play-main-spell',
      type: 'PLAY_TO_FIELD',
      actor: 'host',
      cardId: 'spell-hand-card',
    });

    expect(result.cards.find(c => c.id === 'spell-hand-card')?.zone).toBe('cemetery-host');
  });

  it('blocks dragging a hand card during preparation', () => {
    const state = createState({
      revision: 9,
      gameStatus: 'preparing',
      cards: [
        {
          id: 'hand-host-card',
          cardId: 'BP01-021',
          name: 'Opening Hand Card',
          image: '',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-preparing-hand-drag-blocked',
      type: 'MOVE_CARD',
      actor: 'host',
      cardId: 'hand-host-card',
      overId: 'field-host',
    });

    expect(result).toBe(state);
  });

  it('toggles ready for the actor and increments revision', () => {
    const result = applyGameSyncEvent(createState(), {
      id: 'evt-1',
      type: 'TOGGLE_READY',
      actor: 'guest',
    });

    expect(result.guest.isReady).toBe(true);
    expect(result.revision).toBe(1);
  });

  it('only lets the current turn player change phase', () => {
    const state = createState({ gameStatus: 'playing', turnPlayer: 'host', revision: 2 });

    const denied = applyGameSyncEvent(state, {
      id: 'evt-2',
      type: 'SET_PHASE',
      actor: 'guest',
      phase: 'Main',
    });
    expect(denied).toBe(state);

    const allowed = applyGameSyncEvent(state, {
      id: 'evt-3',
      type: 'SET_PHASE',
      actor: 'host',
      phase: 'Main',
    });
    expect(allowed.phase).toBe('Main');
    expect(allowed.revision).toBe(3);
  });

  it('keeps SET_PHASE as a no-op when the requester does not match or the game is not playing', () => {
    const wrongRequesterState = createState({
      gameStatus: 'playing',
      turnPlayer: 'host',
      revision: 4,
      phase: 'Start',
    });

    const wrongRequester = applyGameSyncEvent(wrongRequesterState, {
      id: 'evt-phase-wrong-requester',
      type: 'SET_PHASE',
      actor: 'host',
      phase: 'Main',
    }, 'guest');
    expect(wrongRequester).toBe(wrongRequesterState);

    const outsidePlayingState = createState({
      gameStatus: 'preparing',
      turnPlayer: 'host',
      revision: 5,
      phase: 'Start',
    });

    const outsidePlaying = applyGameSyncEvent(outsidePlayingState, {
      id: 'evt-phase-outside-playing',
      type: 'SET_PHASE',
      actor: 'host',
      phase: 'Main',
    }, 'host');
    expect(outsidePlaying).toBe(outsidePlayingState);
  });

  it('sets reveal hands mode and increments revision (host only)', () => {
    const state = createState({ revealHandsMode: false, revision: 10 });

    const denied = applyGameSyncEvent(state, {
      id: 'evt-reveal-denied',
      type: 'SET_REVEAL_HANDS_MODE',
      actor: 'guest',
      enabled: true,
    }, 'guest');
    expect(denied).toBe(state);

    const allowed = applyGameSyncEvent(state, {
      id: 'evt-reveal-allowed',
      type: 'SET_REVEAL_HANDS_MODE',
      actor: 'host',
      enabled: true,
    }, 'host');
    expect(allowed.revealHandsMode).toBe(true);
    expect(allowed.revision).toBe(11);
  });

  it('sets end stop only for the non-turn player while playing', () => {
    const state = createState({
      gameStatus: 'playing',
      turnPlayer: 'host',
      revision: 10,
    });

    const sameTurnDenied = applyGameSyncEvent(state, {
      id: 'evt-end-stop-denied',
      type: 'SET_END_STOP',
      actor: 'host',
      enabled: true,
    }, 'host');
    expect(sameTurnDenied).toBe(state);

    const allowed = applyGameSyncEvent(state, {
      id: 'evt-end-stop-allowed',
      type: 'SET_END_STOP',
      actor: 'guest',
      enabled: true,
    }, 'guest');
    expect(allowed.endStop.guest).toBe(true);
    expect(allowed.revision).toBe(11);
  });

  it('keeps SET_END_STOP as a no-op outside playing or when the value is unchanged', () => {
    const preparingState = createState({
      gameStatus: 'preparing',
      turnPlayer: 'host',
      revision: 12,
      endStop: {
        host: false,
        guest: false,
      },
    });

    const outsidePlaying = applyGameSyncEvent(preparingState, {
      id: 'evt-end-stop-outside-playing',
      type: 'SET_END_STOP',
      actor: 'guest',
      enabled: true,
    }, 'guest');
    expect(outsidePlaying).toBe(preparingState);

    const unchangedState = createState({
      gameStatus: 'playing',
      turnPlayer: 'host',
      revision: 13,
      endStop: {
        host: false,
        guest: true,
      },
    });

    const unchanged = applyGameSyncEvent(unchangedState, {
      id: 'evt-end-stop-unchanged',
      type: 'SET_END_STOP',
      actor: 'guest',
      enabled: true,
    }, 'guest');
    expect(unchanged).toBe(unchangedState);
  });

  it('blocks end turn when the next player has end stop enabled', () => {
    const state = createState({
      gameStatus: 'playing',
      turnPlayer: 'host',
      endStop: {
        host: false,
        guest: true,
      },
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-end-stop-block',
      type: 'END_TURN',
      actor: 'host',
    });

    expect(result).toBe(state);
  });

  it('keeps END_TURN as a no-op when the requester does not match or the game is not playing', () => {
    const wrongRequesterState = createState({
      gameStatus: 'playing',
      turnPlayer: 'host',
      revision: 14,
    });

    const wrongRequester = applyGameSyncEvent(wrongRequesterState, {
      id: 'evt-end-turn-wrong-requester',
      type: 'END_TURN',
      actor: 'host',
    }, 'guest');
    expect(wrongRequester).toBe(wrongRequesterState);

    const outsidePlayingState = createState({
      gameStatus: 'preparing',
      turnPlayer: 'host',
      revision: 15,
    });

    const outsidePlaying = applyGameSyncEvent(outsidePlayingState, {
      id: 'evt-end-turn-outside-playing',
      type: 'END_TURN',
      actor: 'host',
    }, 'host');
    expect(outsidePlaying).toBe(outsidePlayingState);
  });

  it('ends turn, advances resources, and draws for the next player', () => {
    const state = createState({
      gameStatus: 'playing',
      turnPlayer: 'host',
      revision: 4,
      endStop: {
        host: true,
        guest: false,
      },
      cards: [
        {
          id: 'deck-guest',
          cardId: 'BP01-001',
          name: 'Guest Deck Card',
          image: '',
          zone: 'mainDeck-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'tapped-guest',
          cardId: 'BP01-002',
          name: 'Tapped Guest Card',
          image: '',
          zone: 'field-guest',
          owner: 'guest',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-4',
      type: 'END_TURN',
      actor: 'host',
    });

    expect(result.turnPlayer).toBe('guest');
    expect(result.phase).toBe('Start');
    expect(result.endStop.guest).toBe(false);
    expect(result.guest.maxPp).toBe(1);
    expect(result.guest.pp).toBe(1);
    expect(result.cards.find(c => c.id === 'deck-guest')?.zone).toBe('hand-guest');
    expect(result.cards.find(c => c.id === 'tapped-guest')?.isTapped).toBe(false);
    expect(result.revision).toBe(5);
    expect(result.lastGameState).toBeDefined();
    expect(result.lastGameState?.turnPlayer).toBe('host');
  });

  it('resets the game while preserving non-token cards in their original decks', () => {
    const state = createState({
      revision: 8,
      gameStatus: 'playing',
      tokenOptions: {
        host: [{ cardId: 'token-host', name: 'Host Token', image: '/host-token.png' }],
        guest: [],
      },
      cards: [
        {
          id: 'main-1',
          cardId: 'BP01-001',
          name: 'Main Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 1, hp: 2 },
        },
        {
          id: 'evo-1',
          cardId: 'EV01-001',
          name: 'Evolve Card',
          image: '',
          zone: 'field-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'leader-1',
          cardId: 'LD01-001',
          name: 'Leader Card',
          image: '',
          zone: 'leader-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 2, hp: 3 },
          genericCounter: 4,
          isLeaderCard: true,
        },
        {
          id: 'token-1',
          cardId: 'token',
          name: 'Token',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 1, hp: 1 },
          isTokenCard: true,
        },
        {
          id: 'custom-token-1',
          cardId: 'TK01-001',
          name: 'Custom Token',
          image: '',
          zone: 'ex-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isTokenCard: true,
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-5',
      type: 'RESET_GAME',
      actor: 'host',
    });

    expect(result.gameStatus).toBe('preparing');
    expect(result.cards).toHaveLength(3);
    expect(result.cards.find(c => c.id === 'main-1')?.zone).toBe('mainDeck-host');
    expect(result.cards.find(c => c.id === 'evo-1')?.zone).toBe('evolveDeck-guest');
    expect(result.cards.find(c => c.id === 'leader-1')).toMatchObject({
      zone: 'leader-host',
      isFlipped: false,
      isTapped: false,
      counters: { atk: 0, hp: 0 },
      genericCounter: 0,
    });
    expect(result.host.isReady).toBe(false);
    expect(result.guest.isReady).toBe(false);
    expect(result.tokenOptions.host).toEqual([{ cardId: 'token-host', name: 'Host Token', image: '/host-token.png' }]);
    expect(result.revision).toBe(9);
  });

  it('shuffles both players main decks during reset', () => {
    const shuffleSpy = vi.spyOn(CardLogic, 'shuffleDeck');

    const state = createState({
      revision: 3,
      gameStatus: 'playing',
      cards: [
        {
          id: 'host-main-a',
          cardId: 'BP01-101',
          name: 'Host Main A',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 1, hp: 2 },
        },
        {
          id: 'guest-main-a',
          cardId: 'BP01-102',
          name: 'Guest Main A',
          image: '',
          zone: 'field-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 2, hp: 1 },
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-reset-shuffle',
      type: 'RESET_GAME',
      actor: 'host',
    });

    expect(shuffleSpy).toHaveBeenNthCalledWith(1, expect.any(Array), 'host');
    expect(shuffleSpy).toHaveBeenNthCalledWith(2, expect.any(Array), 'guest');
    expect(result.cards.find(c => c.id === 'host-main-a')).toMatchObject({
      zone: 'mainDeck-host',
      isFlipped: true,
      counters: { atk: 0, hp: 0 },
      genericCounter: 0,
    });
    expect(result.cards.find(c => c.id === 'guest-main-a')).toMatchObject({
      zone: 'mainDeck-guest',
      isFlipped: true,
      counters: { atk: 0, hp: 0 },
      genericCounter: 0,
    });

    shuffleSpy.mockRestore();
  });

  it('imports leader cards and token options with the deck', () => {
    const result = applyGameSyncEvent(createState({
      revision: 2,
      cards: [
        {
          id: 'old-main',
          cardId: 'BP01-010',
          name: 'Old Main',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    }), {
      id: 'evt-import-leader',
      type: 'IMPORT_DECK',
      actor: 'host',
      cards: [
        {
          id: 'new-main',
          cardId: 'BP01-011',
          name: 'New Main',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'new-leader',
          cardId: 'LD01-001',
          name: 'Leader',
          image: '',
          zone: 'leader-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isLeaderCard: true,
        },
      ],
      tokenOptions: [
        { cardId: 'TK01-001', name: 'Knight Token', image: '/knight.png' },
      ],
    });

    expect(result.cards.map(c => c.id)).toEqual(['new-main', 'new-leader']);
    expect(result.cards.find(c => c.id === 'new-leader')?.zone).toBe('leader-host');
    expect(result.tokenOptions.host).toEqual([
      { cardId: 'TK01-001', name: 'Knight Token', image: '/knight.png' },
    ]);
    expect(result.host.initialHandDrawn).toBe(false);
    expect(result.host.mulliganUsed).toBe(false);
    expect(result.host.isReady).toBe(false);
  });

  it('applies move-card events through the shared drop rules', () => {
    const state = createState({
      revision: 1,
      cards: [
        {
          id: 'evo-1',
          cardId: 'EV01-001',
          name: 'Evolve Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'cem-1',
          cardId: 'BP01-009',
          name: 'Cemetery',
          image: '',
          zone: 'cemetery-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-6',
      type: 'MOVE_CARD',
      actor: 'host',
      cardId: 'evo-1',
      overId: 'cem-1',
    });

    expect(result.cards.find(c => c.id === 'evo-1')?.zone).toBe('evolveDeck-host');
    expect(result.revision).toBe(2);
  });

  it('applies counter events through the shared counter rules', () => {
    const state = createState({
      revision: 3,
      cards: [
        {
          id: 'field-1',
          cardId: 'BP01-010',
          name: 'Field Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-7',
      type: 'MODIFY_COUNTER',
      actor: 'host',
      cardId: 'field-1',
      stat: 'hp',
      delta: 2,
    });

    expect(result.cards.find(c => c.id === 'field-1')?.counters.hp).toBe(2);
    expect(result.revision).toBe(4);
  });

  it('applies generic counter events through the shared counter rules', () => {
    const state = createState({
      revision: 3,
      cards: [
        {
          id: 'field-1',
          cardId: 'BP01-010',
          name: 'Field Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-7a',
      type: 'MODIFY_GENERIC_COUNTER',
      actor: 'host',
      cardId: 'field-1',
      delta: 1,
    });

    expect(result.cards.find(c => c.id === 'field-1')?.genericCounter).toBe(1);
    expect(result.revision).toBe(4);
  });

  it('applies draw and mill events through shared card rules', () => {
    const state = createState({
      revision: 0,
      gameStatus: 'playing',
      cards: [
        {
          id: 'deck-1',
          cardId: 'BP01-011',
          name: 'Top Card',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'deck-2',
          cardId: 'BP01-012',
          name: 'Next Card',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const drawn = applyGameSyncEvent(state, {
      id: 'evt-8',
      type: 'DRAW_CARD',
      actor: 'host',
    });
    expect(drawn.cards.find(c => c.id === 'deck-1')?.zone).toBe('hand-host');

    const milled = applyGameSyncEvent(drawn, {
      id: 'evt-9',
      type: 'MILL_CARD',
      actor: 'host',
    });
    expect(milled.cards.find(c => c.id === 'deck-2')?.zone).toBe('cemetery-host');

    const toppedToEx = applyGameSyncEvent(createState({
      revision: 0,
      gameStatus: 'playing',
      cards: [
        {
          id: 'deck-3',
          cardId: 'BP01-015',
          name: 'EX Target',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    }), {
      id: 'evt-10',
      type: 'MOVE_TOP_CARD_TO_EX',
      actor: 'host',
    });
    expect(toppedToEx.cards.find(c => c.id === 'deck-3')?.zone).toBe('ex-host');

    const toppedToBanish = applyGameSyncEvent(createState({
      revision: 0,
      gameStatus: 'playing',
      cards: [
        {
          id: 'deck-4',
          cardId: 'BP01-016',
          name: 'Banish Target',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    }), {
      id: 'evt-11',
      type: 'MOVE_TOP_CARD_TO_BANISH',
      actor: 'host',
    });
    expect(toppedToBanish.cards.find(c => c.id === 'deck-4')).toMatchObject({
      zone: 'banish-host',
      isFlipped: false,
    });
  });

  it('applies top-deck resolution and appends imported cards with revision bumps', () => {
    const state = createState({
      revision: 10,
      cards: [
        {
          id: 'deck-1',
          cardId: 'BP01-013',
          name: 'Deck Card',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'guest-old',
          cardId: 'BP01-014',
          name: 'Guest Card',
          image: '',
          zone: 'mainDeck-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const resolved = applyGameSyncEvent(state, {
      id: 'evt-10',
      type: 'RESOLVE_TOP_DECK',
      actor: 'host',
      results: [{ cardId: 'deck-1', action: 'hand' }],
    });
    expect(resolved.cards.find(c => c.id === 'deck-1')?.zone).toBe('hand-host');
    expect(resolved.revision).toBe(11);

    const imported = applyGameSyncEvent(resolved, {
      id: 'evt-11',
      type: 'IMPORT_DECK',
      actor: 'host',
      cards: [
        {
          id: 'new-host',
          cardId: 'BP01-015',
          name: 'New Host Card',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    expect(imported.cards.find(c => c.id === 'new-host')).toBeDefined();
    expect(imported.cards.find(c => c.id === 'guest-old')).toBeDefined();
    expect(imported.revision).toBe(12);
  });

  it('applies tap and evolve-deck usage flip events through shared card rules', () => {
    const state = createState({
      gameStatus: 'preparing',
      revision: 6,
      cards: [
        {
          id: 'parent',
          cardId: 'EV01-013',
          name: 'Parent',
          image: '',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'child',
          cardId: 'BP01-014',
          name: 'Child',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          attachedTo: 'parent',
        },
      ],
    });

    const tapped = applyGameSyncEvent(state, {
      id: 'evt-10',
      type: 'TOGGLE_TAP',
      actor: 'host',
      cardId: 'child',
    });
    expect(tapped.cards.every(c => c.isTapped)).toBe(true);

    const flipped = applyGameSyncEvent(tapped, {
      id: 'evt-11',
      type: 'TOGGLE_FLIP',
      actor: 'host',
      cardId: 'parent',
    });
    expect(flipped.cards.find(c => c.id === 'parent')?.isFlipped).toBe(false);
    expect(flipped.cards.find(c => c.id === 'child')?.isFlipped).toBe(false);
  });

  it('declares attacks by tapping the attacker on the current turn', () => {
    const state = createState({
      revision: 4,
      gameStatus: 'playing',
      turnPlayer: 'host',
      cards: [
        {
          id: 'attacker',
          cardId: 'BP01-100',
          name: 'Attacker',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'target',
          cardId: 'BP01-101',
          name: 'Target',
          image: '',
          zone: 'field-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const attacked = applyGameSyncEvent(state, {
      id: 'evt-attack',
      type: 'ATTACK_DECLARATION',
      actor: 'host',
      attackerCardId: 'attacker',
      target: { type: 'card', cardId: 'target' },
    });

    expect(attacked.cards.find(c => c.id === 'attacker')?.isTapped).toBe(true);
    expect(attacked.revision).toBe(5);
  });

  it('blocks flip events for non-owned or non-evolve-deck cards', () => {
    const baseState = createState({
      revision: 4,
      gameStatus: 'preparing',
      cards: [
        {
          id: 'field-card',
          cardId: 'BP01-900',
          name: 'Field Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'guest-evo',
          cardId: 'EV01-900',
          name: 'Guest Evolve',
          image: '',
          zone: 'evolveDeck-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
      ],
    });

    const fieldFlip = applyGameSyncEvent(baseState, {
      id: 'evt-11a',
      type: 'TOGGLE_FLIP',
      actor: 'host',
      cardId: 'field-card',
    });
    expect(fieldFlip).toBe(baseState);

    const otherOwnerFlip = applyGameSyncEvent(baseState, {
      id: 'evt-11b',
      type: 'TOGGLE_FLIP',
      actor: 'host',
      cardId: 'guest-evo',
    });
    expect(otherOwnerFlip).toBe(baseState);

    const nonEvolveDeckState = createState({
      ...baseState,
      cards: [
        ...baseState.cards,
        {
          id: 'host-main',
          cardId: 'BP01-901',
          name: 'Host Main',
          image: '',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });
    const nonEvolveDeckFlip = applyGameSyncEvent(nonEvolveDeckState, {
      id: 'evt-11c',
      type: 'TOGGLE_FLIP',
      actor: 'host',
      cardId: 'host-main',
    });
    expect(nonEvolveDeckFlip).toBe(nonEvolveDeckState);
  });

  it('allows evolve-deck usage flip events during the game', () => {
    const playingState = createState({
      revision: 4,
      gameStatus: 'playing',
      cards: [
        {
          id: 'guest-evo',
          cardId: 'EV01-900',
          name: 'Guest Evolve',
          image: '',
          zone: 'evolveDeck-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
      ],
    });

    const duringGameFlip = applyGameSyncEvent(playingState, {
      id: 'evt-11d',
      type: 'TOGGLE_FLIP',
      actor: 'guest',
      cardId: 'guest-evo',
    });

    expect(duringGameFlip.cards.find(c => c.id === 'guest-evo')?.isFlipped).toBe(false);
  });

  it('sets the selected face for an owned evolve-deck card without changing usage state', () => {
    const state = createState({
      revision: 4,
      gameStatus: 'playing',
      cards: [
        {
          id: 'guest-evo',
          cardId: 'BP08-003',
          name: 'Double Face Evolve',
          image: '',
          zone: 'evolveDeck-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-set-face',
      type: 'SET_CARD_FACE',
      actor: 'guest',
      cardId: 'guest-evo',
      faceSide: 'back',
    });

    const updatedCard = result.cards.find(c => c.id === 'guest-evo');
    expect(updatedCard?.selectedFaceSide).toBe('back');
    expect(updatedCard?.isFlipped).toBe(true);
    expect(result.revision).toBe(5);
  });

  it('rejects selected face changes from the wrong requester or non-evolve deck cards', () => {
    const state = createState({
      revision: 4,
      cards: [
        {
          id: 'guest-evo',
          cardId: 'BP08-003',
          name: 'Guest Evolve',
          image: '',
          zone: 'evolveDeck-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'host-main',
          cardId: 'BP01-001',
          name: 'Host Main',
          image: '',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: false,
        },
      ],
    });

    const wrongRequester = applyGameSyncEvent(state, {
      id: 'evt-set-face-denied-requester',
      type: 'SET_CARD_FACE',
      actor: 'guest',
      cardId: 'guest-evo',
      faceSide: 'back',
    }, 'host');
    expect(wrongRequester).toBe(state);

    const nonEvolve = applyGameSyncEvent(state, {
      id: 'evt-set-face-denied-kind',
      type: 'SET_CARD_FACE',
      actor: 'host',
      cardId: 'host-main',
      faceSide: 'back',
    });
    expect(nonEvolve).toBe(state);
  });

  it('applies shortcut movement events through shared card rules', () => {
    const state = createState({
      revision: 10,
      cards: [
        {
          id: 'normal',
          cardId: 'BP01-015',
          name: 'Normal',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'evo',
          cardId: 'EV01-002',
          name: 'Evolve',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
      ],
    });

    const bottomed = applyGameSyncEvent(state, {
      id: 'evt-12',
      type: 'SEND_TO_BOTTOM',
      actor: 'host',
      cardId: 'normal',
    });
    expect(bottomed.cards.find(c => c.id === 'normal')?.zone).toBe('mainDeck-host');

    const banished = applyGameSyncEvent(bottomed, {
      id: 'evt-13',
      type: 'BANISH_CARD',
      actor: 'host',
      cardId: 'evo',
    });
    expect(banished.cards.find(c => c.id === 'evo')?.zone).toBe('evolveDeck-host');

    const cemeteryState = createState({
      revision: 12,
      cards: [
        {
          id: 'normal-2',
          cardId: 'BP01-015',
          name: 'Normal 2',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'evo-2',
          cardId: 'EV01-003',
          name: 'Evolve 2',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
      ],
    });

    const sentToCemetery = applyGameSyncEvent(cemeteryState, {
      id: 'evt-13a',
      type: 'SEND_TO_CEMETERY',
      actor: 'host',
      cardId: 'normal-2',
    });
    expect(sentToCemetery.cards.find(c => c.id === 'normal-2')?.zone).toBe('cemetery-host');

    const returned = applyGameSyncEvent(sentToCemetery, {
      id: 'evt-13b',
      type: 'RETURN_EVOLVE',
      actor: 'host',
      cardId: 'evo-2',
    });
    expect(returned.cards.find(c => c.id === 'evo-2')?.zone).toBe('evolveDeck-host');
  });

  it('returns attached evolve cards to evolve deck when the base card goes to cemetery', () => {
    const state = createState({
      revision: 20,
      cards: [
        {
          id: 'base',
          cardId: 'BP01-500',
          name: 'Base',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'evo',
          cardId: 'EV01-500',
          name: 'Attached Evolve',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          attachedTo: 'base',
          isEvolveCard: true,
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-13c',
      type: 'SEND_TO_CEMETERY',
      actor: 'host',
      cardId: 'base',
    });

    expect(result.cards.find(c => c.id === 'base')?.zone).toBe('cemetery-host');
    expect(result.cards.find(c => c.id === 'evo')?.zone).toBe('evolveDeck-host');
    expect(result.cards.find(c => c.id === 'evo')?.attachedTo).toBeUndefined();
  });

  it('discards random cards from the opponent hand as one authoritative card move', () => {
    const state = createState({
      revision: 30,
      gameStatus: 'playing',
      cards: [
        { id: 'host-hand', cardId: 'BP01-101', name: 'Host Hand', image: '', zone: 'hand-host', owner: 'host', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
        { id: 'guest-hand-1', cardId: 'BP01-102', name: 'Guest Hand 1', image: '', zone: 'hand-guest', owner: 'guest', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
        { id: 'guest-hand-2', cardId: 'BP01-103', name: 'Guest Hand 2', image: '', zone: 'hand-guest', owner: 'guest', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
        { id: 'guest-hand-3', cardId: 'BP01-104', name: 'Guest Hand 3', image: '', zone: 'hand-guest', owner: 'guest', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
      ],
    });
    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0);

    try {
      const result = applyGameSyncEvent(state, {
        id: 'evt-random-discard',
        type: 'DISCARD_RANDOM_HAND_CARDS',
        actor: 'host',
        target: 'guest',
        count: 2,
      });

      expect(result.revision).toBe(31);
      expect(result.lastUndoableCardMoveActor).toBe('host');
      expect(result.lastUndoableCardMoveState?.revision).toBe(30);
      expect(result.cards.find(c => c.id === 'host-hand')?.zone).toBe('hand-host');
      expect(result.cards.find(c => c.id === 'guest-hand-1')?.zone).toBe('cemetery-guest');
      expect(result.cards.find(c => c.id === 'guest-hand-2')?.zone).toBe('cemetery-guest');
      expect(result.cards.find(c => c.id === 'guest-hand-3')?.zone).toBe('hand-guest');
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('rejects random hand discard outside opponent-hand authoritative conditions', () => {
    const state = createState({
      revision: 31,
      gameStatus: 'playing',
      cards: [
        { id: 'guest-hand-1', cardId: 'BP01-105', name: 'Guest Hand 1', image: '', zone: 'hand-guest', owner: 'guest', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
      ],
    });

    const wrongRequester = applyGameSyncEvent(state, {
      id: 'evt-random-discard-wrong-requester',
      type: 'DISCARD_RANDOM_HAND_CARDS',
      actor: 'host',
      target: 'guest',
      count: 1,
    }, 'guest');
    expect(wrongRequester).toBe(state);

    const selfTarget = applyGameSyncEvent(state, {
      id: 'evt-random-discard-self',
      type: 'DISCARD_RANDOM_HAND_CARDS',
      actor: 'guest',
      target: 'guest',
      count: 1,
    });
    expect(selfTarget).toBe(state);

    const preparingState = { ...state, gameStatus: 'preparing' as const };
    const preparing = applyGameSyncEvent(preparingState, {
      id: 'evt-random-discard-preparing',
      type: 'DISCARD_RANDOM_HAND_CARDS',
      actor: 'host',
      target: 'guest',
      count: 1,
    });
    expect(preparing).toBe(preparingState);
  });

  it('applies extract and play-to-field events through shared card rules', () => {
    const state = createState({
      revision: 2,
      cards: [
        {
          id: 'deck-card',
          cardId: 'BP01-016',
          name: 'Deck Card',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'hand-card',
          cardId: 'BP01-017',
          name: 'Hand Card',
          image: '',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const extracted = applyGameSyncEvent(state, {
      id: 'evt-14',
      type: 'EXTRACT_CARD',
      actor: 'host',
      cardId: 'deck-card',
      destination: 'hand-host',
    });
    expect(extracted.cards.find(c => c.id === 'deck-card')?.zone).toBe('hand-host');

    const played = applyGameSyncEvent({
      ...extracted,
      gameStatus: 'playing',
    }, {
      id: 'evt-15',
      type: 'PLAY_TO_FIELD',
      actor: 'host',
      cardId: 'hand-card',
    });
    expect(played.cards.find(c => c.id === 'hand-card')?.zone).toBe('field-host');
  });

  it('applies extract batches as one authoritative card move', () => {
    const state = createState({
      revision: 4,
      cards: [
        {
          id: 'deck-card-1',
          cardId: 'BP01-018',
          name: 'Deck Card 1',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'deck-card-2',
          cardId: 'BP01-019',
          name: 'Deck Card 2',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const extracted = applyGameSyncEvent(state, {
      id: 'evt-14-batch',
      type: 'EXTRACT_CARDS_BATCH',
      actor: 'host',
      cardIds: ['deck-card-1', 'deck-card-2'],
      destination: 'hand-host',
    });

    expect(extracted.revision).toBe(5);
    expect(extracted.lastUndoableCardMoveActor).toBe('host');
    expect(extracted.lastUndoableCardMoveState?.revision).toBe(4);
    expect(extracted.cards.find(c => c.id === 'deck-card-1')?.zone).toBe('hand-host');
    expect(extracted.cards.find(c => c.id === 'deck-card-2')?.zone).toBe('hand-host');
  });

  it('applies send-to-bottom batches as one authoritative card move', () => {
    const state = createState({
      revision: 8,
      cards: [
        {
          id: 'field-card-1',
          cardId: 'BP01-020',
          name: 'Field Card 1',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'field-card-2',
          cardId: 'BP01-021',
          name: 'Field Card 2',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const bottomed = applyGameSyncEvent(state, {
      id: 'evt-12-batch',
      type: 'SEND_TO_BOTTOM_BATCH',
      actor: 'host',
      cardIds: ['field-card-1', 'field-card-2'],
    });

    expect(bottomed.revision).toBe(9);
    expect(bottomed.lastUndoableCardMoveActor).toBe('host');
    expect(bottomed.lastUndoableCardMoveState?.revision).toBe(8);
    expect(bottomed.cards.find(c => c.id === 'field-card-1')?.zone).toBe('mainDeck-host');
    expect(bottomed.cards.find(c => c.id === 'field-card-2')?.zone).toBe('mainDeck-host');
  });

  it('applies cemetery batches as one authoritative card move', () => {
    const state = createState({
      revision: 10,
      gameStatus: 'playing',
      cards: [
        {
          id: 'deck-card-1',
          cardId: 'BP01-030',
          name: 'Deck Card 1',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'deck-card-2',
          cardId: 'BP01-031',
          name: 'Deck Card 2',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const cemeteried = applyGameSyncEvent(state, {
      id: 'evt-15-batch',
      type: 'SEND_TO_CEMETERY_BATCH',
      actor: 'host',
      cardIds: ['deck-card-1', 'deck-card-2'],
    });

    expect(cemeteried.revision).toBe(11);
    expect(cemeteried.lastUndoableCardMoveActor).toBe('host');
    expect(cemeteried.lastUndoableCardMoveState?.revision).toBe(10);
    expect(cemeteried.cards.find(c => c.id === 'deck-card-1')?.zone).toBe('cemetery-host');
    expect(cemeteried.cards.find(c => c.id === 'deck-card-2')?.zone).toBe('cemetery-host');
  });

  it('applies banish batches as one authoritative card move', () => {
    const state = createState({
      revision: 11,
      cards: [
        {
          id: 'cemetery-card-1',
          cardId: 'BP01-032',
          name: 'Cemetery Card 1',
          image: '',
          zone: 'cemetery-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'cemetery-card-2',
          cardId: 'BP01-033',
          name: 'Cemetery Card 2',
          image: '',
          zone: 'cemetery-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const banished = applyGameSyncEvent(state, {
      id: 'evt-16-batch',
      type: 'BANISH_CARDS_BATCH',
      actor: 'host',
      cardIds: ['cemetery-card-1', 'cemetery-card-2'],
    });

    expect(banished.revision).toBe(12);
    expect(banished.lastUndoableCardMoveActor).toBe('host');
    expect(banished.lastUndoableCardMoveState?.revision).toBe(11);
    expect(banished.cards.find(c => c.id === 'cemetery-card-1')?.zone).toBe('banish-host');
    expect(banished.cards.find(c => c.id === 'cemetery-card-2')?.zone).toBe('banish-host');
  });

  it('attaches an extracted evolve card to the specified field card when attachToCardId is provided', () => {
    const state = createState({
      revision: 2,
      gameStatus: 'playing',
      cards: [
        {
          id: 'base-card',
          cardId: 'BP01-018',
          name: 'Base Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'evolve-card',
          cardId: 'BP01-019',
          name: 'Evolve Card',
          image: '',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
      ],
    });

    const extracted = applyGameSyncEvent(state, {
      id: 'evt-15-attach',
      type: 'EXTRACT_CARD',
      actor: 'host',
      cardId: 'evolve-card',
      destination: 'field-host',
      attachToCardId: 'base-card',
    });

    expect(extracted.cards.find(c => c.id === 'evolve-card')).toMatchObject({
      zone: 'field-host',
      attachedTo: 'base-card',
      isTapped: true,
    });
    expect(extracted.lastUndoableCardMoveState).not.toBeNull();
  });

  it('sets searched main-deck cards face-down onto the field during preparation', () => {
    const state = createState({
      revision: 2,
      gameStatus: 'preparing',
      cards: [
        {
          id: 'main-deck-card',
          cardId: 'BP01-777',
          name: 'Starter',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const extracted = applyGameSyncEvent(state, {
      id: 'evt-15-prep',
      type: 'EXTRACT_CARD',
      actor: 'host',
      cardId: 'main-deck-card',
      destination: 'field-host',
    });

    const moved = extracted.cards.find(c => c.id === 'main-deck-card');
    expect(moved?.zone).toBe('field-host');
    expect(moved?.isFlipped).toBe(true);
  });

  it('blocks moving evolve-deck cards during preparation across drag and extract paths', () => {
    const state = createState({
      revision: 7,
      gameStatus: 'preparing',
      cards: [
        {
          id: 'evo-deck-card',
          cardId: 'EV01-003',
          name: 'Evolve Deck Card',
          image: '',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'field-card',
          cardId: 'BP01-099',
          name: 'Field Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const dragged = applyGameSyncEvent(state, {
      id: 'evt-15a',
      type: 'MOVE_CARD',
      actor: 'host',
      cardId: 'evo-deck-card',
      overId: 'field-card',
    });
    expect(dragged).toBe(state);

    const extracted = applyGameSyncEvent(state, {
      id: 'evt-15b',
      type: 'EXTRACT_CARD',
      actor: 'host',
      cardId: 'evo-deck-card',
      destination: 'field-host',
    });
    expect(extracted).toBe(state);
  });

  it('blocks dragging main-deck cards to other zones during preparation', () => {
    const state = createState({
      revision: 8,
      gameStatus: 'preparing',
      cards: [
        {
          id: 'main-deck-card',
          cardId: 'BP01-901',
          name: 'Main Deck Card',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'field-card',
          cardId: 'BP01-902',
          name: 'Field Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const dragged = applyGameSyncEvent(state, {
      id: 'evt-15c',
      type: 'MOVE_CARD',
      actor: 'host',
      cardId: 'main-deck-card',
      overId: 'field-card',
    });

    expect(dragged).toBe(state);
  });

  it('blocks sending main-deck cards to cemetery during preparation', () => {
    const state = createState({
      revision: 8,
      gameStatus: 'preparing',
      cards: [
        {
          id: 'main-deck-card-1',
          cardId: 'BP01-903',
          name: 'Main Deck Card 1',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'main-deck-card-2',
          cardId: 'BP01-904',
          name: 'Main Deck Card 2',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const single = applyGameSyncEvent(state, {
      id: 'evt-15d',
      type: 'SEND_TO_CEMETERY',
      actor: 'host',
      cardId: 'main-deck-card-1',
    });
    expect(single).toBe(state);

    const batch = applyGameSyncEvent(state, {
      id: 'evt-15e',
      type: 'SEND_TO_CEMETERY_BATCH',
      actor: 'host',
      cardIds: ['main-deck-card-1', 'main-deck-card-2'],
    });
    expect(batch).toBe(state);
  });

  it('links a special card to a field card without using the normal stack model', () => {
    const state = createState({
      revision: 8,
      gameStatus: 'playing',
      cards: [
        {
          id: 'special-card',
          cardId: 'BPV-001',
          name: 'ドライブポイント',
          image: '',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'field-card',
          cardId: 'BP01-099',
          name: 'Field Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-link-card-to-field',
      type: 'LINK_CARD_TO_FIELD',
      actor: 'host',
      cardId: 'special-card',
      parentCardId: 'field-card',
    });

    expect(result.cards.find(card => card.id === 'special-card')).toMatchObject({
      zone: 'field-host',
      linkedTo: 'field-card',
      attachedTo: undefined,
      isTapped: true,
    });
    expect(result.lastUndoableCardMoveActor).toBe('host');
  });

  it('applies stat, initial hand, mulligan, top deck resolve, and import events', () => {
    const baseState = createState({
      revision: 0,
      host: { ...initialState.host, maxPp: 4, pp: 2 },
      cards: [
        {
          id: 'd1',
          cardId: 'BP01-018',
          name: 'Deck 1',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'd2',
          cardId: 'BP01-019',
          name: 'Deck 2',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'd3',
          cardId: 'BP01-020',
          name: 'Deck 3',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'd4',
          cardId: 'BP01-021',
          name: 'Deck 4',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'd5',
          cardId: 'BP01-022',
          name: 'Deck 5',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const statChanged = applyGameSyncEvent(baseState, {
      id: 'evt-16',
      type: 'MODIFY_PLAYER_STAT',
      actor: 'host',
      playerKey: 'host',
      stat: 'pp',
      delta: 5,
    });
    expect(statChanged.host.pp).toBe(4);

    const initialHand = applyGameSyncEvent(baseState, {
      id: 'evt-17',
      type: 'DRAW_INITIAL_HAND',
      actor: 'host',
    });
    expect(initialHand.host.initialHandDrawn).toBe(true);
    expect(initialHand.cards.filter(c => c.zone === 'hand-host')).toHaveLength(4);

    const mulliganState = createState({
      revision: 2,
      cards: [
        { id: 'deck1', cardId: 'BP01-023', name: 'Deck1', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'deck2', cardId: 'BP01-024', name: 'Deck2', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'deck3', cardId: 'BP01-025', name: 'Deck3', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'deck4', cardId: 'BP01-026', name: 'Deck4', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'deck5', cardId: 'BP01-027', name: 'Deck5', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'hand1', cardId: 'BP01-028', name: 'Hand1', image: '', zone: 'hand-host', owner: 'host', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
        { id: 'hand2', cardId: 'BP01-029', name: 'Hand2', image: '', zone: 'hand-host', owner: 'host', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
        { id: 'hand3', cardId: 'BP01-030', name: 'Hand3', image: '', zone: 'hand-host', owner: 'host', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
        { id: 'hand4', cardId: 'BP01-031', name: 'Hand4', image: '', zone: 'hand-host', owner: 'host', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
      ],
    });
    const mulliganed = applyGameSyncEvent(mulliganState, {
      id: 'evt-18',
      type: 'EXECUTE_MULLIGAN',
      actor: 'host',
      selectedIds: ['hand1', 'hand2', 'hand3', 'hand4'],
    });
    expect(mulliganed.host.mulliganUsed).toBe(true);

    const resolvedTopDeck = applyGameSyncEvent(baseState, {
      id: 'evt-19',
      type: 'RESOLVE_TOP_DECK',
      actor: 'host',
      results: [{ cardId: 'd1', action: 'hand' }],
    });
    expect(resolvedTopDeck.cards.find(c => c.id === 'd1')?.zone).toBe('hand-host');

    const imported = applyGameSyncEvent(baseState, {
      id: 'evt-20',
      type: 'IMPORT_DECK',
      actor: 'host',
      cards: [
        {
          id: 'new1',
          cardId: 'BP01-032',
          name: 'Imported',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });
    expect(imported.cards.map(c => c.id)).toContain('new1');
    expect(imported.cards.map(c => c.id)).not.toContain('d1');
    expect(imported.host.initialHandDrawn).toBe(false);
    expect(imported.host.mulliganUsed).toBe(false);
    expect(imported.host.isReady).toBe(false);

    const shuffleMock = vi.spyOn(CardLogic, 'shuffleDeck').mockImplementationOnce(cards => [...cards].reverse());
    const shuffled = applyGameSyncEvent(baseState, {
      id: 'evt-20b',
      type: 'SHUFFLE_DECK',
      actor: 'host',
    });
    shuffleMock.mockRestore();
    expect(shuffled.revision).toBe(baseState.revision + 1);
    expect(shuffled.cards.filter(c => c.zone === 'mainDeck-host')).toHaveLength(5);
  });

  it('keeps existing history when shuffling a single-card deck', () => {
    const checkpoint = createState({
      revision: 12,
      cards: [
        {
          id: 'checkpoint-card',
          cardId: 'BP01-777',
          name: 'Checkpoint Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const state = createState({
      revision: 13,
      gameStatus: 'playing',
      cards: [
        {
          id: 'deck-host-a',
          cardId: 'BP01-778',
          name: 'Deck Host A',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
      lastUndoableCardMoveState: checkpoint,
      lastUndoableCardMoveActor: 'host',
    });

    const shuffled = applyGameSyncEvent(state, {
      id: 'evt-shuffle-clears-undo',
      type: 'SHUFFLE_DECK',
      actor: 'host',
    });

    expect(shuffled).toBe(state);
    expect(shuffled.lastUndoableCardMoveState).toBe(checkpoint);
  });

  it('ignores duplicate initial hand draw events for the same player', () => {
    const baseState = createState({
      revision: 0,
      cards: [
        { id: 'd1', cardId: 'BP01-018', name: 'Deck 1', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd2', cardId: 'BP01-019', name: 'Deck 2', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd3', cardId: 'BP01-020', name: 'Deck 3', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd4', cardId: 'BP01-021', name: 'Deck 4', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd5', cardId: 'BP01-022', name: 'Deck 5', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd6', cardId: 'BP01-023', name: 'Deck 6', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd7', cardId: 'BP01-024', name: 'Deck 7', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd8', cardId: 'BP01-025', name: 'Deck 8', image: '', zone: 'mainDeck-host', owner: 'host', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
      ],
    });

    const firstDraw = applyGameSyncEvent(baseState, {
      id: 'evt-initial-hand-first',
      type: 'DRAW_INITIAL_HAND',
      actor: 'host',
    });
    const duplicateDraw = applyGameSyncEvent(firstDraw, {
      id: 'evt-initial-hand-duplicate',
      type: 'DRAW_INITIAL_HAND',
      actor: 'host',
    });

    expect(duplicateDraw).toBe(firstDraw);
    expect(duplicateDraw.cards.filter(card => card.zone === 'hand-host')).toHaveLength(4);
    expect(duplicateDraw.cards.filter(card => card.zone === 'mainDeck-host')).toHaveLength(4);
  });

  it('ignores duplicate initial hand draw events for the guest player as well', () => {
    const baseState = createState({
      revision: 0,
      cards: [
        { id: 'd1', cardId: 'BP01-018', name: 'Deck 1', image: '', zone: 'mainDeck-guest', owner: 'guest', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd2', cardId: 'BP01-019', name: 'Deck 2', image: '', zone: 'mainDeck-guest', owner: 'guest', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd3', cardId: 'BP01-020', name: 'Deck 3', image: '', zone: 'mainDeck-guest', owner: 'guest', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd4', cardId: 'BP01-021', name: 'Deck 4', image: '', zone: 'mainDeck-guest', owner: 'guest', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd5', cardId: 'BP01-022', name: 'Deck 5', image: '', zone: 'mainDeck-guest', owner: 'guest', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd6', cardId: 'BP01-023', name: 'Deck 6', image: '', zone: 'mainDeck-guest', owner: 'guest', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd7', cardId: 'BP01-024', name: 'Deck 7', image: '', zone: 'mainDeck-guest', owner: 'guest', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
        { id: 'd8', cardId: 'BP01-025', name: 'Deck 8', image: '', zone: 'mainDeck-guest', owner: 'guest', isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 } },
      ],
    });

    const firstDraw = applyGameSyncEvent(baseState, {
      id: 'evt-initial-hand-first-guest',
      type: 'DRAW_INITIAL_HAND',
      actor: 'guest',
    });
    const duplicateDraw = applyGameSyncEvent(firstDraw, {
      id: 'evt-initial-hand-duplicate-guest',
      type: 'DRAW_INITIAL_HAND',
      actor: 'guest',
    });

    expect(duplicateDraw).toBe(firstDraw);
    expect(duplicateDraw.cards.filter(card => card.zone === 'hand-guest')).toHaveLength(4);
    expect(duplicateDraw.cards.filter(card => card.zone === 'mainDeck-guest')).toHaveLength(4);
  });

  it('blocks deck import after the target player has started preparing', () => {
    const state = createState({
      revision: 6,
      host: { ...initialState.host, initialHandDrawn: true },
      cards: [
        {
          id: 'original-host-card',
          cardId: 'BP01-001',
          name: 'Original',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-import-blocked',
      type: 'IMPORT_DECK',
      actor: 'host',
      cards: [
        {
          id: 'new-host-card',
          cardId: 'BP01-999',
          name: 'Blocked Import',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    expect(result).toBe(state);
  });

  it('replaces the actor deck cleanly across repeated imports', () => {
    const state = createState({
      revision: 12,
      cards: [
        {
          id: 'old-main-host',
          cardId: 'BP01-001',
          name: 'Old Main',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'old-hand-host',
          cardId: 'BP01-002',
          name: 'Old Hand',
          image: '',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'old-field-host',
          cardId: 'BP01-003',
          name: 'Old Field',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 1, hp: 2 },
        },
        {
          id: 'guest-main',
          cardId: 'BP01-101',
          name: 'Guest Main',
          image: '',
          zone: 'mainDeck-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const firstImport = applyGameSyncEvent(state, {
      id: 'evt-import-repeat-1',
      type: 'IMPORT_DECK',
      actor: 'host',
      cards: [
        {
          id: 'first-main-host',
          cardId: 'BP02-001',
          name: 'First Main',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'first-leader-host',
          cardId: 'BP02-LD1',
          name: 'First Leader',
          image: '',
          zone: 'leader-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          isLeaderCard: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    expect(firstImport.cards.map(card => card.id)).toEqual(
      expect.arrayContaining(['first-main-host', 'first-leader-host', 'guest-main'])
    );
    expect(firstImport.cards.map(card => card.id)).not.toEqual(
      expect.arrayContaining(['old-main-host', 'old-hand-host', 'old-field-host'])
    );

    const secondImport = applyGameSyncEvent(firstImport, {
      id: 'evt-import-repeat-2',
      type: 'IMPORT_DECK',
      actor: 'host',
      cards: [
        {
          id: 'second-main-host',
          cardId: 'BP03-001',
          name: 'Second Main',
          image: '',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    expect(secondImport.cards.map(card => card.id)).toEqual(
      expect.arrayContaining(['second-main-host', 'guest-main'])
    );
    expect(secondImport.cards.map(card => card.id)).not.toEqual(
      expect.arrayContaining(['first-main-host', 'first-leader-host'])
    );
    expect(secondImport.host.initialHandDrawn).toBe(false);
    expect(secondImport.host.mulliganUsed).toBe(false);
    expect(secondImport.host.isReady).toBe(false);
  });

  it('forces all field cards face-up when the game starts', () => {
    const state = createState({
      revision: 12,
      turnPlayer: 'host',
      cards: [
        {
          id: 'starter-amulet',
          cardId: 'BP01-888',
          name: 'Starter Amulet',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'opponent-field',
          cardId: 'BP01-889',
          name: 'Opponent Field',
          image: '',
          zone: 'field-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const started = applyGameSyncEvent(state, {
      id: 'evt-start-field',
      type: 'START_GAME',
      actor: 'host',
    });

    expect(started.gameStatus).toBe('playing');
    expect(started.cards.every(card => !card.zone.startsWith('field-') || card.isFlipped === false)).toBe(true);
  });

  it('only normalizes field cards when the game starts and preserves other hidden zones', () => {
    const state = createState({
      revision: 13,
      turnPlayer: 'guest',
      guest: { ...initialState.guest, pp: 0, maxPp: 0 },
      cards: [
        {
          id: 'field-hidden',
          cardId: 'BP01-890',
          name: 'Field Hidden',
          image: '',
          zone: 'field-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'ex-hidden',
          cardId: 'BP01-891',
          name: 'EX Hidden',
          image: '',
          zone: 'ex-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'deck-hidden',
          cardId: 'BP01-892',
          name: 'Deck Hidden',
          image: '',
          zone: 'mainDeck-guest',
          owner: 'guest',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const started = applyGameSyncEvent(state, {
      id: 'evt-start-normalize-scope',
      type: 'START_GAME',
      actor: 'host',
    });

    expect(started.cards.find(c => c.id === 'field-hidden')?.isFlipped).toBe(false);
    expect(started.cards.find(c => c.id === 'ex-hidden')?.isFlipped).toBe(true);
    expect(started.cards.find(c => c.id === 'deck-hidden')?.isFlipped).toBe(true);
    expect(started.guest.pp).toBe(1);
    expect(started.guest.maxPp).toBe(1);
  });

  it('applies turn-order, undo, and spawn-token events', () => {
    const baseState = createState({
      revision: 5,
      host: { ...initialState.host, ep: 1 },
      guest: { ...initialState.guest, ep: 1 },
      cards: [
        {
          id: 'existing',
          cardId: 'BP01-033',
          name: 'Existing',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const ordered = applyGameSyncEvent(baseState, {
      id: 'evt-21',
      type: 'SET_INITIAL_TURN_ORDER',
      actor: 'host',
      starter: 'guest',
      manual: false,
    });
    expect(ordered.turnPlayer).toBe('guest');
    expect(ordered.guest.ep).toBe(0);
    expect(ordered.host.ep).toBe(3);

    const spawned = applyGameSyncEvent(ordered, {
      id: 'evt-22',
      type: 'SPAWN_TOKEN',
      actor: 'host',
      token: {
        id: 'token-1',
        cardId: 'token',
        name: 'Token',
        image: '',
        zone: 'ex-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 1, hp: 1 },
      },
    });
    expect(spawned.cards.find(c => c.id === 'token-1')).toBeDefined();

    const spawnedWithBackup = { ...spawned, lastGameState: ordered };

    const undone = applyGameSyncEvent(spawnedWithBackup, {
      id: 'evt-23',
      type: 'UNDO_LAST_TURN',
      actor: 'host',
    });
    expect(undone.cards.find(c => c.id === 'token-1')).toBeUndefined();
    expect(undone.turnPlayer).toBe('guest');
    expect(undone.revision).toBe(spawned.revision + 1);
  });

  it('keeps SET_INITIAL_TURN_ORDER as a no-op for non-host requesters', () => {
    const baseState = createState({
      revision: 5,
      turnPlayer: 'host',
      turnCount: 3,
      phase: 'Main',
      host: { ...initialState.host, ep: 1 },
      guest: { ...initialState.guest, ep: 2 },
      endStop: { host: true, guest: true },
    });

    const nextState = applyGameSyncEvent(
      baseState,
      {
        id: 'evt-23b',
        type: 'SET_INITIAL_TURN_ORDER',
        actor: 'host',
        starter: 'guest',
        manual: false,
      },
      'guest',
    );

    expect(nextState).toBe(baseState);
  });

  it('treats batch token generation as one undoable card move', () => {
    const baseState = createState({
      cards: [],
    });

    const spawned = applyGameSyncEvent(baseState, {
      id: 'evt-batch-token',
      type: 'SPAWN_TOKENS_BATCH',
      actor: 'host',
      tokens: [
        {
          id: 'token-1',
          cardId: 'token-alpha',
          name: 'Alpha Token',
          image: '',
          zone: 'ex-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'token-2',
          cardId: 'token-alpha',
          name: 'Alpha Token',
          image: '',
          zone: 'ex-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'token-3',
          cardId: 'token-beta',
          name: 'Beta Token',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    expect(spawned.cards).toHaveLength(3);

    const undone = applyGameSyncEvent(spawned, {
      id: 'evt-batch-token-undo',
      type: 'UNDO_CARD_MOVE',
      actor: 'host',
    });

    expect(undone.cards).toHaveLength(0);
  });

  it('allows guest to trigger UNDO_LAST_TURN in P2P mode', () => {
    const beforeTurnEnd = createState({
      turnPlayer: 'guest',
      revision: 10,
    });
    const afterTurnEnd = createState({
      turnPlayer: 'host',
      revision: 11,
    });

    const afterTurnEndWithBackup = { ...afterTurnEnd, lastGameState: beforeTurnEnd };

    const undone = applyGameSyncEvent(afterTurnEndWithBackup, {
      id: 'evt-guest-undo',
      type: 'UNDO_LAST_TURN',
      actor: 'guest',
    }, 'guest');

    expect(undone.turnPlayer).toBe('guest');
    expect(undone.revision).toBe(12);
    expect(undone).not.toBe(afterTurnEnd);
  });

  it('clears end-stop and card-move checkpoints when undoing the last turn', () => {
    const beforeTurnEnd = createState({
      turnPlayer: 'guest',
      revision: 10,
      endStop: {
        host: true,
        guest: true,
      },
    });
    const checkpoint = createState({
      revision: 9,
      cards: [
        {
          id: 'checkpoint-card',
          cardId: 'BP01-779',
          name: 'Checkpoint Card',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });
    const afterTurnEnd = createState({
      turnPlayer: 'host',
      revision: 11,
      lastGameState: beforeTurnEnd,
      lastUndoableCardMoveState: checkpoint,
      lastUndoableCardMoveActor: 'host',
      endStop: {
        host: true,
        guest: true,
      },
    });

    const undone = applyGameSyncEvent(afterTurnEnd, {
      id: 'evt-undo-last-turn-clears-checkpoints',
      type: 'UNDO_LAST_TURN',
      actor: 'guest',
    }, 'guest');

    expect(undone.endStop).toEqual({ host: false, guest: false });
    expect(undone.lastGameState).toBeNull();
    expect(undone.lastUndoableCardMoveState).toBeNull();
    expect(undone.lastUndoableCardMoveActor).toBeNull();
  });

  it('stores an authoritative card-move checkpoint and uses it for UNDO_CARD_MOVE', () => {
    const beforeMove = createState({
      revision: 20,
      gameStatus: 'playing',
      cards: [
        {
          id: 'card-host-undo',
          cardId: 'BP01-111',
          name: 'Undo Target',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const afterMove = applyGameSyncEvent(beforeMove, {
      id: 'evt-card-move',
      type: 'MOVE_CARD',
      actor: 'host',
      cardId: 'card-host-undo',
      overId: 'ex-host',
    });

    expect(afterMove.cards.find(c => c.id === 'card-host-undo')?.zone).toBe('ex-host');
    expect(afterMove.lastUndoableCardMoveActor).toBe('host');
    expect(afterMove.lastUndoableCardMoveState?.cards.find(c => c.id === 'card-host-undo')?.zone).toBe('field-host');
    expect(afterMove.lastUndoableCardMoveState).not.toHaveProperty('lastGameState');
    expect(afterMove.lastUndoableCardMoveState).not.toHaveProperty('lastUndoableCardMoveState');

    const undone = applyGameSyncEvent(afterMove, {
      id: 'evt-card-move-undo',
      type: 'UNDO_CARD_MOVE',
      actor: 'host',
    }, 'host');

    expect(undone.cards.find(c => c.id === 'card-host-undo')?.zone).toBe('field-host');
    expect(undone.lastUndoableCardMoveState).toBeNull();
    expect(undone.lastUndoableCardMoveActor).toBeNull();
    expect(undone.revision).toBe(afterMove.revision + 1);
  });

  it('rejects UNDO_CARD_MOVE when the requester does not own the authoritative checkpoint', () => {
    const checkpoint = createState({
      revision: 30,
      gameStatus: 'playing',
      cards: [
        {
          id: 'card-host-undo',
          cardId: 'BP01-112',
          name: 'Undo Target',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const state = createState({
      revision: 31,
      gameStatus: 'playing',
      cards: [
        {
          id: 'card-host-undo',
          cardId: 'BP01-112',
          name: 'Undo Target',
          image: '',
          zone: 'ex-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      lastUndoableCardMoveState: checkpoint,
      lastUndoableCardMoveActor: 'host',
    });

    const denied = applyGameSyncEvent(state, {
      id: 'evt-card-move-undo-denied',
      type: 'UNDO_CARD_MOVE',
      actor: 'guest',
    }, 'guest');

    expect(denied).toBe(state);
  });
});


describe('multi-step card move undo', () => {
  const board = (): SyncState => createState({
    gameStatus: 'playing',
    cards: Array.from({ length: 25 }, (_, index) => ({
      id: `undo-${index}`, cardId: 'BP01-001', name: 'Card', image: '',
      zone: 'mainDeck-host', owner: 'host' as const, isTapped: false,
      isFlipped: true, counters: { atk: 0, hp: 0 },
    })),
  });
  const draw = (state: SyncState) => applyGameSyncEvent(state, {
    id: `draw-${state.revision}`, type: 'DRAW_CARD', actor: 'host',
  });
  const undo = (state: SyncState, actor: 'host' | 'guest' = 'host') => applyGameSyncEvent(state, {
    id: `undo-${state.revision}`, type: 'UNDO_CARD_MOVE', actor,
  });

  it('undoes three moves in reverse order, then becomes a no-op', () => {
    const start = board();
    const first = draw(start);
    const second = draw(first);
    const third = draw(second);
    const backTwo = undo(third);
    expect(backTwo.cards).toEqual(second.cards);
    const backOne = undo(backTwo);
    expect(backOne.cards).toEqual(first.cards);
    const backStart = undo(backOne);
    expect(backStart.cards).toEqual(start.cards);
    expect(backStart.revision).toBe(6);
    expect(undo(backStart)).toBe(backStart);
  });

  it('retains only the most recent twenty operations without nested histories', () => {
    let state = board();
    for (let i = 0; i < 23; i++) state = draw(state);
    expect(state.cardMoveHistory).toHaveLength(20);
    for (const entry of state.cardMoveHistory ?? []) {
      expect(entry.state).not.toHaveProperty('cardMoveHistory');
      expect(entry.state).not.toHaveProperty('lastGameState');
      expect(entry.state).not.toHaveProperty('lastUndoableCardMoveState');
    }
    for (let i = 0; i < 20; i++) state = undo(state);
    expect(state.cards.filter(card => card.zone === 'hand-host')).toHaveLength(3);
    expect(undo(state)).toBe(state);
  });

  it('keeps remaining history when making a new move after undo', () => {
    const start = board();
    let state = undo(draw(draw(start)));
    state = draw(state);
    expect(undo(undo(state)).cards).toEqual(start.cards);
  });

  it('does not resurrect host history after the guest moves and undoes', () => {
    const hostMoved = draw(draw(board()));
    const guestMoved = applyGameSyncEvent(hostMoved, {
      id: 'guest-move', type: 'MOVE_CARD', actor: 'guest', cardId: 'undo-0', overId: 'ex-host',
    });
    expect(undo(guestMoved, 'host')).toBe(guestMoved);
    const guestUndone = undo(guestMoved, 'guest');
    expect(guestUndone.cards).toEqual(hostMoved.cards);
    expect(undo(guestUndone, 'host')).toBe(guestUndone);
  });

  it('retains both actors in solo mode and restores the next undo actor', () => {
    const start = board();
    const first = draw(start);
    const second = applyGameSyncEvent(first, {
      id: 'solo-guest-move', type: 'MOVE_CARD', actor: 'guest', cardId: 'undo-0', overId: 'ex-host',
    }, 'guest', { isSoloMode: true });
    const restored = undo(second, 'guest');
    expect(restored.lastUndoableCardMoveActor).toBe('host');
    expect(undo(restored).cards).toEqual(start.cards);
  });

  it('keeps turn undo independent across multiple card undos', () => {
    const start = board();
    const ended = applyGameSyncEvent(start, { id: 'end', type: 'END_TURN', actor: 'host' });
    const restored = undo(undo(draw(draw(ended))));
    expect(restored.lastGameState).toEqual(ended.lastGameState);
    const turnUndone = applyGameSyncEvent(restored, { id: 'turn-undo', type: 'UNDO_LAST_TURN', actor: 'host' });
    expect(turnUndone.cards).toEqual(start.cards);
    expect(turnUndone.turnPlayer).toBe('host');
    expect(turnUndone.cardMoveHistory).toEqual([]);
    expect(turnUndone.lastGameState).toBeNull();
    expect(undo(turnUndone)).toBe(turnUndone);
  });

  it('starts a new undo segment for an opponent stat change without clearing turn undo', () => {
    const ended = applyGameSyncEvent(board(), { id: 'end', type: 'END_TURN', actor: 'host' });
    const moved = draw(draw(ended));
    const changed = applyGameSyncEvent(moved, {
      id: 'hp', type: 'MODIFY_PLAYER_STAT', actor: 'guest', playerKey: 'guest', stat: 'hp', delta: -1,
    });
    expect(undo(changed)).toBe(changed);
    expect(changed.guest.hp).toBe(19);
    const guestUndone = undo(changed, 'guest');
    expect(guestUndone.guest.hp).toBe(20);
    expect(undo(guestUndone, 'host')).toBe(guestUndone);
    expect(changed.lastGameState).toBe(ended.lastGameState);
  });

  it.each<GameSyncEvent>([
    { id: 'phase', type: 'SET_PHASE', actor: 'host', phase: 'Main' },
    { id: 'reset', type: 'RESET_GAME', actor: 'host' },
    { id: 'end', type: 'END_TURN', actor: 'host' },
  ])('clears every checkpoint for a $type boundary', event => {
    const moved = applyGameSyncEvent(draw(draw(board())), {
      id: 'field', type: 'MOVE_CARD', actor: 'host', cardId: 'undo-0', overId: 'field-host',
    });
    const changed = applyGameSyncEvent(moved, event);
    expect(changed).not.toBe(moved);
    expect(changed.cardMoveHistory).toEqual([]);
    expect(undo(changed)).toBe(changed);
    if (event.type === 'END_TURN') {
      expect(changed.lastGameState).not.toHaveProperty('cardMoveHistory');
      const back = applyGameSyncEvent(changed, { id: 'end-undo', type: 'UNDO_LAST_TURN', actor: 'host' });
      expect(back.cards).toEqual(moved.cards);
      expect(undo(back)).toBe(back);
    }
  });

  it('keeps checkpoints detached from subsequent nested counter changes', () => {
    const moved = draw(board());
    const originalSnapshot = JSON.stringify(moved.cardMoveHistory);
    const next = draw(moved);
    next.cards[0].counters.atk = 99;
    expect(JSON.stringify(moved.cardMoveHistory)).toBe(originalSnapshot);
  });

  it.each<GameSyncEvent>([
    { id: 'same-phase', type: 'SET_PHASE', actor: 'host', phase: 'Start' },
    { id: 'same-stat', type: 'MODIFY_PLAYER_STAT', actor: 'host', playerKey: 'host', stat: 'pp', delta: -1 },
    { id: 'same-reveal', type: 'SET_REVEAL_HANDS_MODE', actor: 'host', enabled: false },
  ])('retains history when $type leaves the value unchanged', event => {
    const moved = draw(draw(board()));
    expect(applyGameSyncEvent(moved, event)).toBe(moved);
  });

  it('can still undo multiple moves after decreasing a zero generic counter', () => {
    const start = board();
    const drawn = draw(start);
    const moved = applyGameSyncEvent(drawn, {
      id: 'place', type: 'MOVE_CARD', actor: 'host', cardId: 'undo-0', overId: 'field-host',
    });
    const unchanged = applyGameSyncEvent(moved, {
      id: 'decrease-zero', type: 'MODIFY_GENERIC_COUNTER', actor: 'host', cardId: 'undo-0', delta: -1,
    });
    expect(unchanged).toBe(moved);
    expect(undo(undo(unchanged)).cards).toEqual(start.cards);
  });

  it.each<GameSyncEvent>([
    { id: 'hp', type: 'MODIFY_PLAYER_STAT', actor: 'host', playerKey: 'host', stat: 'hp', delta: -2 },
    { id: 'counter', type: 'MODIFY_COUNTER', actor: 'host', cardId: 'undo-0', stat: 'atk', delta: 1 },
    { id: 'generic', type: 'MODIFY_GENERIC_COUNTER', actor: 'host', cardId: 'undo-0', delta: 1 },
    { id: 'tap', type: 'TOGGLE_TAP', actor: 'host', cardId: 'undo-0' },
    { id: 'flip', type: 'TOGGLE_FLIP', actor: 'host', cardId: 'undo-evolve' },
    { id: 'face', type: 'SET_CARD_FACE', actor: 'host', cardId: 'undo-evolve', faceSide: 'back' },
    { id: 'attack', type: 'ATTACK_DECLARATION', actor: 'host', attackerCardId: 'undo-0', target: { type: 'leader', player: 'guest' } },
  ])('undoes $type first, then the preceding card move', event => {
    const start = board();
    start.cards.push({ ...start.cards[0], id: 'undo-evolve', zone: 'evolveDeck-host', isEvolveCard: true });
    const placed = applyGameSyncEvent(start, {
      id: 'place', type: 'MOVE_CARD', actor: 'host', cardId: 'undo-0', overId: 'field-host',
    });
    const changed = applyGameSyncEvent(placed, event);
    expect(changed).not.toBe(placed);
    expect(changed.cardMoveHistory).toHaveLength(2);
    const restored = undo(changed);
    expect(restored.cards).toEqual(placed.cards);
    expect(restored.host).toEqual(placed.host);
    expect(undo(restored).cards).toEqual(start.cards);
  });

  it.each<GameSyncEvent>([
    { id: 'hp', type: 'MODIFY_PLAYER_STAT', actor: 'host', playerKey: 'host', stat: 'hp', delta: -1 },
    { id: 'counter', type: 'MODIFY_COUNTER', actor: 'host', cardId: 'undo-0', stat: 'atk', delta: 1 },
    { id: 'tap', type: 'TOGGLE_TAP', actor: 'host', cardId: 'undo-0' },
  ])('rejects $type with a forged undo actor', event => {
    const state = applyGameSyncEvent(board(), {
      id: 'place', type: 'MOVE_CARD', actor: 'host', cardId: 'undo-0', overId: 'field-host',
    });
    expect(applyGameSyncEvent(state, event, 'guest')).toBe(state);
  });

  it('does not consume history when selecting the already displayed default front face', () => {
    const start = board();
    start.cards.push({ ...start.cards[0], id: 'undo-evolve', zone: 'evolveDeck-host', isEvolveCard: true });
    const moved = draw(start);
    const unchanged = applyGameSyncEvent(moved, {
      id: 'same-front', type: 'SET_CARD_FACE', actor: 'host', cardId: 'undo-evolve', faceSide: 'front',
    });
    expect(unchanged).toBe(moved);
    expect(undo(unchanged).cards).toEqual(start.cards);
  });

  it('restores PP together with max PP as one numeric operation', () => {
    const start = { ...board(), host: { ...initialState.host, pp: 5, maxPp: 5 } };
    const changed = applyGameSyncEvent(start, {
      id: 'pp', type: 'MODIFY_PLAYER_STAT', actor: 'host', playerKey: 'host', stat: 'maxPp', delta: -1,
    });
    expect(changed.host).toMatchObject({ pp: 4, maxPp: 4 });
    expect(undo(changed).host).toEqual(start.host);
  });

  it('undoes draw, shuffle, and a stat change in order without rerunning randomness', () => {
    const start = board();
    const changed = applyGameSyncEvent(start, {
      id: 'hp', type: 'MODIFY_PLAYER_STAT', actor: 'host', playerKey: 'host', stat: 'hp', delta: -1,
    });
    const shuffleMock = vi.spyOn(CardLogic, 'shuffleDeck').mockImplementation(cards => [...cards].reverse());
    try {
      const shuffled = applyGameSyncEvent(changed, { id: 'shuffle', type: 'SHUFFLE_DECK', actor: 'host' });
      expect(shuffled.cards[0].id).toBe('undo-24');
      const drawn = draw(shuffled);
      expect(drawn.cards.find(card => card.zone === 'hand-host')?.id).toBe('undo-24');
      const backShuffle = undo(drawn);
      expect(backShuffle.cards).toEqual(shuffled.cards);
      const backStat = undo(backShuffle);
      expect(backStat.cards).toEqual(start.cards);
      expect(backStat.host.hp).toBe(19);
      expect(undo(backStat).host.hp).toBe(20);
      expect(shuffleMock).toHaveBeenCalledTimes(1);
    } finally {
      shuffleMock.mockRestore();
    }
  });

  it('does not consume an undo step when shuffle leaves the deck order unchanged', () => {
    const moved = draw(board());
    const shuffleMock = vi.spyOn(CardLogic, 'shuffleDeck').mockImplementation(cards => [...cards]);
    try {
      expect(applyGameSyncEvent(moved, { id: 'same-shuffle', type: 'SHUFFLE_DECK', actor: 'host' })).toBe(moved);
    } finally {
      shuffleMock.mockRestore();
    }
  });

  it('preserves history for rejected and stateless events', () => {
    const moved = draw(draw(board()));
    const rejected = applyGameSyncEvent(moved, { id: 'bad-end', type: 'END_TURN', actor: 'guest' });
    expect(rejected).toBe(moved);
    expect(applyGameSyncEvent(moved, { id: 'coin', type: 'FLIP_SHARED_COIN', actor: 'guest' })).toBe(moved);
    expect(undo(undo(rejected)).cards).toEqual(board().cards);
  });
});
