import { act, fireEvent, render, screen } from '@testing-library/react';
import * as PeerJsModule from 'peerjs';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameBoardLogic } from './useGameBoardLogic';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const map: Record<string, string> = {
        'gameBoard.status.initializing': 'Initializing P2P...',
        'gameBoard.status.connectingToHost': 'Connecting to host...',
        'gameBoard.status.syncTimedOut': 'Timed out waiting for host state. Reconnecting...',
        'gameBoard.status.waitingForRestore': 'Waiting for host session restore... retrying sync.',
        'gameBoard.status.guestConnectedReady': 'Guest connected! Game ready.',
        'gameBoard.status.connectedHostSyncing': 'Connected to host. Syncing latest game state...',
        'gameBoard.status.guestConnectedChooseResume': 'Guest connected. Choose whether to resume the saved session.',
        'gameBoard.status.connectedHostReady': 'Connected to host! Game ready.',
        'gameBoard.status.guestDisconnectedWaiting': 'Guest disconnected. Waiting for reconnection...',
        'gameBoard.status.connectionErrorWaiting': 'Connection error. Waiting for guest...',
        'gameBoard.status.sessionRestored': 'Saved host session restored.',
        'gameBoard.status.startingFresh': 'Starting a fresh host session.',
        'gameBoard.status.soloMode': 'Solo Mode',
        'gameBoard.status.connectedWaitingGuest': 'Connected! Waiting for guest...',
        'gameBoard.status.connectedJoiningRoom': 'Connected! Joining room...',
        'gameBoard.status.disconnectedFromPeer': 'Disconnected from Peer server. Reopen room if needed.',
        'gameBoard.status.p2pErrorWaiting': 'P2P error. Waiting for guest...',
        'gameBoard.status.debugAutoStarted': '[DEBUG] Game auto-started. Both decks injected (20 cards each).',
        'gameBoard.shared.actor.you': 'You',
        'gameBoard.shared.actor.opponent': 'Opponent',
        'gameBoard.shared.actor.player1': 'Player 1',
        'gameBoard.shared.actor.player2': 'Player 2',
        'gameBoard.shared.messages.lookTopResolved': '{{actor}} resolved Look Top {{count}}',
        'gameBoard.shared.messages.lookTopDetail.revealedToHand': 'Revealed to Hand: {{cards}}',
        'gameBoard.shared.messages.lookTopDetail.bottom': 'Bottom: {{count}}',
        'gameBoard.shared.messages.lookTopDetail.top': 'Top: {{count}}',
        'gameBoard.shared.messages.lookTopDetail.hand': 'Hand: {{count}}',
        'gameBoard.shared.messages.lookTopDetail.field': 'Field: {{cards}}',
        'gameBoard.shared.messages.lookTopDetail.ex': 'EX: {{cards}}',
        'gameBoard.shared.messages.lookTopDetail.cemetery': 'Cemetery: {{cards}}',
        'gameBoard.shared.messages.coinFlip': '{{actor}} flipped: {{result}}',
        'gameBoard.shared.messages.diceRoll': '{{actor}} rolled: {{value}}',
        'gameBoard.shared.messages.resetGame': '{{actor}} reset the game',
        'gameBoard.shared.messages.shuffleDeck': '{{actor}} shuffled the deck',
        'gameBoard.shared.messages.drawCard': '{{actor}} drew a card',
        'gameBoard.shared.messages.millCard': '{{actor}} milled {{cardName}}',
        'gameBoard.shared.messages.searchToHand': '{{actor}} added a card from Search to hand',
        'gameBoard.shared.messages.searchPlayedField': '{{actor}} played to field {{cardName}} from Search',
        'gameBoard.shared.messages.searchSetField': '{{actor}} set a card from Search to field',
        'gameBoard.shared.messages.searchToEx': '{{actor}} added {{cardName}} from Search to EX Area',
        'gameBoard.shared.messages.searchToExGeneric': '{{actor}} added a card from Search to EX Area',
        'gameBoard.shared.messages.cemeteryToHand': '{{actor}} added {{cardName}} from Cemetery to hand',
        'gameBoard.shared.messages.cemeteryPlayedField': '{{actor}} played to field {{cardName}} from Cemetery',
        'gameBoard.shared.messages.cemeteryToEx': '{{actor}} added {{cardName}} from Cemetery to EX Area',
        'gameBoard.shared.messages.evolvePlayedField': '{{actor}} played to field {{cardName}} from Evolve Deck',
        'gameBoard.shared.messages.evolveSetUsed': '{{actor}} set {{cardName}} to USED',
        'gameBoard.shared.messages.evolveSetUnused': '{{actor}} set {{cardName}} to UNUSED',
        'gameBoard.shared.messages.banishToHand': '{{actor}} added {{cardName}} from Banish to hand',
        'gameBoard.shared.messages.banishPlayedField': '{{actor}} played to field {{cardName}} from Banish',
        'gameBoard.shared.messages.banishToEx': '{{actor}} added {{cardName}} from Banish to EX Area',
        'gameBoard.shared.messages.revealLookTop': '{{actor}} revealed from Look Top',
        'gameBoard.shared.messages.revealSearch': '{{actor}} revealed from Search',
        'gameBoard.shared.messages.attackDeclared': '{{actor}} declared an attack',
        'gameBoard.shared.messages.cardPlayed': '{{actor}} played {{cardName}}',
        'gameBoard.shared.messages.cardPlayedToField': '{{actor}} played to field {{cardName}}',
        'gameBoard.shared.messages.starterDecided': '{{actor}} will go first!',
        'gameBoard.shared.messages.starterDecidedManual': 'Manually set: {{actor}} will go first!',
      };
      let value = map[key] || key;
      if (options) {
        Object.keys(options).forEach(k => {
          value = value.replace(`{{${k}}}`, String(options[k]));
        });
      }
      return value;
    },
  }),
}));

