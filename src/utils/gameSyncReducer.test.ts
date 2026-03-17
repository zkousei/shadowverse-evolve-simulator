import { describe, expect, it } from 'vitest';
import { initialState, type SyncState } from '../types/game';
import { applyGameSyncEvent } from './gameSyncReducer';

const createState = (overrides: Partial<SyncState> = {}): SyncState => ({
  ...initialState,
  ...overrides,
});

describe('gameSyncReducer', () => {
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

  it('ends turn, advances resources, and draws for the next player', () => {
    const state = createState({
      gameStatus: 'playing',
      turnPlayer: 'host',
      revision: 4,
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
    expect(result.guest.maxPp).toBe(1);
    expect(result.guest.pp).toBe(1);
    expect(result.cards.find(c => c.id === 'deck-guest')?.zone).toBe('hand-guest');
    expect(result.cards.find(c => c.id === 'tapped-guest')?.isTapped).toBe(false);
    expect(result.revision).toBe(5);
  });

  it('resets the game while preserving non-token cards in their original decks', () => {
    const state = createState({
      revision: 8,
      gameStatus: 'playing',
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
          id: 'token-1',
          cardId: 'token',
          name: 'Token',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 1, hp: 1 },
        },
      ],
    });

    const result = applyGameSyncEvent(state, {
      id: 'evt-5',
      type: 'RESET_GAME',
      actor: 'host',
    });

    expect(result.gameStatus).toBe('preparing');
    expect(result.cards).toHaveLength(2);
    expect(result.cards.find(c => c.id === 'main-1')?.zone).toBe('mainDeck-host');
    expect(result.cards.find(c => c.id === 'evo-1')?.zone).toBe('evolveDeck-guest');
    expect(result.revision).toBe(9);
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
  });

  it('applies tap and flip events through shared card rules', () => {
    const state = createState({
      revision: 6,
      cards: [
        {
          id: 'parent',
          cardId: 'BP01-013',
          name: 'Parent',
          image: '',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
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
    expect(flipped.cards.find(c => c.id === 'parent')?.isFlipped).toBe(true);
    expect(flipped.cards.find(c => c.id === 'child')?.isFlipped).toBe(false);
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

    const played = applyGameSyncEvent(extracted, {
      id: 'evt-15',
      type: 'PLAY_TO_FIELD',
      actor: 'host',
      cardId: 'hand-card',
    });
    expect(played.cards.find(c => c.id === 'hand-card')?.zone).toBe('field-host');
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

    const undone = applyGameSyncEvent(spawned, {
      id: 'evt-23',
      type: 'UNDO_LAST_TURN',
      actor: 'host',
      previousState: ordered,
    });
    expect(undone.cards.find(c => c.id === 'token-1')).toBeUndefined();
    expect(undone.turnPlayer).toBe('guest');
    expect(undone.revision).toBe(spawned.revision + 1);
  });
});
