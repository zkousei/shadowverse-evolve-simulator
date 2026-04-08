import { act, fireEvent, render, screen } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';
import * as PeerJsModule from 'peerjs';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncState } from '../types/game';
import type { SyncMessage } from '../types/sync';
import { useGameBoardLogic } from './useGameBoardLogic';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'gameBoard.status.initializing': 'Initializing P2P...',
        'gameBoard.status.connectingToHost': 'Connecting to host...',
        'gameBoard.status.syncTimedOut': 'Timed out waiting for host state. Reconnecting...',
        'gameBoard.status.waitingForRestore': 'Waiting for host session restore... retrying sync.',
        'gameBoard.status.waitingForHostDecision': 'Host is choosing whether to resume the saved session. Waiting...',
        'gameBoard.status.guestConnectedReady': 'Guest connected! Game ready.',
        'gameBoard.status.connectedHostSyncing': 'Connected to host. Syncing latest game state...',
        'gameBoard.status.guestConnectedChooseResume': 'Guest connected. Choose whether to resume the saved session.',
        'gameBoard.status.connectedHostReady': 'Connected to host! Game ready.',
        'gameBoard.status.guestDisconnectedWaiting': 'Guest disconnected. Waiting for reconnection...',
        'gameBoard.status.connectionErrorWaiting': 'Connection error. Waiting for guest...',
        'gameBoard.status.connectionLostReconnecting': 'Connection lost. Reconnecting...',
        'gameBoard.status.connectionErrorReconnecting': 'Connection error. Reconnecting...',
        'gameBoard.status.peerConnectionLostReconnecting': 'Peer connection lost. Reconnecting...',
        'gameBoard.status.unableToReachHostReconnecting': 'Unable to reach host. Reconnecting...',
        'gameBoard.status.sessionRestored': 'Saved host session restored.',
        'gameBoard.status.startingFresh': 'Starting a fresh host session.',
        'gameBoard.status.soloMode': 'Solo Mode',
        'gameBoard.status.connectedWaitingGuest': 'Connected! Waiting for guest...',
        'gameBoard.status.connectedJoiningRoom': 'Connected! Joining room...',
        'gameBoard.status.disconnectedFromPeer': 'Disconnected from Peer server. Reopen room if needed.',
        'gameBoard.status.p2pErrorWaiting': 'P2P error. Waiting for guest...',
        'gameBoard.status.debugAutoStarted': '[DEBUG] Game auto-started. Both decks injected (20 cards each).',
        'gameBoard.modals.shared.actor.you': 'You',
        'gameBoard.modals.shared.actor.opponent': 'Opponent',
        'gameBoard.modals.shared.actor.player1': 'Player 1',
        'gameBoard.modals.shared.actor.player2': 'Player 2',
        'gameBoard.modals.shared.messages.lookTopResolved': '{{actor}} resolved Look Top {{count}}',
        'gameBoard.modals.shared.messages.lookTopDetail.revealedToHand': 'Revealed to Hand: {{cards}}',
        'gameBoard.modals.shared.messages.lookTopDetail.bottom': 'Bottom: {{count}}',
        'gameBoard.modals.shared.messages.lookTopDetail.top': 'Top: {{count}}',
        'gameBoard.modals.shared.messages.lookTopDetail.hand': 'Hand: {{count}}',
        'gameBoard.modals.shared.messages.lookTopDetail.field': 'Field: {{cards}}',
        'gameBoard.modals.shared.messages.lookTopDetail.ex': 'EX: {{cards}}',
        'gameBoard.modals.shared.messages.lookTopDetail.cemetery': 'Cemetery: {{cards}}',
        'gameBoard.modals.shared.messages.coinFlip': '{{actor}} flipped: {{result}}',
        'gameBoard.modals.shared.messages.diceRoll': '{{actor}} rolled: {{value}}',
        'gameBoard.modals.shared.messages.resetGame': '{{actor}} reset the game',
        'gameBoard.modals.shared.messages.shuffleDeck': '{{actor}} shuffled the deck',
        'gameBoard.modals.shared.messages.drawCard': '{{actor}} drew a card',
        'gameBoard.modals.shared.messages.millCard': '{{actor}} milled {{cardName}}',
        'gameBoard.modals.shared.messages.topCardToEx': '{{actor}} moved {{cardName}} to EX Area',
        'gameBoard.modals.shared.messages.searchToHand': '{{actor}} added a card from Search to hand',
        'gameBoard.modals.shared.messages.searchPlayedField': '{{actor}} played to field {{cardName}} from Search',
        'gameBoard.modals.shared.messages.searchSetField': '{{actor}} set a card from Search to field',
        'gameBoard.modals.shared.messages.searchToEx': '{{actor}} added {{cardName}} from Search to EX Area',
        'gameBoard.modals.shared.messages.searchToExGeneric': '{{actor}} added a card from Search to EX Area',
        'gameBoard.modals.shared.messages.cemeteryToHand': '{{actor}} added {{cardName}} from Cemetery to hand',
        'gameBoard.modals.shared.messages.cemeteryPlayedField': '{{actor}} played to field {{cardName}} from Cemetery',
        'gameBoard.modals.shared.messages.cemeteryToEx': '{{actor}} added {{cardName}} from Cemetery to EX Area',
        'gameBoard.modals.shared.messages.evolvePlayedField': '{{actor}} played to field {{cardName}} from Evolve Deck',
        'gameBoard.modals.shared.messages.evolveSetUsed': '{{actor}} set {{cardName}} to USED',
        'gameBoard.modals.shared.messages.evolveSetUnused': '{{actor}} set {{cardName}} to UNUSED',
        'gameBoard.modals.shared.messages.banishToHand': '{{actor}} added {{cardName}} from Banish to hand',
        'gameBoard.modals.shared.messages.banishPlayedField': '{{actor}} played to field {{cardName}} from Banish',
        'gameBoard.modals.shared.messages.banishToEx': '{{actor}} added {{cardName}} from Banish to EX Area',
        'gameBoard.modals.shared.messages.revealLookTop': '{{actor}} revealed from Look Top',
        'gameBoard.modals.shared.messages.revealHand': '{{actor}} revealed cards from hand',
        'gameBoard.modals.shared.messages.revealSearch': '{{actor}} revealed from Search',
        'gameBoard.modals.shared.messages.attackDeclared': '{{actor}} declared an attack',
        'gameBoard.modals.shared.messages.attackAnnouncement': '{{attacker}} attacks {{target}}',
        'gameBoard.modals.shared.messages.attackHistory': '{{attacker}} -> {{target}}',
        'gameBoard.modals.shared.messages.leaderLabel': '{{owner}} Leader',
        'gameBoard.modals.shared.messages.cardPlayed': '{{actor}} played {{cardName}}',
        'gameBoard.modals.shared.messages.cardPlayedToField': '{{actor}} played to field {{cardName}}',
        'gameBoard.modals.shared.messages.starterDecided': '{{actor}} will go first!',
        'gameBoard.modals.shared.messages.starterDecidedManual': 'Manually set: {{actor}} will go first!',
        'gameBoard.turn.p1': '{{label}} TURN',
        'gameBoard.turn.your': 'YOUR TURN',
        'gameBoard.alerts.gameStart': 'GAME START!',
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

const dragEvent = (activeId: string, overId: string): DragEndEvent => (
  { active: { id: activeId }, over: { id: overId } } as unknown as DragEndEvent
);