vi.mock('peerjs', () => ({
  ...(() => {
    type MockHandler<T = unknown> = (payload: T) => void;

    class MockConnection {
      open = false;
      peer: string;
      readonly send = vi.fn();
      readonly close = vi.fn(() => {
        this.open = false;
        this.emit('close');
      });

      private handlers: Record<string, MockHandler[]> = {};

      constructor(peer: string) {
        this.peer = peer;
      }

      on(event: string, handler: MockHandler) {
        this.handlers[event] ??= [];
        this.handlers[event].push(handler);
      }

      emit(event: string, payload?: unknown) {
        for (const handler of this.handlers[event] ?? []) {
          handler(payload);
        }
      }
    }

    const mockPeerJs = {
      peers: [] as MockPeer[],
      createConnection(peerId = 'guest') {
        return new MockConnection(peerId);
      },
      reset() {
        this.peers.length = 0;
      },
    };

    class MockPeer {
      id?: string;
      readonly connect = vi.fn((peerId: string) => {
        const conn = new MockConnection(peerId);
        this.connections.push(conn);
        return conn;
      });
      readonly destroy = vi.fn();
      readonly connections: MockConnection[] = [];

      private handlers: Record<string, MockHandler[]> = {};

      constructor(id?: string) {
        this.id = id;
        mockPeerJs.peers.push(this);
      }

      on(event: string, handler: MockHandler) {
        this.handlers[event] ??= [];
        this.handlers[event].push(handler);
      }

      emit(event: string, payload?: unknown) {
        for (const handler of this.handlers[event] ?? []) {
          handler(payload);
        }
      }
    }

    return {
      default: MockPeer,
      __mockPeerJs: mockPeerJs,
    };
  })(),
}));
const mockPeerJs = (PeerJsModule as unknown as {
  __mockPeerJs: {
    peers: Array<{
      connect: ReturnType<typeof vi.fn>;
      connections: Array<{
        open: boolean;
        send: ReturnType<typeof vi.fn>;
        emit: (event: string, payload?: unknown) => void;
      }>;
      emit: (event: string, payload?: unknown) => void;
    }>;
    createConnection: (peerId?: string) => {
      open: boolean;
      send: ReturnType<typeof vi.fn>;
      emit: (event: string, payload?: unknown) => void;
    };
    reset: () => void;
  };
}).__mockPeerJs;

function HookHarness() {
  const {
    status,
    connectionState,
    canInteract,
    gameState,
    cardPlayMessage,
    turnMessage,
    eventHistory,
    revealedCardsOverlay,
    savedSessionCandidate,
    resumeSavedSession,
    discardSavedSession,
  } = useGameBoardLogic();

  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="connection-state">{connectionState}</div>
      <div data-testid="can-interact">{String(canInteract)}</div>
      <div data-testid="host-hp">{gameState.host.hp}</div>
      <div data-testid="card-play-message">{cardPlayMessage ?? 'none'}</div>
      <div data-testid="turn-message">{turnMessage ?? 'none'}</div>
      <div data-testid="event-history">{eventHistory.join(' || ') || 'none'}</div>
      <div data-testid="revealed-overlay-title">{revealedCardsOverlay?.title ?? 'none'}</div>
      <div data-testid="revealed-overlay-summary">{revealedCardsOverlay?.summaryLines?.join(' || ') ?? 'none'}</div>
      <div data-testid="saved-session">{savedSessionCandidate ? savedSessionCandidate.room : 'none'}</div>
      {savedSessionCandidate && (
        <>
          <button onClick={resumeSavedSession}>Resume Saved Session</button>
          <button onClick={discardSavedSession}>Discard Saved Session</button>
        </>
      )}
    </div>
  );
}

const renderHarness = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <HookHarness />
  </MemoryRouter>
);

const connectGuest = (entry = '/game?host=false&room=ROOM123') => {
  renderHarness(entry);

  const peer = mockPeerJs.peers[0];
  act(() => {
    peer.emit('open');
  });

  const conn = peer.connections[0];
  act(() => {
    conn.open = true;
    conn.emit('open');
    conn.emit('data', {
      type: 'STATE_SNAPSHOT',
      source: 'host',
      state: {
        host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
        guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
        cards: [],
        turnPlayer: 'host',
        turnCount: 1,
        phase: 'Start',
        gameStatus: 'playing',
        tokenOptions: { host: [], guest: [] },
        revision: 1,
      },
    });
  });

  return { peer, conn };
};

describe('useGameBoardLogic P2P reconnect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPeerJs.reset();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('requests a fresh snapshot on initial connect and after reconnecting as guest', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];

    act(() => {
      peer.emit('open');
    });

    expect(peer.connect).toHaveBeenCalledWith('sv-evolve-ROOM123');

    const firstConn = peer.connections[0];
    act(() => {
      firstConn.open = true;
      firstConn.emit('open');
    });

    expect(firstConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'REQUEST_SNAPSHOT',
      lastKnownRevision: 0,
      source: 'guest',
    }));
    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
    expect(screen.getByTestId('can-interact')).toHaveTextContent('true');

    act(() => {
      firstConn.emit('close');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('reconnecting');
    expect(screen.getByTestId('can-interact')).toHaveTextContent('false');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(peer.connect).toHaveBeenCalledTimes(2);

    const secondConn = peer.connections[1];
    act(() => {
      secondConn.open = true;
      secondConn.emit('open');
    });

    expect(secondConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'REQUEST_SNAPSHOT',
      lastKnownRevision: 0,
      source: 'guest',
    }));
    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
  });

  it('retries snapshot requests when the host does not respond yet', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = peer.connections[0];
    act(() => {
      conn.open = true;
      conn.emit('open');
    });

    expect(conn.send).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(conn.send).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('status')).toHaveTextContent('Waiting for host session restore... retrying sync.');

    act(() => {
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: [],
          turnPlayer: 'host',
          turnCount: 1,
          phase: 'Start',
          gameStatus: 'preparing',
          tokenOptions: { host: [], guest: [] },
          revision: 1,
        },
      });
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(conn.send).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('status')).toHaveTextContent('Connected to host! Game ready.');
  });

  it('falls back to reconnecting after snapshot retries are exhausted', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = peer.connections[0];
    act(() => {
      conn.open = true;
      conn.emit('open');
    });

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(conn.send).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('status')).toHaveTextContent('Connecting to host...');
    expect(peer.connect).toHaveBeenCalledTimes(2);
  });

  it('accepts the first snapshot from a new host connection even when the revision goes backwards', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const firstConn = peer.connections[0];
    act(() => {
      firstConn.open = true;
      firstConn.emit('open');
      firstConn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 13, pp: 4, maxPp: 5, ep: 2, sep: 1, combo: 1, initialHandDrawn: true, mulliganUsed: true, isReady: true },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: true, mulliganUsed: false, isReady: false },
          cards: [],
          turnPlayer: 'host',
          turnCount: 3,
          phase: 'Main',
          gameStatus: 'playing',
          tokenOptions: { host: [], guest: [] },
          revision: 7,
        },
      });
    });

    expect(screen.getByTestId('host-hp')).toHaveTextContent('13');

    act(() => {
      firstConn.emit('close');
      vi.advanceTimersByTime(1000);
    });

    const secondConn = peer.connections[1];
    act(() => {
      secondConn.open = true;
      secondConn.emit('open');
      secondConn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: [],
          turnPlayer: 'host',
          turnCount: 1,
          phase: 'Start',
          gameStatus: 'preparing',
          tokenOptions: { host: [], guest: [] },
          revision: 0,
        },
      });
    });

    expect(screen.getByTestId('host-hp')).toHaveTextContent('20');
    expect(screen.getByTestId('status')).toHaveTextContent('Connected to host! Game ready.');
  });

  it('responds to snapshot requests as host and ignores stale connection closes', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];

    act(() => {
      peer.emit('open');
    });

    const firstConn = mockPeerJs.createConnection('guest');
    act(() => {
      peer.emit('connection', firstConn);
      firstConn.open = true;
      firstConn.emit('open');
    });

    const secondConn = mockPeerJs.createConnection('guest');
    act(() => {
      peer.emit('connection', secondConn);
      secondConn.open = true;
      secondConn.emit('open');
    });

    act(() => {
      firstConn.emit('close');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');

    act(() => {
      secondConn.emit('data', {
        type: 'REQUEST_SNAPSHOT',
        lastKnownRevision: 0,
        source: 'guest',
      });
    });

    expect(secondConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
    }));
    expect(screen.getByTestId('status')).toHaveTextContent('Guest connected! Game ready.');
  });

  it('loads a saved host session candidate and restores it when requested', () => {
    window.sessionStorage.setItem('sv-evolve:host-session:ROOM123', JSON.stringify({
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '0.0.0',
      state: {
        host: { hp: 13, pp: 4, maxPp: 5, ep: 2, sep: 1, combo: 1, initialHandDrawn: true, mulliganUsed: true, isReady: true },
        guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: true, mulliganUsed: false, isReady: false },
        cards: [],
        turnPlayer: 'host',
        turnCount: 3,
        phase: 'Main',
        gameStatus: 'playing',
        tokenOptions: { host: [], guest: [] },
        revision: 7,
      },
    }));

    renderHarness('/game?host=true&room=ROOM123');

    expect(screen.getByTestId('saved-session')).toHaveTextContent('ROOM123');
    expect(screen.getByTestId('host-hp')).toHaveTextContent('20');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Resume Saved Session' }));
    });

    expect(screen.getByTestId('saved-session')).toHaveTextContent('none');
    expect(screen.getByTestId('host-hp')).toHaveTextContent('13');
    expect(JSON.parse(window.sessionStorage.getItem('sv-evolve:host-session:ROOM123') ?? '{}').state.host.hp).toBe(13);
  });

  it('allows the host to discard a saved session and does not surface it to guests', () => {
    window.sessionStorage.setItem('sv-evolve:host-session:ROOM123', JSON.stringify({
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '0.0.0',
      state: {
        host: { hp: 11, pp: 1, maxPp: 1, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
        guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
        cards: [],
        turnPlayer: 'host',
        turnCount: 1,
        phase: 'Start',
        gameStatus: 'preparing',
        tokenOptions: { host: [], guest: [] },
        revision: 2,
      },
    }));

    const { unmount } = renderHarness('/game?host=true&room=ROOM123');

    expect(screen.getByTestId('saved-session')).toHaveTextContent('ROOM123');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Discard Saved Session' }));
    });

    expect(screen.getByTestId('saved-session')).toHaveTextContent('none');
    expect(window.sessionStorage.getItem('sv-evolve:host-session:ROOM123')).toBeTruthy();

    unmount();

    renderHarness('/game?host=false&room=ROOM123');
    expect(screen.getByTestId('saved-session')).toHaveTextContent('none');
  });
});