vi.mock('peerjs', () => ({
  ...(() => {
    type MockHandler<T = unknown> = (payload: T) => void;

    class MockConnection {
      open = false;
      peer: string;
      metadata?: unknown;
      readonly send = vi.fn();
      readonly close = vi.fn(() => {
        this.open = false;
        this.emit('close');
      });

      private handlers: Record<string, MockHandler[]> = {};

      constructor(peer: string, metadata?: unknown) {
        this.peer = peer;
        this.metadata = metadata;
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
      createConnection(peerId = 'guest', metadata?: unknown) {
        return new MockConnection(peerId, metadata);
      },
      reset() {
        this.peers.length = 0;
      },
    };

    class MockPeer {
      id?: string;
      readonly connect = vi.fn((peerId: string, options?: { metadata?: unknown }) => {
        const conn = new MockConnection(peerId, options?.metadata);
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
      destroy: ReturnType<typeof vi.fn>;
      connections: Array<{
        open: boolean;
        send: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
        emit: (event: string, payload?: unknown) => void;
        metadata?: unknown;
      }>;
      emit: (event: string, payload?: unknown) => void;
    }>;
    createConnection: (peerId?: string, metadata?: unknown) => {
      open: boolean;
      send: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
      emit: (event: string, payload?: unknown) => void;
      metadata?: unknown;
    };
    reset: () => void;
  };
}).__mockPeerJs;

function HookHarness() {
  const {
    status,
    connectionState,
    canInteract,
    canView,
    isSpectator,
    gameState,
    hasUndoableMove,
    canUndoTurn,
    cardPlayMessage,
    attackMessage,
    turnMessage,
    eventHistory,
    revealedCardsOverlay,
    savedSessionCandidate,
    resumeSavedSession,
    discardSavedSession,
    mulliganOrder,
    isMulliganModalOpen,
    startMulligan,
    handleMulliganOrderSelect,
    executeMulligan,
    handleStatChange,
    setPhase,
    endTurn,
    handleUndoTurn,
    handleSetInitialTurnOrder,
    handlePureCoinFlip,
    handleRollDice,
    handleStartGame,
    handleToggleReady,
    handleDrawInitialHand,
    drawCard,
    moveTopCardToEx,
    handleUndoCardMove,
    handleExtractCard,
    handleDeckUpload,
    spawnToken,
    spawnTokens,
    handleModifyCounter,
    handleModifyGenericCounter,
    handleDragEnd,
    toggleTap,
    handleFlipCard,
    handleSendToBottom,
    handleBanish,
    handlePlayToField,
    handleSendToCemetery,
    handleReturnEvolve,
    handleShuffleDeck,
    handleDeclareAttack,
    handleSetRevealHandsMode,
    revealHand,
    topDeckCards,
    handleLookAtTop,
    evolveAutoAttachSelection,
    confirmEvolveAutoAttachSelection,
    cancelEvolveAutoAttachSelection,
  } = useGameBoardLogic();

  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="connection-state">{connectionState}</div>
      <div data-testid="can-interact">{String(canInteract)}</div>
      <div data-testid="can-view">{String(canView)}</div>
      <div data-testid="is-spectator">{String(isSpectator)}</div>
      <div data-testid="host-hp">{gameState.host.hp}</div>
      <div data-testid="host-hand-count">{gameState.cards.filter(card => card.zone === 'hand-host').length}</div>
      <div data-testid="host-ex-count">{gameState.cards.filter(card => card.zone === 'ex-host').length}</div>
      <div data-testid="host-field-count">{gameState.cards.filter(card => card.zone === 'field-host').length}</div>
      <div data-testid="guest-ex-count">{gameState.cards.filter(card => card.zone === 'ex-guest').length}</div>
      <div data-testid="guest-field-count">{gameState.cards.filter(card => card.zone === 'field-guest').length}</div>
      <div data-testid="guest-cemetery-count">{gameState.cards.filter(card => card.zone === 'cemetery-guest').length}</div>
      <div data-testid="host-cemetery-count">{gameState.cards.filter(card => card.zone === 'cemetery-host').length}</div>
      <div data-testid="host-banish-count">{gameState.cards.filter(card => card.zone === 'banish-host').length}</div>
      <div data-testid="host-evolve-count">{gameState.cards.filter(card => card.zone === 'evolveDeck-host').length}</div>
      <div data-testid="host-main-deck-count">{gameState.cards.filter(card => card.zone === 'mainDeck-host').length}</div>
      <div data-testid="host-mulligan-used">{String(gameState.host.mulliganUsed)}</div>
      <div data-testid="counter-card-atk">{String(gameState.cards.find(card => card.id === 'counter-card')?.counters.atk ?? 'missing')}</div>
      <div data-testid="counter-card-generic">{String(gameState.cards.find(card => card.id === 'counter-card')?.genericCounter ?? 'missing')}</div>
      <div data-testid="tap-card-state">{String(gameState.cards.find(card => card.id === 'tap-card')?.isTapped ?? 'missing')}</div>
      <div data-testid="tap-child-state">{String(gameState.cards.find(card => card.id === 'tap-child')?.isTapped ?? 'missing')}</div>
      <div data-testid="flip-card-state">{String(gameState.cards.find(card => card.id === 'flip-card')?.isFlipped ?? 'missing')}</div>
      <div data-testid="game-status">{gameState.gameStatus}</div>
      <div data-testid="phase">{gameState.phase}</div>
      <div data-testid="turn-player">{gameState.turnPlayer}</div>
      <div data-testid="host-ready">{String(gameState.host.isReady)}</div>
      <div data-testid="host-initial-hand-drawn">{String(gameState.host.initialHandDrawn)}</div>
      <div data-testid="reveal-hands-mode">{String(gameState.revealHandsMode)}</div>
      <div data-testid="can-undo-turn">{String(canUndoTurn)}</div>
      <div data-testid="can-undo-move">{String(hasUndoableMove)}</div>
      <div data-testid="card-play-message">{cardPlayMessage ?? 'none'}</div>
      <div data-testid="attack-message">{attackMessage ?? 'none'}</div>
      <div data-testid="turn-message">{turnMessage ?? 'none'}</div>
      <div data-testid="event-history">{eventHistory.join(' || ') || 'none'}</div>
      <div data-testid="revealed-overlay-title">{revealedCardsOverlay?.title ?? 'none'}</div>
      <div data-testid="revealed-overlay-cards">{revealedCardsOverlay?.cards.map(card => card.name).join(', ') || 'none'}</div>
      <div data-testid="revealed-overlay-summary">{revealedCardsOverlay?.summaryLines?.join(' || ') ?? 'none'}</div>
      <div data-testid="saved-session">{savedSessionCandidate ? savedSessionCandidate.room : 'none'}</div>
      <div data-testid="auto-attach-selection-count">{String(evolveAutoAttachSelection?.candidateCards.length ?? 0)}</div>
      <div data-testid="auto-attach-selection-source">{evolveAutoAttachSelection?.sourceCard.id ?? 'none'}</div>
      <div data-testid="auto-attach-selection-targets">{evolveAutoAttachSelection?.candidateCards.map(card => card.id).join(',') ?? 'none'}</div>
      <div data-testid="evolve-search-attached-to">{gameState.cards.find(card => card.id === 'evolve-search-card')?.attachedTo ?? 'none'}</div>
      <div data-testid="evolve-search-tapped">{String(gameState.cards.find(card => card.id === 'evolve-search-card')?.isTapped ?? 'missing')}</div>
      <div data-testid="drag-evolve-attached-to">{gameState.cards.find(card => card.id === 'drag-evolve-card')?.attachedTo ?? 'none'}</div>
      <div data-testid="drag-evolve-tapped">{String(gameState.cards.find(card => card.id === 'drag-evolve-card')?.isTapped ?? 'missing')}</div>
      <div data-testid="equipment-play-linked-to">{gameState.cards.find(card => card.id === 'equipment-play-card')?.linkedTo ?? 'none'}</div>
      <div data-testid="equipment-play-zone">{gameState.cards.find(card => card.id === 'equipment-play-card')?.zone ?? 'none'}</div>
      <div data-testid="drag-equipment-linked-to">{gameState.cards.find(card => card.id === 'drag-equipment-card')?.linkedTo ?? 'none'}</div>
      <div data-testid="drag-equipment-zone">{gameState.cards.find(card => card.id === 'drag-equipment-card')?.zone ?? 'none'}</div>
      <div data-testid="link-search-linked-to">{gameState.cards.find(card => card.id === 'link-search-card')?.linkedTo ?? 'none'}</div>
      <div data-testid="link-search-zone">{gameState.cards.find(card => card.id === 'link-search-card')?.zone ?? 'none'}</div>
      <div data-testid="drag-linked-linked-to">{gameState.cards.find(card => card.id === 'drag-linked-card')?.linkedTo ?? 'none'}</div>
      <div data-testid="drag-linked-zone">{gameState.cards.find(card => card.id === 'drag-linked-card')?.zone ?? 'none'}</div>
      <div data-testid="drag-linked-tapped">{String(gameState.cards.find(card => card.id === 'drag-linked-card')?.isTapped ?? 'missing')}</div>
      <div data-testid="mulligan-open">{String(isMulliganModalOpen)}</div>
      <div data-testid="mulligan-order">{mulliganOrder.join(',') || 'none'}</div>
      <div data-testid="top-deck-count">{String(topDeckCards.length)}</div>
      {savedSessionCandidate && (
        <>
          <button onClick={resumeSavedSession}>Resume Saved Session</button>
          <button onClick={discardSavedSession}>Discard Saved Session</button>
        </>
      )}
      <button onClick={() => handleStatChange('host', 'hp', -1)}>Damage Host</button>
      <button onClick={() => setPhase('End')}>Set Phase End</button>
      <button onClick={() => endTurn('host')}>Host End Turn</button>
      <button onClick={startMulligan}>Start Mulligan</button>
      <button onClick={() => handleMulliganOrderSelect('hand1')}>Select Mulligan Hand 1</button>
      <button onClick={() => handleMulliganOrderSelect('hand2')}>Select Mulligan Hand 2</button>
      <button onClick={() => handleMulliganOrderSelect('hand3')}>Select Mulligan Hand 3</button>
      <button onClick={() => handleMulliganOrderSelect('hand4')}>Select Mulligan Hand 4</button>
      <button onClick={() => handleMulliganOrderSelect('hand5')}>Select Mulligan Hand 5</button>
      <button onClick={() => executeMulligan('host')}>Execute Host Mulligan</button>
      <button onClick={handleUndoTurn}>Undo Turn</button>
      <button onClick={() => handleSetInitialTurnOrder('guest')}>Set Guest First</button>
      <button onClick={handlePureCoinFlip}>Toss Shared Coin</button>
      <button onClick={handleRollDice}>Roll Shared Die</button>
      <button onClick={handleStartGame}>Start Game</button>
      <button onClick={() => handleToggleReady('host')}>Toggle Host Ready</button>
      <button onClick={() => handleDrawInitialHand('host')}>Draw Host Initial Hand</button>
      <button onClick={() => drawCard('host')}>Host Draw</button>
      <button onClick={() => moveTopCardToEx('host')}>Host Top to EX</button>
      <button onClick={() => handleLookAtTop(2, 'guest')}>Guest Look Top 2</button>
      <button onClick={handleUndoCardMove}>Undo Move</button>
      <input data-testid="deck-upload-input" type="file" onChange={(event) => handleDeckUpload(event, 'host')} />
      <button onClick={() => handleModifyCounter('counter-card', 'atk', 2, 'host')}>Add ATK Counter</button>
      <button onClick={() => handleModifyGenericCounter('counter-card', 1, 'host')}>Add Generic Counter</button>
      <button onClick={() => handleDragEnd(dragEvent('drag-card', 'ex-host'))}>Drag Card to EX</button>
      <button onClick={() => toggleTap('tap-card')}>Toggle Tap Stack</button>
      <button onClick={() => handleFlipCard('flip-card', 'host')}>Toggle Evolve Usage</button>
      <button onClick={() => handleSendToBottom('bottom-card')}>Send Field Card to Bottom</button>
      <button onClick={() => handleBanish('banish-card')}>Banish Field Card</button>
      <button onClick={() => handlePlayToField('hand-card', 'host')}>Play Hand Card to Field</button>
      <button onClick={() => handlePlayToField('equipment-play-card', 'host')}>Play Equipment to Field</button>
      <button onClick={() => handleExtractCard('evolve-search-card', 'field-host', 'host')}>Extract Evolve to Field</button>
      <button onClick={() => handleExtractCard('link-search-card', 'field-host', 'host')}>Extract Linked to Field</button>
      <button onClick={() => handleDragEnd(dragEvent('drag-evolve-card', 'field-host'))}>Drag Evolve to Field</button>
      <button onClick={() => handleDragEnd(dragEvent('drag-equipment-card', 'equipment-base-card'))}>Drag Equipment to Base</button>
      <button onClick={() => handleDragEnd(dragEvent('drag-equipment-card', 'equipment-base-evolved-card'))}>Drag Equipment to Evolved Base</button>
      <button onClick={() => handleDragEnd(dragEvent('drag-linked-card', 'link-base-card'))}>Drag Linked Card to Base</button>
      <button onClick={() => handleDragEnd(dragEvent('drag-linked-card', 'field-host'))}>Drag Linked Card to Field</button>
      <button onClick={() => handleDragEnd(dragEvent('attach-base-1', 'attach-base-2'))}>Attach Base 1 Under Base 2</button>
      <button onClick={() => confirmEvolveAutoAttachSelection('attach-base-1')}>Confirm Auto Attach Base 1</button>
      <button onClick={() => confirmEvolveAutoAttachSelection('attach-base-2')}>Confirm Auto Attach Base 2</button>
      <button onClick={cancelEvolveAutoAttachSelection}>Cancel Auto Attach</button>
      <button onClick={() => handleSendToCemetery('field-card')}>Send Field Card to Cemetery</button>
      <button onClick={() => handleSendToCemetery('guest-field-card')}>Send Guest Field Card to Cemetery</button>
      <button
        onClick={() => {
          const guestExCard = gameState.cards.find(card => card.zone === 'ex-guest');
          if (guestExCard) handleSendToCemetery(guestExCard.id);
        }}
      >
        Send First Guest EX Card to Cemetery
      </button>
      <button onClick={() => handleReturnEvolve('evolve-card')}>Return Evolve Card</button>
      <button onClick={() => handleShuffleDeck('host')}>Shuffle Host Deck</button>
      <button onClick={revealHand}>Reveal Hand</button>
      <button onClick={() => handleDeclareAttack('attacker-card', { type: 'leader', player: 'guest' }, 'host')}>Declare Attack to Guest Leader</button>
      <button onClick={() => handleSetRevealHandsMode(true)}>Enable Reveal Hands</button>
      <button onClick={() => handleSetRevealHandsMode(false)}>Disable Reveal Hands</button>
      <button
        onClick={() => spawnToken('host', {
          cardId: 'token-alpha',
          name: 'Alpha Token',
          image: '/token-alpha.png',
          baseCardType: 'follower',
        }, 'ex')}
      >
        Spawn Token to EX
      </button>
      <button
        onClick={() => spawnToken('host', {
          cardId: 'token-beta',
          name: 'Beta Token',
          image: '/token-beta.png',
          baseCardType: 'follower',
        }, 'field')}
      >
        Spawn Token to Field
      </button>
      <button
        onClick={() => spawnTokens('host', [
          {
            tokenOption: {
              cardId: 'token-alpha',
              name: 'Alpha Token',
              image: '/token-alpha.png',
              baseCardType: 'follower',
            },
            count: 2,
          },
          {
            tokenOption: {
              cardId: 'token-beta',
              name: 'Beta Token',
              image: '/token-beta.png',
              baseCardType: 'follower',
            },
            count: 1,
          },
        ], 'ex')}
      >
        Spawn Token Batch to EX
      </button>
      <button
        onClick={() => spawnTokens('guest', [
          {
            tokenOption: {
              cardId: 'token-alpha',
              name: 'Alpha Token',
              image: '/token-alpha.png',
              baseCardType: 'follower',
            },
            count: 2,
          },
        ], 'ex')}
      >
        Spawn Guest Token Batch to EX
      </button>
      <button
        onClick={() => spawnTokens('host', [{
          tokenOption: {
            cardId: 'token-alpha',
            name: 'Alpha Token',
            image: '/token-alpha.png',
            baseCardType: 'follower',
          },
          count: 1,
        }], 'ex')}
      >
        Spawn Single Token Batch to EX
      </button>
      <button
        onClick={() => spawnTokens('host', [{
          tokenOption: {
            cardId: 'token-alpha',
            name: 'Alpha Token',
            image: '/token-alpha.png',
            baseCardType: 'follower',
          },
          count: 0,
        }], 'ex')}
      >
        Spawn Zero Tokens
      </button>
    </div>
  );
}

const renderHarness = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <HookHarness />
  </MemoryRouter>
);

type SyncStateOverrides = Omit<Partial<SyncState>, 'host' | 'guest'> & {
  host?: Partial<SyncState['host']>;
  guest?: Partial<SyncState['guest']>;
};

const buildSyncState = (overrides: SyncStateOverrides = {}): SyncState => ({
  host: {
    hp: 20,
    pp: 0,
    maxPp: 0,
    ep: 0,
    sep: 1,
    combo: 0,
    initialHandDrawn: false,
    mulliganUsed: false,
    isReady: false,
    ...overrides.host,
  },
  guest: {
    hp: 20,
    pp: 0,
    maxPp: 0,
    ep: 3,
    sep: 1,
    combo: 0,
    initialHandDrawn: false,
    mulliganUsed: false,
    isReady: false,
    ...overrides.guest,
  },
  cards: overrides.cards ?? [],
  turnPlayer: overrides.turnPlayer ?? 'host',
  turnCount: overrides.turnCount ?? 1,
  phase: overrides.phase ?? 'Start',
  gameStatus: overrides.gameStatus ?? 'preparing',
  tokenOptions: overrides.tokenOptions ?? { host: [], guest: [] },
  revision: overrides.revision ?? 1,
  lastGameState: overrides.lastGameState,
  lastUndoableCardMoveActor: overrides.lastUndoableCardMoveActor ?? null,
  lastUndoableCardMoveState: overrides.lastUndoableCardMoveState ?? null,
  revealHandsMode: overrides.revealHandsMode ?? false,
  networkHasUndoableCardMove: overrides.networkHasUndoableCardMove,
});

const seedHostSavedSession = (overrides: SyncStateOverrides = {}) => {
  window.sessionStorage.setItem('sv-evolve:host-session:ROOM123', JSON.stringify({
    room: 'ROOM123',
    savedAt: '2026-03-19T10:00:00.000Z',
    appVersion: '0.0.0',
    state: buildSyncState(overrides),
  }));
};

const renderResumedHostHarness = (overrides: SyncStateOverrides = {}) => {
  seedHostSavedSession(overrides);
  renderHarness('/game?host=true&room=ROOM123');

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Resume Saved Session' }));
  });
};

const installMockFileReader = (result: string) => {
  const readAsText = vi.fn(function (this: { onload: null | ((event: { target: { result: string } }) => void) }) {
    this.onload?.({ target: { result } });
  });

  class MockFileReader {
    onload: null | ((event: { target: { result: string } }) => void) = null;
    readAsText = readAsText;
  }

  vi.stubGlobal('FileReader', MockFileReader);
  return readAsText;
};

const installMockCatalogFetch = (cards: Array<Record<string, unknown>>) => {
  const fetchMock = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(cards),
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const createCatalogCard = (overrides: Record<string, unknown>) => ({
  id: 'CARD-001',
  name: 'Catalog Card',
  image: '/catalog-card.png',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  ...overrides,
});

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

const connectHostWithGuestAndSpectator = (entry = '/game?host=true&room=ROOM123') => {
  renderHarness(entry);

  const peer = mockPeerJs.peers[0];
  act(() => {
    peer.emit('open');
  });

  const guestConn = mockPeerJs.createConnection('guest');
  const spectatorConn = mockPeerJs.createConnection('spectator', { connectionRole: 'spectator' });
  act(() => {
    peer.emit('connection', guestConn);
    guestConn.open = true;
    guestConn.emit('open');
    peer.emit('connection', spectatorConn);
    spectatorConn.open = true;
    spectatorConn.emit('open');
  });

  return { peer, guestConn, spectatorConn };
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

  it('enters waiting state when the host peer opens', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('status')).toHaveTextContent('Connected! Waiting for guest...');
  });

  it('starts connecting to the host when the guest peer opens', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    expect(peer.connect).toHaveBeenCalledWith('sv-evolve-ROOM123');
    expect(screen.getByTestId('connection-state')).toHaveTextContent('connecting');
    expect(screen.getByTestId('status')).toHaveTextContent('Connecting to host...');
  });

  it('ignores incoming peer connections on the guest side', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const rogueConn = mockPeerJs.createConnection('rogue-guest');
    act(() => {
      peer.emit('connection', rogueConn);
      rogueConn.open = true;
      rogueConn.emit('open');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('connecting');
    expect(screen.getByTestId('status')).toHaveTextContent('Connecting to host...');
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

  it('marks the host ready when a guest connection opens', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = mockPeerJs.createConnection('guest');
    act(() => {
      peer.emit('connection', conn);
      conn.open = true;
      conn.emit('open');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
    expect(screen.getByTestId('status')).toHaveTextContent('Guest connected! Game ready.');
  });

  it('connects spectators as read-only viewers without granting mutation access', () => {
    renderHarness('/game?spectator=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    expect(peer.connect).toHaveBeenCalledWith('sv-evolve-ROOM123', {
      metadata: { connectionRole: 'spectator' },
    });

    const conn = peer.connections[0];
    act(() => {
      conn.open = true;
      conn.emit('open');
    });

    expect(conn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'REQUEST_SNAPSHOT',
      lastKnownRevision: 0,
      source: 'guest',
    }));
    expect(screen.getByTestId('is-spectator')).toHaveTextContent('true');
    expect(screen.getByTestId('can-interact')).toHaveTextContent('false');
    expect(screen.getByTestId('can-view')).toHaveTextContent('true');

    act(() => {
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 12, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
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

    expect(screen.getByTestId('host-hp')).toHaveTextContent('12');
  });

  it('treats spectator=true as solo mode when mode=solo is present', () => {
    renderHarness('/game?mode=solo&spectator=true&room=ROOM123');

    expect(mockPeerJs.peers).toHaveLength(0);
    expect(screen.getByTestId('is-spectator')).toHaveTextContent('false');
    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
    expect(screen.getByTestId('status')).toHaveTextContent('Solo Mode');
    expect(screen.getByTestId('can-interact')).toHaveTextContent('true');
    expect(screen.getByTestId('can-view')).toHaveTextContent('true');
  });

  it('reconnects spectators with spectator metadata without granting interaction access', () => {
    renderHarness('/game?spectator=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const firstConn = peer.connections[0];
    act(() => {
      firstConn.open = true;
      firstConn.emit('open');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
    expect(screen.getByTestId('can-view')).toHaveTextContent('true');
    expect(screen.getByTestId('can-interact')).toHaveTextContent('false');

    act(() => {
      firstConn.emit('close');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('reconnecting');
    expect(screen.getByTestId('can-view')).toHaveTextContent('false');
    expect(screen.getByTestId('can-interact')).toHaveTextContent('false');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(peer.connect).toHaveBeenCalledTimes(2);
    expect(peer.connect).toHaveBeenLastCalledWith('sv-evolve-ROOM123', {
      metadata: { connectionRole: 'spectator' },
    });

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
    expect(screen.getByTestId('can-view')).toHaveTextContent('true');
    expect(screen.getByTestId('can-interact')).toHaveTextContent('false');
  });

  it('keeps the guest connection active when a spectator connects and mirrors host snapshots to both', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const guestConn = mockPeerJs.createConnection('guest');
    act(() => {
      peer.emit('connection', guestConn);
      guestConn.open = true;
      guestConn.emit('open');
    });

    const spectatorConn = mockPeerJs.createConnection('spectator', { connectionRole: 'spectator' });
    act(() => {
      peer.emit('connection', spectatorConn);
      spectatorConn.open = true;
      spectatorConn.emit('open');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
    expect(screen.getByTestId('status')).toHaveTextContent('Guest connected! Game ready.');

    guestConn.send.mockClear();
    spectatorConn.send.mockClear();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Spawn Token to EX' }));
    });

    expect(guestConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
    }));
    expect(spectatorConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
    }));
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('1');
  });

  it('responds to spectator snapshot requests without requiring a guest connection', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const spectatorConn = mockPeerJs.createConnection('spectator', { connectionRole: 'spectator' });
    act(() => {
      peer.emit('connection', spectatorConn);
      spectatorConn.open = true;
      spectatorConn.emit('data', {
        type: 'REQUEST_SNAPSHOT',
        lastKnownRevision: 0,
        source: 'guest',
      });
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('status')).toHaveTextContent('Connected! Waiting for guest...');
    expect(spectatorConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
    }));
  });

  it('responds to spectator snapshot requests without sending redundant snapshots to the guest', () => {
    const { guestConn, spectatorConn } = connectHostWithGuestAndSpectator();
    guestConn.send.mockClear();
    spectatorConn.send.mockClear();

    act(() => {
      spectatorConn.emit('data', {
        type: 'REQUEST_SNAPSHOT',
        lastKnownRevision: 0,
        source: 'guest',
      });
    });

    expect(guestConn.send).not.toHaveBeenCalled();
    expect(spectatorConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
    }));
  });

  it('responds to guest snapshot requests without sending redundant snapshots to the spectator', () => {
    const { guestConn, spectatorConn } = connectHostWithGuestAndSpectator();
    guestConn.send.mockClear();
    spectatorConn.send.mockClear();

    act(() => {
      guestConn.emit('data', {
        type: 'REQUEST_SNAPSHOT',
        lastKnownRevision: 0,
        source: 'guest',
      });
    });

    expect(guestConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
    }));
    expect(spectatorConn.send).not.toHaveBeenCalled();
  });

  it('replaces the previous spectator without replacing the guest connection', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const guestConn = mockPeerJs.createConnection('guest');
    const firstSpectatorConn = mockPeerJs.createConnection('spectator-1', { connectionRole: 'spectator' });
    const secondSpectatorConn = mockPeerJs.createConnection('spectator-2', { connectionRole: 'spectator' });
    act(() => {
      peer.emit('connection', guestConn);
      guestConn.open = true;
      guestConn.emit('open');
      peer.emit('connection', firstSpectatorConn);
      firstSpectatorConn.open = true;
      peer.emit('connection', secondSpectatorConn);
      secondSpectatorConn.open = true;
    });

    expect(firstSpectatorConn.close).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');

    guestConn.send.mockClear();
    firstSpectatorConn.send.mockClear();
    secondSpectatorConn.send.mockClear();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Spawn Token to EX' }));
    });

    expect(guestConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
    }));
    expect(firstSpectatorConn.send).not.toHaveBeenCalled();
    expect(secondSpectatorConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
    }));
  });

  it('ignores spectator events on the host side and does not treat spectator close as guest disconnect', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const guestConn = mockPeerJs.createConnection('guest');
    const spectatorConn = mockPeerJs.createConnection('spectator', { connectionRole: 'spectator' });
    act(() => {
      peer.emit('connection', guestConn);
      guestConn.open = true;
      guestConn.emit('open');
      peer.emit('connection', spectatorConn);
      spectatorConn.open = true;
      spectatorConn.emit('open');
      spectatorConn.emit('data', {
        type: 'EVENT',
        event: {
          id: 'spectator-event',
          type: 'MODIFY_PLAYER_STAT',
          actor: 'host',
          playerKey: 'host',
          stat: 'hp',
          delta: -5,
        },
      });
      spectatorConn.emit('close');
    });

    expect(screen.getByTestId('host-hp')).toHaveTextContent('20');
    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
    expect(screen.getByTestId('status')).toHaveTextContent('Guest connected! Game ready.');
  });

  it('treats metadata-less guest close as guest disconnect while keeping the spectator lane separate', () => {
    const { guestConn, spectatorConn } = connectHostWithGuestAndSpectator();

    act(() => {
      guestConn.emit('close');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('status')).toHaveTextContent('Guest disconnected. Waiting for reconnection...');

    guestConn.send.mockClear();
    spectatorConn.send.mockClear();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Spawn Token to EX' }));
    });

    expect(guestConn.send).not.toHaveBeenCalled();
    expect(spectatorConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
    }));
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('1');
  });

  it('does not replace the host ready status when the host receives a guest snapshot', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = mockPeerJs.createConnection('guest');
    act(() => {
      peer.emit('connection', conn);
      conn.open = true;
      conn.emit('open');
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'guest',
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

    expect(screen.getByTestId('status')).toHaveTextContent('Guest connected! Game ready.');
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
          cards: [{
            id: 'revealed-card-1',
            cardId: 'BP01-001',
            name: 'Aurelia',
            image: '/aurelia.png',
            zone: 'hand-host',
            owner: 'host',
            isTapped: false,
            isFlipped: false,
            counters: { atk: 0, hp: 0 },
          }],
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

  it('waits without reconnecting when the host reports a pending saved session', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = peer.connections[0];
    act(() => {
      conn.open = true;
      conn.emit('open');
      conn.emit('data', {
        type: 'WAITING_FOR_HOST_SESSION',
        source: 'host',
      });
      vi.advanceTimersByTime(7000);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('Host is choosing whether to resume the saved session. Waiting...');
    expect(peer.connect).toHaveBeenCalledTimes(1);
  });

  it('applies guest events on the host side', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = mockPeerJs.createConnection('guest');
    act(() => {
      peer.emit('connection', conn);
      conn.open = true;
      conn.emit('open');
      conn.emit('data', {
        type: 'EVENT',
        event: {
          type: 'MODIFY_PLAYER_STAT',
          actor: 'guest',
          playerKey: 'host',
          stat: 'hp',
          delta: -3,
        },
      });
    });

    expect(screen.getByTestId('host-hp')).toHaveTextContent('17');
  });

  it('ignores incoming events on the guest side', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = peer.connections[0];
    act(() => {
      conn.open = true;
      conn.emit('open');
      conn.emit('data', {
        type: 'EVENT',
        event: {
          type: 'MODIFY_PLAYER_STAT',
          actor: 'host',
          playerKey: 'host',
          stat: 'hp',
          delta: -3,
        },
      });
    });

    expect(screen.getByTestId('host-hp')).toHaveTextContent('20');
  });

  it('ignores WAITING_FOR_HOST_SESSION on the host side and keeps the current status', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = mockPeerJs.createConnection('guest');
    act(() => {
      peer.emit('connection', conn);
      conn.open = true;
      conn.emit('open');
      conn.emit('data', {
        type: 'WAITING_FOR_HOST_SESSION',
        source: 'guest',
      });
    });

    expect(screen.getByTestId('status')).toHaveTextContent('Guest connected! Game ready.');
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

  it('reconnects after a guest-side connection error', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = peer.connections[0];
    act(() => {
      conn.open = true;
      conn.emit('open');
      conn.emit('error');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('reconnecting');
    expect(screen.getByTestId('status')).toHaveTextContent('Connection error. Reconnecting...');
  });

  it('reconnects after a guest-side peer disconnect', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
      peer.emit('disconnected');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('reconnecting');
    expect(screen.getByTestId('status')).toHaveTextContent('Peer connection lost. Reconnecting...');
  });

  it('reconnects after a guest-side peer error', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
      peer.emit('error');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('reconnecting');
    expect(screen.getByTestId('status')).toHaveTextContent('Unable to reach host. Reconnecting...');
  });

  it('ignores a stale snapshot retry timer after the guest reconnects on a new connection', () => {
    renderHarness('/game?host=false&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const firstConn = peer.connections[0];
    act(() => {
      firstConn.open = true;
      firstConn.emit('open');
    });

    act(() => {
      firstConn.emit('close');
      vi.advanceTimersByTime(1000);
    });

    const secondConn = peer.connections[1];
    act(() => {
      secondConn.open = true;
      secondConn.emit('open');
    });

    const secondConnSendCount = secondConn.send.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(peer.connect).toHaveBeenCalledTimes(2);
    expect(secondConn.send).toHaveBeenCalledTimes(secondConnSendCount + 1);
    expect(screen.getByTestId('status')).toHaveTextContent('Waiting for host session restore... retrying sync.');
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

  it('accepts a same-revision host snapshot on the guest after initial sync', () => {
    renderHarness('/game?host=false&room=ROOM123');

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
          revision: 3,
        },
      });
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 14, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: [],
          turnPlayer: 'host',
          turnCount: 1,
          phase: 'Main',
          gameStatus: 'playing',
          tokenOptions: { host: [], guest: [] },
          revision: 3,
        },
      });
    });

    expect(screen.getByTestId('host-hp')).toHaveTextContent('14');
  });

  it('keeps guest Look Top work in progress during normal host snapshots', () => {
    const { conn } = connectGuest();

    const guestDeckCards = [
      {
        id: 'guest-top-1',
        cardId: 'BP01-001',
        name: 'Guest Top 1',
        image: '',
        zone: 'mainDeck-guest',
        owner: 'guest' as const,
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      },
      {
        id: 'guest-top-2',
        cardId: 'BP01-002',
        name: 'Guest Top 2',
        image: '',
        zone: 'mainDeck-guest',
        owner: 'guest' as const,
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      },
    ];

    act(() => {
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: guestDeckCards,
          turnPlayer: 'host',
          turnCount: 1,
          phase: 'Start',
          gameStatus: 'playing',
          tokenOptions: { host: [], guest: [] },
          revision: 2,
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guest Look Top 2' }));
    expect(screen.getByTestId('top-deck-count')).toHaveTextContent('2');

    act(() => {
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 19, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: guestDeckCards,
          turnPlayer: 'host',
          turnCount: 1,
          phase: 'Main',
          gameStatus: 'playing',
          tokenOptions: { host: [], guest: [] },
          revision: 3,
        },
      });
    });

    expect(screen.getByTestId('host-hp')).toHaveTextContent('19');
    expect(screen.getByTestId('top-deck-count')).toHaveTextContent('2');
  });

  it('closes guest Look Top work in progress when a host snapshot changes the target deck top', () => {
    const { conn } = connectGuest();

    const guestDeckCards = [
      {
        id: 'guest-top-1',
        cardId: 'BP01-001',
        name: 'Guest Top 1',
        image: '',
        zone: 'mainDeck-guest',
        owner: 'guest' as const,
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      },
      {
        id: 'guest-top-2',
        cardId: 'BP01-002',
        name: 'Guest Top 2',
        image: '',
        zone: 'mainDeck-guest',
        owner: 'guest' as const,
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      },
    ];

    act(() => {
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: guestDeckCards,
          turnPlayer: 'host',
          turnCount: 1,
          phase: 'Start',
          gameStatus: 'playing',
          tokenOptions: { host: [], guest: [] },
          revision: 2,
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guest Look Top 2' }));
    expect(screen.getByTestId('top-deck-count')).toHaveTextContent('2');

    act(() => {
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 19, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: [
            { ...guestDeckCards[0], zone: 'hand-guest' },
            { ...guestDeckCards[1], zone: 'cemetery-guest' },
            {
              id: 'guest-top-3',
              cardId: 'BP01-003',
              name: 'Guest Top 3',
              image: '',
              zone: 'mainDeck-guest',
              owner: 'guest' as const,
              isTapped: false,
              isFlipped: false,
              counters: { atk: 0, hp: 0 },
            },
            {
              id: 'guest-top-4',
              cardId: 'BP01-004',
              name: 'Guest Top 4',
              image: '',
              zone: 'mainDeck-guest',
              owner: 'guest' as const,
              isTapped: false,
              isFlipped: false,
              counters: { atk: 0, hp: 0 },
            },
          ],
          turnPlayer: 'host',
          turnCount: 1,
          phase: 'Main',
          gameStatus: 'playing',
          tokenOptions: { host: [], guest: [] },
          revision: 3,
        },
      });
    });

    expect(screen.getByTestId('host-hp')).toHaveTextContent('19');
    expect(screen.getByTestId('top-deck-count')).toHaveTextContent('0');
  });

  it('ignores stale host snapshots after the initial guest sync has completed', () => {
    renderHarness('/game?host=false&room=ROOM123');

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
          host: { hp: 13, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: [],
          turnPlayer: 'host',
          turnCount: 2,
          phase: 'Main',
          gameStatus: 'playing',
          tokenOptions: { host: [], guest: [] },
          revision: 4,
        },
      });
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
          revision: 3,
        },
      });
    });

    expect(screen.getByTestId('host-hp')).toHaveTextContent('13');
  });

  it('responds to snapshot requests as host and ignores stale connection closes', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'CARD-RESTORE',
        image: '/catalog-card.png',
      }),
    ]);

    seedHostSavedSession({
      cards: [
        {
          id: 'restorable-card',
          cardId: 'CARD-RESTORE',
          name: 'Catalog Card',
          image: '/catalog-card.png',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      lastGameState: buildSyncState({ revision: 41 }),
      lastUndoableCardMoveState: buildSyncState({ revision: 42 }),
      revision: 7,
      gameStatus: 'playing',
      turnCount: 3,
      phase: 'Main',
    });

    renderResumedHostHarness({
      cards: [
        {
          id: 'restorable-card',
          cardId: 'CARD-RESTORE',
          name: 'Catalog Card',
          image: '/catalog-card.png',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      lastGameState: buildSyncState({ revision: 41 }),
      lastUndoableCardMoveState: buildSyncState({ revision: 42 }),
      revision: 7,
      gameStatus: 'playing',
      turnCount: 3,
      phase: 'Main',
    });

    await act(async () => {});

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
    const snapshotCall = secondConn.send.mock.calls.find(([message]) => message?.type === 'STATE_SNAPSHOT');
    expect(snapshotCall?.[0]).toMatchObject({
      state: expect.objectContaining({
        lastGameState: null,
        lastUndoableCardMoveState: null,
        networkHasUndoableTurn: true,
        networkHasUndoableCardMove: true,
      }),
    });
    expect(snapshotCall?.[0]?.state?.cards?.[0]?.image).toBe('');
    expect(screen.getByTestId('status')).toHaveTextContent('Guest connected! Game ready.');
  });

  it('waits for the guest after a host-side connection error', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = mockPeerJs.createConnection('guest');
    act(() => {
      peer.emit('connection', conn);
      conn.open = true;
      conn.emit('open');
      conn.emit('error');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('status')).toHaveTextContent('Connection error. Waiting for guest...');
  });

  it('waits after a host-side peer disconnect', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
      peer.emit('disconnected');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('status')).toHaveTextContent('Disconnected from Peer server. Reopen room if needed.');
  });

  it('waits after a host-side peer error', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
      peer.emit('error');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('status')).toHaveTextContent('P2P error. Waiting for guest...');
  });

  it('coalesces deferred host snapshots and flushes only the newest state once the buffer clears', () => {
    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = mockPeerJs.createConnection('guest') as ReturnType<typeof mockPeerJs.createConnection> & {
      bufferSize?: number;
    };

    act(() => {
      peer.emit('connection', conn);
      conn.open = true;
      conn.emit('open');
    });

    conn.send.mockClear();
    conn.bufferSize = 1;

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Spawn Token to EX' }));
      fireEvent.click(screen.getByRole('button', { name: 'Spawn Token Batch to EX' }));
    });

    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('4');
    expect(conn.send).not.toHaveBeenCalled();

    act(() => {
      conn.bufferSize = 0;
      vi.advanceTimersByTime(50);
    });

    const snapshotCalls = conn.send.mock.calls
      .map(([message]) => message as SyncMessage)
      .filter((message): message is Extract<SyncMessage, { type: 'STATE_SNAPSHOT' }> => message.type === 'STATE_SNAPSHOT');

    expect(snapshotCalls).toHaveLength(1);
    expect(snapshotCalls[0].state.cards.filter((card) => card.zone === 'ex-host')).toHaveLength(4);
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
    expect(window.sessionStorage.getItem('sv-evolve:host-session:ROOM123')).toBeNull();

    unmount();

    renderHarness('/game?host=false&room=ROOM123');
    expect(screen.getByTestId('saved-session')).toHaveTextContent('none');
  });

  it('does not save a fresh host board as a resumable session', () => {
    renderHarness('/game?host=true&room=ROOM123');

    expect(screen.getByTestId('saved-session')).toHaveTextContent('none');
    expect(window.sessionStorage.getItem('sv-evolve:host-session:ROOM123')).toBeNull();
  });

  it('destroys the peer on unmount', () => {
    const { unmount } = renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    expect(peer.destroy).not.toHaveBeenCalled();

    unmount();

    expect(peer.destroy).toHaveBeenCalledTimes(1);
  });

  it('persists a meaningful host board after a local game change', () => {
    renderHarness('/game?host=true&room=ROOM123');

    expect(window.sessionStorage.getItem('sv-evolve:host-session:ROOM123')).toBeNull();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Spawn Token to EX' }));
    });

    const stored = JSON.parse(window.sessionStorage.getItem('sv-evolve:host-session:ROOM123') ?? '{}');
    expect(stored.room).toBe('ROOM123');
    expect(stored.appVersion).toBe('0.0.0');
    expect(stored.state.cards).toHaveLength(1);
    expect(stored.state.cards[0]?.zone).toBe('ex-host');
  });

  it('ignores a stored fresh host board when checking for a saved session candidate', () => {
    window.sessionStorage.setItem('sv-evolve:host-session:ROOM123', JSON.stringify({
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '0.0.0',
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
    }));

    renderHarness('/game?host=true&room=ROOM123');

    expect(screen.getByTestId('saved-session')).toHaveTextContent('none');
    expect(window.sessionStorage.getItem('sv-evolve:host-session:ROOM123')).toBeNull();
  });

  it('responds to guest snapshot requests with a waiting message while a saved session is pending', () => {
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

    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const conn = mockPeerJs.createConnection('guest');
    act(() => {
      peer.emit('connection', conn);
      conn.open = true;
      conn.emit('open');
      conn.emit('data', {
        type: 'REQUEST_SNAPSHOT',
        lastKnownRevision: 0,
        source: 'guest',
      });
    });

    expect(conn.send).toHaveBeenCalledWith({
      type: 'WAITING_FOR_HOST_SESSION',
      source: 'host',
    });
    expect(screen.getByTestId('status')).toHaveTextContent('Guest connected. Choose whether to resume the saved session.');
  });

  it('responds to spectator snapshot requests with a waiting message while a saved session is pending', () => {
    window.sessionStorage.setItem('sv-evolve:host-session:ROOM123', JSON.stringify({
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '0.0.0',
      state: buildSyncState({
        host: { hp: 11 },
        revision: 2,
      }),
    }));

    renderHarness('/game?host=true&room=ROOM123');

    const peer = mockPeerJs.peers[0];
    act(() => {
      peer.emit('open');
    });

    const spectatorConn = mockPeerJs.createConnection('spectator', { connectionRole: 'spectator' });
    act(() => {
      peer.emit('connection', spectatorConn);
      spectatorConn.open = true;
      spectatorConn.emit('data', {
        type: 'REQUEST_SNAPSHOT',
        lastKnownRevision: 0,
        source: 'guest',
      });
    });

    expect(spectatorConn.send).toHaveBeenCalledWith({
      type: 'WAITING_FOR_HOST_SESSION',
      source: 'host',
    });
    expect(screen.getByTestId('status')).toHaveTextContent('Guest connected. Choose whether to resume the saved session.');
  });

  it('sends restored host sessions to both guest and spectator connections', () => {
    seedHostSavedSession({
      host: { hp: 9 },
      gameStatus: 'playing',
      revision: 7,
    });

    const { guestConn, spectatorConn } = connectHostWithGuestAndSpectator();
    guestConn.send.mockClear();
    spectatorConn.send.mockClear();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Resume Saved Session' }));
    });

    expect(screen.getByTestId('host-hp')).toHaveTextContent('9');
    expect(guestConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
      state: expect.objectContaining({
        host: expect.objectContaining({ hp: 9 }),
      }),
    }));
    expect(spectatorConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
      state: expect.objectContaining({
        host: expect.objectContaining({ hp: 9 }),
      }),
    }));
  });

  it('sends fresh-state discards to both guest and spectator connections', () => {
    seedHostSavedSession({
      host: { hp: 9 },
      gameStatus: 'playing',
      revision: 7,
    });

    const { guestConn, spectatorConn } = connectHostWithGuestAndSpectator();
    guestConn.send.mockClear();
    spectatorConn.send.mockClear();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Discard Saved Session' }));
    });

    expect(screen.getByTestId('host-hp')).toHaveTextContent('20');
    expect(guestConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
      state: expect.objectContaining({
        host: expect.objectContaining({ hp: 20 }),
      }),
    }));
    expect(spectatorConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STATE_SNAPSHOT',
      source: 'host',
      state: expect.objectContaining({
        host: expect.objectContaining({ hp: 20 }),
      }),
    }));
  });

  it('keeps host-side turn undo available after ending the turn', () => {
    window.sessionStorage.setItem('sv-evolve:host-session:ROOM123', JSON.stringify({
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '0.0.0',
      state: {
        host: { hp: 20, pp: 1, maxPp: 1, ep: 0, sep: 1, combo: 0, initialHandDrawn: true, mulliganUsed: true, isReady: true },
        guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: true, mulliganUsed: true, isReady: true },
        cards: [],
        turnPlayer: 'host',
        turnCount: 2,
        phase: 'Main',
        gameStatus: 'playing',
        tokenOptions: { host: [], guest: [] },
        revision: 7,
      },
    }));

    renderHarness('/game?host=true&room=ROOM123');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Resume Saved Session' }));
    });

    expect(screen.getByTestId('can-undo-turn')).toHaveTextContent('false');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Host End Turn' }));
    });

    expect(screen.getByTestId('can-undo-turn')).toHaveTextContent('true');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo Turn' }));
    });

    expect(screen.getByTestId('can-undo-turn')).toHaveTextContent('false');
  });

  it('keeps host-side card-move undo available after a card draw', () => {
    window.sessionStorage.setItem('sv-evolve:host-session:ROOM123', JSON.stringify({
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '0.0.0',
      state: {
        host: { hp: 20, pp: 1, maxPp: 1, ep: 0, sep: 1, combo: 0, initialHandDrawn: true, mulliganUsed: true, isReady: true },
        guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: true, mulliganUsed: true, isReady: true },
        cards: [
          {
            id: 'deck-card-1',
            cardId: 'BP01-001',
            name: 'Deck Card',
            image: '',
            zone: 'mainDeck-host',
            owner: 'host',
            isTapped: false,
            isFlipped: true,
            counters: { atk: 0, hp: 0 },
          },
        ],
        turnPlayer: 'host',
        turnCount: 2,
        phase: 'Main',
        gameStatus: 'playing',
        tokenOptions: { host: [], guest: [] },
        revision: 7,
      },
    }));

    renderHarness('/game?host=true&room=ROOM123');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Resume Saved Session' }));
    });

    expect(screen.getByTestId('host-hand-count')).toHaveTextContent('0');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Host Draw' }));
    });

    expect(screen.getByTestId('host-hand-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));
    });

    expect(screen.getByTestId('host-hand-count')).toHaveTextContent('0');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');
  });

  it('moves the host deck top card to ex and supports undo', () => {
    window.sessionStorage.setItem('sv-evolve:host-session:ROOM123', JSON.stringify({
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '0.0.0',
      state: {
        host: { hp: 20, pp: 1, maxPp: 1, ep: 0, sep: 1, combo: 0, initialHandDrawn: true, mulliganUsed: true, isReady: true },
        guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: true, mulliganUsed: true, isReady: true },
        cards: [
          {
            id: 'deck-card-1',
            cardId: 'BP01-001',
            name: 'Deck Card',
            image: '',
            zone: 'mainDeck-host',
            owner: 'host',
            isTapped: false,
            isFlipped: true,
            counters: { atk: 0, hp: 0 },
          },
        ],
        turnPlayer: 'host',
        turnCount: 2,
        phase: 'Main',
        gameStatus: 'playing',
        tokenOptions: { host: [], guest: [] },
        revision: 7,
      },
    }));

    renderHarness('/game?host=true&room=ROOM123');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Resume Saved Session' }));
    });

    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Host Top to EX' }));
    });

    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');
    expect(screen.getByTestId('card-play-message')).toHaveTextContent('You moved Deck Card to EX Area');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));
    });

    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');
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

  it('mirrors host shared UI effects to both guest and spectator connections', () => {
    seedHostSavedSession({
      gameStatus: 'playing',
      revision: 7,
      cards: [
        {
          id: 'host-hand-1',
          cardId: 'BP01-001',
          name: 'Aurelia',
          image: '/aurelia.png',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
    });

    const { guestConn, spectatorConn } = connectHostWithGuestAndSpectator();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Resume Saved Session' }));
    });
    guestConn.send.mockClear();
    spectatorConn.send.mockClear();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Reveal Hand' }));
      vi.advanceTimersByTime(0);
    });

    expect(guestConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SHARED_UI_EFFECT',
      effect: expect.objectContaining({
        type: 'REVEAL_HAND_CARDS',
        actor: 'host',
      }),
    }));
    expect(spectatorConn.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SHARED_UI_EFFECT',
      effect: expect.objectContaining({
        type: 'REVEAL_HAND_CARDS',
        actor: 'host',
      }),
    }));
    expect(screen.getByTestId('revealed-overlay-title')).toHaveTextContent('You revealed cards from hand');
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

  it('shows attack declarations in the attack dialog and recent events', () => {
    const { conn } = connectGuest();

    act(() => {
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect: {
          type: 'ATTACK_DECLARED',
          actor: 'host',
          attackerCardId: 'attacker-1',
          attackerName: 'Knight',
          target: { type: 'leader', player: 'guest' },
        },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('attack-message')).toHaveTextContent('Opponent Knight attacks You Leader');
    expect(screen.getByTestId('event-history')).toHaveTextContent('Knight -> You Leader');
    expect(screen.getByTestId('card-play-message')).toHaveTextContent('none');
  });

  it('keeps attack logs while card-play notifications remain dialog-only', () => {
    const { conn } = connectGuest();

    act(() => {
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect: {
          type: 'ATTACK_DECLARED',
          actor: 'host',
          attackerCardId: 'attacker-1',
          attackerName: 'Knight',
          target: { type: 'leader', player: 'guest' },
        },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('event-history')).toHaveTextContent('Knight -> You Leader');

    act(() => {
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect: { type: 'CARD_PLAYED', actor: 'host', cardId: 'spell-1', cardName: 'Fire Chain', mode: 'play' },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('card-play-message')).toHaveTextContent('Opponent played Fire Chain');
    expect(screen.getByTestId('event-history')).toHaveTextContent('Knight -> You Leader');
    expect(screen.getByTestId('event-history')).not.toHaveTextContent('Opponent played Fire Chain');
  });

  it('merges look-top summary into the reveal overlay and logs only the summary entry', async () => {
    const { conn, peer } = connectGuest();

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
    });

    await act(async () => {});

    expect(screen.getByTestId('revealed-overlay-title')).toHaveTextContent('Opponent revealed from Look Top');
    expect(screen.getByTestId('revealed-overlay-summary')).toHaveTextContent('Revealed to Hand: Aurelia');
    expect(screen.getByTestId('revealed-overlay-summary')).toHaveTextContent('Bottom: 3');
    expect(screen.getByTestId('event-history')).toHaveTextContent('Opponent resolved Look Top 4');
    expect(screen.getByTestId('event-history')).toHaveTextContent('Revealed to Hand: Aurelia');
    expect(screen.getByTestId('event-history')).not.toHaveTextContent('Opponent revealed from Look Top');
    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
    expect(mockPeerJs.peers).toHaveLength(1);
    expect(peer.destroy).not.toHaveBeenCalled();
  });

  it('keeps the guest connected and shows the reveal overlay when Search reveal is piggybacked on a snapshot', () => {
    const { conn, peer } = connectGuest();

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
          gameStatus: 'playing',
          tokenOptions: { host: [], guest: [] },
          revision: 2,
        },
        pendingEffects: [{
          type: 'REVEAL_SEARCHED_CARD_TO_HAND',
          actor: 'host',
          cardIds: ['revealed-card-1'],
        }],
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('revealed-overlay-title')).toHaveTextContent('Opponent revealed from Search');
    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
    expect(mockPeerJs.peers).toHaveLength(1);
    expect(peer.destroy).not.toHaveBeenCalled();
  });

  it('shows revealed hand cards in the overlay and recent-event log', () => {
    const { conn } = connectGuest();

    act(() => {
      conn.emit('data', {
        type: 'SHARED_UI_EFFECT',
        effect: {
          type: 'REVEAL_HAND_CARDS',
          actor: 'host',
          cards: [
            { cardId: 'BP01-001', name: 'Aurelia', image: '' },
            { cardId: 'BP01-002', name: 'Quickblader', image: '' },
          ],
        },
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('revealed-overlay-title')).toHaveTextContent('Opponent revealed cards from hand');
    expect(screen.getByTestId('revealed-overlay-cards')).toHaveTextContent('Aurelia, Quickblader');
    expect(screen.getByTestId('event-history')).toHaveTextContent('Opponent revealed cards from hand: Aurelia, Quickblader');
  });

  it('sends the local p2p hand reveal and shows it to the revealer', () => {
    const { conn } = connectGuest();

    act(() => {
      conn.emit('data', {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: buildSyncState({
          gameStatus: 'playing',
          revision: 2,
          cards: [
            {
              id: 'guest-hand-1',
              cardId: 'BP01-001',
              name: 'Aurelia',
              image: '/aurelia.png',
              zone: 'hand-guest',
              owner: 'guest',
              isTapped: false,
              isFlipped: false,
              counters: { atk: 0, hp: 0 },
            },
          ],
        }),
      });
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Reveal Hand' }));
      vi.advanceTimersByTime(0);
    });

    expect(conn.send).toHaveBeenCalledWith({
      type: 'SHARED_UI_EFFECT',
      effect: {
        type: 'REVEAL_HAND_CARDS',
        actor: 'guest',
        cards: [
          {
            cardId: 'BP01-001',
            name: 'Aurelia',
            image: '',
          },
        ],
      },
    });
    expect(screen.getByTestId('revealed-overlay-title')).toHaveTextContent('You revealed cards from hand');
    expect(screen.getByTestId('revealed-overlay-cards')).toHaveTextContent('Aurelia');
    expect(screen.getByTestId('event-history')).toHaveTextContent('You revealed cards from hand: Aurelia');
    expect(screen.getByTestId('host-hand-count')).toHaveTextContent('0');
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

  it('spawns tokens to the ex area by default', () => {
    renderHarness('/game?mode=solo');

    fireEvent.click(screen.getByRole('button', { name: 'Spawn Token to EX' }));

    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');
  });

  it('can spawn tokens directly to the field when requested', () => {
    renderHarness('/game?mode=solo');

    fireEvent.click(screen.getByRole('button', { name: 'Spawn Token to Field' }));

    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
  });

  it('treats batch token generation as a single undoable move', () => {
    renderHarness('/game?mode=solo');

    fireEvent.click(screen.getByRole('button', { name: 'Spawn Token Batch to EX' }));

    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('3');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));

    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');
  });

  it('can undo a solo Player 2 token batch move', () => {
    renderHarness('/game?mode=solo');

    fireEvent.click(screen.getByRole('button', { name: 'Spawn Guest Token Batch to EX' }));

    expect(screen.getByTestId('guest-ex-count')).toHaveTextContent('2');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));

    expect(screen.getByTestId('guest-ex-count')).toHaveTextContent('0');
  });
});