describe('useGameBoardLogic shared UI notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPeerJs.reset();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('logs searched card to hand but not card played announcements', () => {
    const { conn } = connectGuest();

    act(() => {
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect: { type: 'SEARCHED_CARD_TO_HAND', actor: 'host' },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('card-play-message')).toHaveTextContent('Opponent added a card from Search to hand');
    expect(screen.getByTestId('event-history')).toHaveTextContent('Opponent added a card from Search to hand');

    act(() => {
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect: { type: 'CARD_PLAYED', actor: 'host', cardId: 'spell-1', cardName: 'Fire Chain', mode: 'play' },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('card-play-message')).toHaveTextContent('Opponent played Fire Chain');
    expect(screen.getByTestId('event-history')).not.toHaveTextContent('Opponent played Fire Chain');
  });

  it('merges look-top summary into the reveal overlay and logs only the summary entry', () => {
    const { conn } = connectGuest();

    act(() => {
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect: {
          type: 'REVEAL_TOP_DECK_CARDS',
          actor: 'host',
          cards: [{ cardId: 'BP01-001', name: 'Aurelia', image: '' }],
        },
      });
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect: {
          type: 'LOOK_TOP_RESOLVED',
          actor: 'host',
          totalCount: 4,
          topCount: 0,
          bottomCount: 3,
          handCount: 0,
          revealedHandCards: ['Aurelia'],
          fieldCards: [],
          exCards: [],
          cemeteryCards: [],
        },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('revealed-overlay-title')).toHaveTextContent('Opponent revealed from Look Top');
    expect(screen.getByTestId('revealed-overlay-summary')).toHaveTextContent('Revealed to Hand: Aurelia');
    expect(screen.getByTestId('revealed-overlay-summary')).toHaveTextContent('Bottom: 3');
    expect(screen.getByTestId('event-history')).toHaveTextContent('Opponent resolved Look Top 4');
    expect(screen.getByTestId('event-history')).toHaveTextContent('Revealed to Hand: Aurelia');
    expect(screen.getByTestId('event-history')).not.toHaveTextContent('Opponent revealed from Look Top');
  });

  it('does not keep reset or preparing-only evolve usage entries in recent events', () => {
    const { conn } = connectGuest();

    act(() => {
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect: { type: 'RESET_GAME_COMPLETED', actor: 'host' },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('card-play-message')).toHaveTextContent('Opponent reset the game');
    expect(screen.getByTestId('event-history')).toHaveTextContent('none');

    act(() => {
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: [],
          turnPlayer: 'host',
          turnCount: 1,
          phase: 'Start',
          gameStatus: 'preparing',
          tokenOptions: { host: [], guest: [] },
          revision: 2,
        },
      });
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect: { type: 'EVOLVE_USAGE_TOGGLED', actor: 'host', cardName: 'Dragon Warrior', isUsed: true },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('card-play-message')).toHaveTextContent('Opponent set Dragon Warrior to USED');
    expect(screen.getByTestId('event-history')).toHaveTextContent('none');
  });

  it.each([
    {
      name: 'main deck search placement to field stays dialog-only and supports generic wording',
      effect: { type: 'SEARCHED_CARD_PLACED', actor: 'host', destination: 'field' as const },
      expected: 'Opponent set a card from Search to field',
    },
    {
      name: 'main deck search placement to ex stays dialog-only',
      effect: { type: 'SEARCHED_CARD_PLACED', actor: 'host', destination: 'ex' as const, cardName: 'Drive Point' },
      expected: 'Opponent added Drive Point from Search to EX Area',
    },
    {
      name: 'cemetery placement to field stays dialog-only',
      effect: { type: 'CEMETERY_CARD_PLACED', actor: 'host', destination: 'field' as const, cardName: 'Aurelia' },
      expected: 'Opponent played to field Aurelia from Cemetery',
    },
    {
      name: 'cemetery placement to ex stays dialog-only',
      effect: { type: 'CEMETERY_CARD_PLACED', actor: 'host', destination: 'ex' as const, cardName: 'Aurelia' },
      expected: 'Opponent added Aurelia from Cemetery to EX Area',
    },
    {
      name: 'banish placement to field stays dialog-only',
      effect: { type: 'BANISHED_CARD_PLACED', actor: 'host', destination: 'field' as const, cardName: 'Aurelia' },
      expected: 'Opponent played to field Aurelia from Banish',
    },
    {
      name: 'banish placement to ex stays dialog-only',
      effect: { type: 'BANISHED_CARD_PLACED', actor: 'host', destination: 'ex' as const, cardName: 'Aurelia' },
      expected: 'Opponent added Aurelia from Banish to EX Area',
    },
    {
      name: 'evolve deck placement to field stays dialog-only',
      effect: { type: 'EVOLVE_CARD_PLACED', actor: 'host', cardName: 'Dragon Warrior' },
      expected: 'Opponent played to field Dragon Warrior from Evolve Deck',
    },
  ])('$name', ({ effect, expected }) => {
    const { conn } = connectGuest();

    act(() => {
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect,
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('card-play-message')).toHaveTextContent(expected);
    expect(screen.getByTestId('event-history')).toHaveTextContent('none');
  });

  it('shows manual draw as a dialog only without adding a recent event entry', () => {
    const { conn } = connectGuest();

    act(() => {
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect: { type: 'DRAW_CARD_COMPLETED', actor: 'host' },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('card-play-message')).toHaveTextContent('Opponent drew a card');
    expect(screen.getByTestId('event-history')).toHaveTextContent('none');
  });

  it('clears the your-turn banner immediately when the turn moves away before timeout', () => {
    const { conn } = connectGuest();

    act(() => {
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: [],
          turnPlayer: 'guest',
          turnCount: 2,
          phase: 'Start',
          gameStatus: 'playing',
          tokenOptions: { host: [], guest: [] },
          revision: 2,
        },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('turn-message')).toHaveTextContent('YOUR TURN');

    act(() => {
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: [],
          turnPlayer: 'host',
          turnCount: 2,
          phase: 'Start',
          gameStatus: 'playing',
          tokenOptions: { host: [], guest: [] },
          revision: 3,
        },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('turn-message')).toHaveTextContent('none');
  });
});