describe('useGameBoardLogic action handlers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPeerJs.reset();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('blocks spectator action handlers from mutating state or sending events', () => {
    renderHarness('/game?spectator=true&room=ROOM123');

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
        state: buildSyncState({
          gameStatus: 'playing',
          revision: 2,
          cards: [
            {
              id: 'deck-card-1',
              cardId: 'BP01-001',
              name: 'Deck Card',
              image: '',
              zone: 'mainDeck-host',
              owner: 'host',
              isTapped: false,
              isFlipped: false,
              counters: { atk: 0, hp: 0 },
            },
            {
              id: 'counter-card',
              cardId: 'BP01-007',
              name: 'Counter Test',
              image: '',
              zone: 'field-host',
              owner: 'host',
              isTapped: false,
              isFlipped: false,
              counters: { atk: 1, hp: 0 },
              genericCounter: 2,
            },
            {
              id: 'tap-card',
              cardId: 'BP01-008',
              name: 'Tap Test',
              image: '',
              zone: 'field-host',
              owner: 'host',
              isTapped: false,
              isFlipped: false,
              counters: { atk: 0, hp: 0 },
            },
            {
              id: 'drag-card',
              cardId: 'BP01-009',
              name: 'Drag Test',
              image: '',
              zone: 'hand-host',
              owner: 'host',
              isTapped: false,
              isFlipped: false,
              counters: { atk: 0, hp: 0 },
            },
          ],
        }),
      });
    });

    conn.send.mockClear();

    expect(screen.getByTestId('can-interact')).toHaveTextContent('false');
    expect(screen.getByTestId('can-view')).toHaveTextContent('true');
    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-hand-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-hp')).toHaveTextContent('20');
    expect(screen.getByTestId('counter-card-atk')).toHaveTextContent('1');
    expect(screen.getByTestId('counter-card-generic')).toHaveTextContent('2');
    expect(screen.getByTestId('tap-card-state')).toHaveTextContent('false');
    expect(screen.getByTestId('game-status')).toHaveTextContent('playing');
    expect(screen.getByTestId('phase')).toHaveTextContent('Start');
    expect(screen.getByTestId('turn-player')).toHaveTextContent('host');
    expect(screen.getByTestId('host-ready')).toHaveTextContent('false');
    expect(screen.getByTestId('host-initial-hand-drawn')).toHaveTextContent('false');
    expect(screen.getByTestId('mulligan-open')).toHaveTextContent('false');
    expect(screen.getByTestId('mulligan-order')).toHaveTextContent('none');
    const turnMessageBeforeActions = screen.getByTestId('turn-message').textContent;

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Damage Host' }));
      fireEvent.click(screen.getByRole('button', { name: 'Set Phase End' }));
      fireEvent.click(screen.getByRole('button', { name: 'Host End Turn' }));
      fireEvent.click(screen.getByRole('button', { name: 'Set Guest First' }));
      fireEvent.click(screen.getByRole('button', { name: 'Toss Shared Coin' }));
      fireEvent.click(screen.getByRole('button', { name: 'Roll Shared Die' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
      fireEvent.click(screen.getByRole('button', { name: 'Toggle Host Ready' }));
      fireEvent.click(screen.getByRole('button', { name: 'Draw Host Initial Hand' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start Mulligan' }));
      fireEvent.click(screen.getByRole('button', { name: 'Select Mulligan Hand 1' }));
      fireEvent.click(screen.getByRole('button', { name: 'Execute Host Mulligan' }));
      fireEvent.click(screen.getByRole('button', { name: 'Host Draw' }));
      fireEvent.click(screen.getByRole('button', { name: 'Add ATK Counter' }));
      fireEvent.click(screen.getByRole('button', { name: 'Add Generic Counter' }));
      fireEvent.click(screen.getByRole('button', { name: 'Drag Card to EX' }));
      fireEvent.click(screen.getByRole('button', { name: 'Toggle Tap Stack' }));
      fireEvent.click(screen.getByRole('button', { name: 'Spawn Token to EX' }));
      fireEvent.click(screen.getByRole('button', { name: 'Reveal Hand' }));
    });

    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-hand-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-hp')).toHaveTextContent('20');
    expect(screen.getByTestId('counter-card-atk')).toHaveTextContent('1');
    expect(screen.getByTestId('counter-card-generic')).toHaveTextContent('2');
    expect(screen.getByTestId('tap-card-state')).toHaveTextContent('false');
    expect(screen.getByTestId('game-status')).toHaveTextContent('playing');
    expect(screen.getByTestId('phase')).toHaveTextContent('Start');
    expect(screen.getByTestId('turn-player')).toHaveTextContent('host');
    expect(screen.getByTestId('host-ready')).toHaveTextContent('false');
    expect(screen.getByTestId('host-initial-hand-drawn')).toHaveTextContent('false');
    expect(screen.getByTestId('mulligan-open')).toHaveTextContent('false');
    expect(screen.getByTestId('mulligan-order')).toHaveTextContent('none');
    expect(screen.getByTestId('revealed-overlay-title')).toHaveTextContent('none');
    expect(screen.getByTestId('turn-message')).toHaveTextContent(turnMessageBeforeActions ?? '');
    expect(conn.send).not.toHaveBeenCalled();
  });

  it('moves a field card to the cemetery and keeps the move undoable', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'field-card',
        cardId: 'BP01-001',
        name: 'Aurelia',
        image: '/aurelia.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-cemetery-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Send Field Card to Cemetery' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-cemetery-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-cemetery-count')).toHaveTextContent('0');
  });

  it('uses the Player 2 actor for solo Player 2 quick card moves', () => {
    renderHarness('/game?mode=solo');

    fireEvent.click(screen.getByRole('button', { name: 'Spawn Guest Token Batch to EX' }));

    expect(screen.getByTestId('guest-ex-count')).toHaveTextContent('2');
    expect(screen.getByTestId('guest-cemetery-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Send First Guest EX Card to Cemetery' }));

    expect(screen.getByTestId('guest-ex-count')).toHaveTextContent('1');
    expect(screen.getByTestId('guest-cemetery-count')).toHaveTextContent('0');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));

    expect(screen.getByTestId('guest-ex-count')).toHaveTextContent('2');
    expect(screen.getByTestId('guest-cemetery-count')).toHaveTextContent('0');
  });

  it('updates atk and generic counters without creating an undoable move', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'counter-card',
        cardId: 'BP01-007',
        name: 'Counter Test',
        image: '/counter-test.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 1, hp: 0 },
        genericCounter: 2,
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('counter-card-atk')).toHaveTextContent('1');
    expect(screen.getByTestId('counter-card-generic')).toHaveTextContent('2');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'Add ATK Counter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Generic Counter' }));

    expect(screen.getByTestId('counter-card-atk')).toHaveTextContent('3');
    expect(screen.getByTestId('counter-card-generic')).toHaveTextContent('3');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');
  });

  it('imports a deck through the upload handler using FileReader', () => {
    const readAsText = installMockFileReader(JSON.stringify({
      mainDeck: [{
        id: 'BP01-101',
        name: 'Main Deck Card',
        image: '/main-deck-card.png',
        deck_section: 'main',
        card_kind_normalized: 'follower',
        related_cards: [{ id: 'BP01-T01', name: 'Token A' }],
      }],
      evolveDeck: [{
        id: 'BP02-101',
        name: 'Evolve Card',
        image: '/evolve-card.png',
        deck_section: 'evolve',
        card_kind_normalized: 'follower',
        related_cards: [{ id: 'BP02-T01', name: 'Token B' }],
      }],
      leaderCards: [{
        id: 'BP00-101',
        name: 'Leader Card',
        image: '/leader-card.png',
        deck_section: 'leader',
        card_kind_normalized: 'leader',
        related_cards: [{ id: 'BP00-T01', name: 'Token C' }],
      }],
    }));

    renderHarness('/game?mode=solo');

    const input = screen.getByTestId('deck-upload-input');
    const file = new File(['{}'], 'deck.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(readAsText).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('1');
  });

  it('shows an alert when uploaded deck data cannot be parsed', () => {
    const readAsText = installMockFileReader('{invalid-json');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    renderHarness('/game?mode=solo');

    const input = screen.getByTestId('deck-upload-input');
    const file = new File(['{}'], 'broken.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(readAsText).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('deckBuilder.alerts.importFailed');
    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
  });

  it('moves a card to the ex area through drag end and keeps the move undoable', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'drag-card',
        cardId: 'BP01-008',
        name: 'Drag Test',
        image: '/drag-test.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Drag Card to EX' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');
  });

  it('treats a single token batch as a single undoable spawn token action', () => {
    renderHarness('/game?mode=solo');

    fireEvent.click(screen.getByRole('button', { name: 'Spawn Single Token Batch to EX' }));

    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));

    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');
  });

  it('toggles tap for the full attached stack', () => {
    renderResumedHostHarness({
      cards: [
        {
          id: 'tap-card',
          cardId: 'BP01-009',
          name: 'Tap Parent',
          image: '/tap-parent.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'tap-child',
          cardId: 'BP01-010',
          name: 'Tap Child',
          image: '/tap-child.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          attachedTo: 'tap-card',
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('tap-card-state')).toHaveTextContent('false');
    expect(screen.getByTestId('tap-child-state')).toHaveTextContent('false');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Tap Stack' }));

    expect(screen.getByTestId('tap-card-state')).toHaveTextContent('true');
    expect(screen.getByTestId('tap-child-state')).toHaveTextContent('true');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');
  });

  it('does nothing when spawnTokens is called with only zero counts', () => {
    renderHarness('/game?mode=solo');

    fireEvent.click(screen.getByRole('button', { name: 'Spawn Zero Tokens' }));

    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');
  });

  it('starts mulligan by clearing any local selection and opening the modal', () => {
    renderHarness('/game?mode=solo');

    fireEvent.click(screen.getByRole('button', { name: 'Select Mulligan Hand 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Mulligan Hand 2' }));
    expect(screen.getByTestId('mulligan-order')).toHaveTextContent('hand1,hand2');

    fireEvent.click(screen.getByRole('button', { name: 'Start Mulligan' }));

    expect(screen.getByTestId('mulligan-order')).toHaveTextContent('none');
    expect(screen.getByTestId('mulligan-open')).toHaveTextContent('true');
  });

  it('preserves the current mulligan selection behavior and closes after execution', () => {
    renderResumedHostHarness({
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
        { id: 'hand5', cardId: 'BP01-032', name: 'Hand5', image: '', zone: 'hand-host', owner: 'host', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
      ],
      host: {
        initialHandDrawn: true,
        mulliganUsed: false,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start Mulligan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Mulligan Hand 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Mulligan Hand 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Mulligan Hand 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Mulligan Hand 4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Mulligan Hand 5' }));

    expect(screen.getByTestId('mulligan-order')).toHaveTextContent('hand1,hand2,hand3,hand4,hand5');

    fireEvent.click(screen.getByRole('button', { name: 'Select Mulligan Hand 5' }));
    expect(screen.getByTestId('mulligan-order')).toHaveTextContent('hand1,hand2,hand3,hand4');

    fireEvent.click(screen.getByRole('button', { name: 'Execute Host Mulligan' }));

    expect(screen.getByTestId('mulligan-open')).toHaveTextContent('false');
    expect(screen.getByTestId('host-mulligan-used')).toHaveTextContent('true');
    expect(screen.getByTestId('host-hand-count')).toHaveTextContent('4');
  });

  it('returns an evolve card from the field to the evolve deck', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'evolve-card',
        cardId: 'BP02-001',
        name: 'Dragon Warrior',
        image: '/dragon-warrior.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: true,
        isFlipped: false,
        counters: { atk: 2, hp: 1 },
        genericCounter: 3,
        isEvolveCard: true,
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Return Evolve Card' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');
  });

  it('toggles the evolve deck usage flag for the selected evolve card', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'flip-card',
        cardId: 'BP02-010',
        name: 'Dragon Warrior',
        image: '/dragon-warrior.png',
        zone: 'evolveDeck-host',
        owner: 'host',
        isTapped: false,
        isFlipped: true,
        counters: { atk: 0, hp: 0 },
        isEvolveCard: true,
      }],
      gameStatus: 'preparing',
      revision: 7,
    });

    expect(screen.getByTestId('flip-card-state')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Evolve Usage' }));

    expect(screen.getByTestId('flip-card-state')).toHaveTextContent('false');
  });

  it('sends a field card to the bottom of the main deck', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'bottom-card',
        cardId: 'BP01-005',
        name: 'Aurelia',
        image: '/aurelia.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: true,
        isFlipped: false,
        counters: { atk: 3, hp: 2 },
        genericCounter: 1,
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Send Field Card to Bottom' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');
  });

  it('plays a hand card to the field and shows the local play notification', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'hand-card',
        cardId: 'BP01-003',
        name: 'Quickblader',
        image: '/quickblader.png',
        zone: 'hand-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-hand-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Play Hand Card to Field' }));

    expect(screen.getByTestId('host-hand-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('card-play-message')).toHaveTextContent('You played to field Quickblader');
    expect(screen.getByTestId('event-history')).not.toHaveTextContent('You played to field Quickblader');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');
  });

  it('keeps the existing evolve-deck placement behavior when no auto-attach target is on the field', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [{
        id: 'evolve-search-card',
        cardId: 'EVO-001',
        name: 'Base Follower',
        image: '/base-follower-evo.png',
        zone: 'evolveDeck-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
        isEvolveCard: true,
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Extract Evolve to Field' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('evolve-search-attached-to')).toHaveTextContent('none');
  });

  it('auto-attaches an evolve card from search when a single related field card is present', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'evolve-search-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Extract Evolve to Field' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('2');
    expect(screen.getByTestId('evolve-search-attached-to')).toHaveTextContent('attach-base-1');
  });

  it('ignores field cards that are already evolved when auto-attaching from search', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'evolve-search-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'attach-base-1-evolved',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
          attachedTo: 'attach-base-1',
        },
        {
          id: 'attach-base-2',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Extract Evolve to Field' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('4');
    expect(screen.getByTestId('evolve-search-attached-to')).toHaveTextContent('attach-base-2');
  });

  it('offers selection when exact and reprint targets both match and attaches the chosen card', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({ id: 'BASE-SP', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
      createCatalogCard({
        id: 'EVO-SP',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-SP', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'evolve-search-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'attach-base-2',
          cardId: 'BASE-SP',
          name: 'Base Follower',
          image: '/base-follower-sp.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Extract Evolve to Field' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('2');
    expect(screen.getByTestId('auto-attach-selection-source')).toHaveTextContent('evolve-search-card');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Auto Attach Base 2' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('3');
    expect(screen.getByTestId('evolve-search-attached-to')).toHaveTextContent('attach-base-2');
  });

  it('re-resolves auto-attach candidates while the selection is open and cancels invalid confirmations', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({ id: 'BASE-SP', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
      createCatalogCard({
        id: 'EVO-SP',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-SP', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'evolve-search-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'attach-base-2',
          cardId: 'BASE-SP',
          name: 'Base Follower',
          image: '/base-follower-sp.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 8,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Extract Evolve to Field' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('2');
    expect(screen.getByTestId('auto-attach-selection-targets')).toHaveTextContent('attach-base-1,attach-base-2');

    fireEvent.click(screen.getByRole('button', { name: 'Attach Base 1 Under Base 2' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('1');
    expect(screen.getByTestId('auto-attach-selection-targets')).toHaveTextContent('attach-base-2');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Auto Attach Base 1' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('1');
    expect(screen.getByTestId('evolve-search-attached-to')).toHaveTextContent('none');
  });

  it('auto-attaches an evolve card when dragged from the evolve deck onto an empty field zone', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-evolve-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Drag Evolve to Field' }));

    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('2');
    expect(screen.getByTestId('drag-evolve-attached-to')).toHaveTextContent('attach-base-1');
    expect(screen.getByTestId('drag-evolve-tapped')).toHaveTextContent('true');
  });

  it('keeps the existing placement behavior for special link cards when no target is on the field', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Vanguard Unit' }),
      createCatalogCard({
        id: 'DRIVE-001',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
    ]);

    renderResumedHostHarness({
      cards: [{
        id: 'link-search-card',
        cardId: 'DRIVE-001',
        name: 'ドライブポイント',
        image: '/drive-point.png',
        zone: 'evolveDeck-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
        isEvolveCard: true,
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Extract Linked to Field' }));

    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('link-search-linked-to')).toHaveTextContent('none');
    expect(screen.getByTestId('link-search-zone')).toHaveTextContent('field-host');
  });

  it('keeps token equipment play-to-field behavior without auto-linking it', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'EQUIP-001',
        name: 'アメスアミュレット',
        deck_section: 'token',
        card_kind_normalized: 'token_equipment',
      }),
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Follower',
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'equipment-play-card',
          cardId: 'EQUIP-001',
          name: 'アメスアミュレット',
          image: '/equip.png',
          zone: 'ex-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isTokenCard: true,
          baseCardType: 'amulet',
        },
        {
          id: 'equipment-base-card',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Play Equipment to Field' }));

    expect(screen.getByTestId('equipment-play-zone')).toHaveTextContent('field-host');
    expect(screen.getByTestId('equipment-play-linked-to')).toHaveTextContent('none');
  });

  it('auto-links a special card from search when a single related field card is present', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Vanguard Unit',
        related_cards: [{ id: 'DRIVE-001', name: 'ドライブポイント' }],
      }),
      createCatalogCard({
        id: 'DRIVE-001',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'link-search-card',
          cardId: 'DRIVE-001',
          name: 'ドライブポイント',
          image: '/drive-point.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'link-base-1',
          cardId: 'BASE-001',
          name: 'Base Vanguard Unit',
          image: '/base-vanguard-unit.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Extract Linked to Field' }));

    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('2');
    expect(screen.getByTestId('link-search-linked-to')).toHaveTextContent('link-base-1');
    expect(screen.getByTestId('link-search-zone')).toHaveTextContent('field-host');
  });

  it('offers selection for special link cards and links the chosen target', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Vanguard Unit',
        related_cards: [{ id: 'DRIVE-001', name: 'ドライブポイント' }],
      }),
      createCatalogCard({
        id: 'BASE-002',
        name: 'Base Vanguard Unit 2',
        related_cards: [{ id: 'DRIVE-001', name: 'ドライブポイント' }],
      }),
      createCatalogCard({
        id: 'DRIVE-001',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-linked-card',
          cardId: 'DRIVE-001',
          name: 'ドライブポイント',
          image: '/drive-point.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Vanguard Unit',
          image: '/base-vanguard-unit.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'attach-base-2',
          cardId: 'BASE-002',
          name: 'Base Vanguard Unit 2',
          image: '/base-vanguard-unit-2.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Drag Linked Card to Field' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('2');
    expect(screen.getByTestId('auto-attach-selection-source')).toHaveTextContent('drag-linked-card');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Auto Attach Base 2' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('drag-linked-linked-to')).toHaveTextContent('attach-base-2');
    expect(screen.getByTestId('drag-linked-zone')).toHaveTextContent('field-host');
  });

  it('links token equipment to a follower when manually dragged from ex', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'EQUIP-001',
        name: 'アメスアミュレット',
        deck_section: 'token',
        card_kind_normalized: 'token_equipment',
      }),
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Follower',
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-equipment-card',
          cardId: 'EQUIP-001',
          name: 'アメスアミュレット',
          image: '/equip.png',
          zone: 'ex-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isTokenCard: true,
          baseCardType: 'amulet',
        },
        {
          id: 'equipment-base-card',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Drag Equipment to Base' }));

    expect(screen.getByTestId('drag-equipment-zone')).toHaveTextContent('field-host');
    expect(screen.getByTestId('drag-equipment-linked-to')).toHaveTextContent('equipment-base-card');
  });

  it('links token equipment even before the card catalog fetch resolves', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-equipment-card',
          cardId: 'EQUIP-001',
          name: 'アメスアミュレット',
          image: '/equip.png',
          zone: 'ex-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isTokenCard: true,
          baseCardType: 'amulet',
          cardKindNormalized: 'token_equipment',
        },
        {
          id: 'equipment-base-card',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          baseCardType: 'follower',
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Drag Equipment to Base' }));

    expect(screen.getByTestId('drag-equipment-zone')).toHaveTextContent('field-host');
    expect(screen.getByTestId('drag-equipment-linked-to')).toHaveTextContent('equipment-base-card');
  });

  it('links token equipment to the root follower when dropped onto an evolved unit', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'EQUIP-001',
        name: 'アメスアミュレット',
        deck_section: 'token',
        card_kind_normalized: 'token_equipment',
      }),
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Follower',
      }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-equipment-card',
          cardId: 'EQUIP-001',
          name: 'アメスアミュレット',
          image: '/equip.png',
          zone: 'ex-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isTokenCard: true,
          baseCardType: 'amulet',
        },
        {
          id: 'equipment-base-card',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'equipment-base-evolved-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          attachedTo: 'equipment-base-card',
          isEvolveCard: true,
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Drag Equipment to Evolved Base' }));

    expect(screen.getByTestId('drag-equipment-zone')).toHaveTextContent('field-host');
    expect(screen.getByTestId('drag-equipment-linked-to')).toHaveTextContent('equipment-base-card');
  });

  it('links a special card by manual drag and clears the link when moved back to the field', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'VG-DRIVE-001',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Follower',
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-linked-card',
          cardId: 'VG-DRIVE-001',
          name: 'ドライブポイント',
          image: '/drive-point.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'link-base-card',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Drag Linked Card to Base' }));

    expect(screen.getByTestId('drag-linked-linked-to')).toHaveTextContent('link-base-card');
    expect(screen.getByTestId('drag-linked-zone')).toHaveTextContent('field-host');
    expect(screen.getByTestId('drag-linked-tapped')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Drag Linked Card to Field' }));

    expect(screen.getByTestId('drag-linked-linked-to')).toHaveTextContent('none');
    expect(screen.getByTestId('drag-linked-zone')).toHaveTextContent('field-host');
  });

  it('moves a field card to banish', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'banish-card',
        cardId: 'BP01-006',
        name: 'Bellringer Angel',
        image: '/bellringer-angel.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-banish-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Banish Field Card' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-banish-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');
  });

  it('shuffles the host deck and shows the shared notification without creating an undoable move', () => {
    renderResumedHostHarness({
      cards: [
        {
          id: 'deck-card-1',
          cardId: 'BP01-001',
          name: 'Aurelia',
          image: '/aurelia.png',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'deck-card-2',
          cardId: 'BP01-002',
          name: 'Bellringer Angel',
          image: '/bellringer-angel.png',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('2');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'Shuffle Host Deck' }));

    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('2');
    expect(screen.getByTestId('card-play-message')).toHaveTextContent('You shuffled the deck');
    expect(screen.getByTestId('event-history')).toHaveTextContent('You shuffled the deck');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');
  });

  it('declares an attack against the guest leader and records the attack history', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'attacker-card',
        cardId: 'BP01-004',
        name: 'Knight',
        image: '/knight.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      }],
      gameStatus: 'playing',
      turnPlayer: 'host',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Declare Attack to Guest Leader' }));

    expect(screen.getByTestId('attack-message')).toHaveTextContent('You Knight attacks Opponent Leader');
    expect(screen.getByTestId('event-history')).toHaveTextContent('Knight -> Opponent Leader');
    expect(screen.getByTestId('card-play-message')).toHaveTextContent('none');
  });

  it('toggles reveal hands mode on and off for the host state', () => {
    renderResumedHostHarness({
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('reveal-hands-mode')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'Enable Reveal Hands' }));
    expect(screen.getByTestId('reveal-hands-mode')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Disable Reveal Hands' }));
    expect(screen.getByTestId('reveal-hands-mode')).toHaveTextContent('false');
  });
});
