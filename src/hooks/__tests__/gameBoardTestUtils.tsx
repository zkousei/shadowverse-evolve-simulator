/* eslint-disable react-refresh/only-export-components */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';
import type { CardInstance } from '../../components/Card';
import * as PeerJsModule from 'peerjs';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import type { SyncState } from '../../types/game';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { loadCardCatalog } from '../../utils/cardCatalog';
import { useGameBoardLogic } from '../useGameBoardLogic';

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

vi.mock('../../utils/cardCatalog', () => ({
  loadCardCatalog: vi.fn(),
}));

export const dragEvent = (activeId: string, overId: string): DragEndEvent => (
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
export const mockPeerJs = (PeerJsModule as unknown as {
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
export const mockLoadCardCatalog = vi.mocked(loadCardCatalog);

export function HookHarness() {
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
      <div data-testid="host-hand-count">{gameState.cards.filter((card: CardInstance) => card.zone === 'hand-host').length}</div>
      <div data-testid="host-ex-count">{gameState.cards.filter((card: CardInstance) => card.zone === 'ex-host').length}</div>
      <div data-testid="host-field-count">{gameState.cards.filter((card: CardInstance) => card.zone === 'field-host').length}</div>
      <div data-testid="guest-ex-count">{gameState.cards.filter((card: CardInstance) => card.zone === 'ex-guest').length}</div>
      <div data-testid="guest-field-count">{gameState.cards.filter((card: CardInstance) => card.zone === 'field-guest').length}</div>
      <div data-testid="guest-cemetery-count">{gameState.cards.filter((card: CardInstance) => card.zone === 'cemetery-guest').length}</div>
      <div data-testid="host-cemetery-count">{gameState.cards.filter((card: CardInstance) => card.zone === 'cemetery-host').length}</div>
      <div data-testid="host-banish-count">{gameState.cards.filter((card: CardInstance) => card.zone === 'banish-host').length}</div>
      <div data-testid="host-evolve-count">{gameState.cards.filter((card: CardInstance) => card.zone === 'evolveDeck-host').length}</div>
      <div data-testid="host-main-deck-count">{gameState.cards.filter((card: CardInstance) => card.zone === 'mainDeck-host').length}</div>
      <div data-testid="host-mulligan-used">{String(gameState.host.mulliganUsed)}</div>
      <div data-testid="counter-card-atk">{String(gameState.cards.find((card: CardInstance) => card.id === 'counter-card')?.counters.atk ?? 'missing')}</div>
      <div data-testid="counter-card-generic">{String(gameState.cards.find((card: CardInstance) => card.id === 'counter-card')?.genericCounter ?? 'missing')}</div>
      <div data-testid="tap-card-state">{String(gameState.cards.find((card: CardInstance) => card.id === 'tap-card')?.isTapped ?? 'missing')}</div>
      <div data-testid="tap-child-state">{String(gameState.cards.find((card: CardInstance) => card.id === 'tap-child')?.isTapped ?? 'missing')}</div>
      <div data-testid="flip-card-state">{String(gameState.cards.find((card: CardInstance) => card.id === 'flip-card')?.isFlipped ?? 'missing')}</div>
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
      <div data-testid="revealed-overlay-cards">{revealedCardsOverlay?.cards.map((card: { name: string }) => card.name).join(', ') || 'none'}</div>
      <div data-testid="revealed-overlay-summary">{revealedCardsOverlay?.summaryLines?.join(' || ') ?? 'none'}</div>
      <div data-testid="saved-session">{savedSessionCandidate ? savedSessionCandidate.room : 'none'}</div>
      <div data-testid="auto-attach-selection-count">{String(evolveAutoAttachSelection?.candidateCards.length ?? 0)}</div>
      <div data-testid="auto-attach-selection-source">{evolveAutoAttachSelection?.sourceCard.id ?? 'none'}</div>
      <div data-testid="auto-attach-selection-targets">{evolveAutoAttachSelection?.candidateCards.map((card: CardInstance) => card.id).join(',') ?? 'none'}</div>
      <div data-testid="evolve-search-attached-to">{gameState.cards.find((card: CardInstance) => card.id === 'evolve-search-card')?.attachedTo ?? 'none'}</div>
      <div data-testid="evolve-search-tapped">{String(gameState.cards.find((card: CardInstance) => card.id === 'evolve-search-card')?.isTapped ?? 'missing')}</div>
      <div data-testid="drag-evolve-attached-to">{gameState.cards.find((card: CardInstance) => card.id === 'drag-evolve-card')?.attachedTo ?? 'none'}</div>
      <div data-testid="drag-evolve-tapped">{String(gameState.cards.find((card: CardInstance) => card.id === 'drag-evolve-card')?.isTapped ?? 'missing')}</div>
      <div data-testid="equipment-play-linked-to">{gameState.cards.find((card: CardInstance) => card.id === 'equipment-play-card')?.linkedTo ?? 'none'}</div>
      <div data-testid="equipment-play-zone">{gameState.cards.find((card: CardInstance) => card.id === 'equipment-play-card')?.zone ?? 'none'}</div>
      <div data-testid="drag-equipment-linked-to">{gameState.cards.find((card: CardInstance) => card.id === 'drag-equipment-card')?.linkedTo ?? 'none'}</div>
      <div data-testid="drag-equipment-zone">{gameState.cards.find((card: CardInstance) => card.id === 'drag-equipment-card')?.zone ?? 'none'}</div>
      <div data-testid="link-search-linked-to">{gameState.cards.find((card: CardInstance) => card.id === 'link-search-card')?.linkedTo ?? 'none'}</div>
      <div data-testid="link-search-zone">{gameState.cards.find((card: CardInstance) => card.id === 'link-search-card')?.zone ?? 'none'}</div>
      <div data-testid="drag-linked-linked-to">{gameState.cards.find((card: CardInstance) => card.id === 'drag-linked-card')?.linkedTo ?? 'none'}</div>
      <div data-testid="drag-linked-zone">{gameState.cards.find((card: CardInstance) => card.id === 'drag-linked-card')?.zone ?? 'none'}</div>
      <div data-testid="drag-linked-tapped">{String(gameState.cards.find((card: CardInstance) => card.id === 'drag-linked-card')?.isTapped ?? 'missing')}</div>
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

export const renderHarness = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <HookHarness />
  </MemoryRouter>
);

export type SyncStateOverrides = Omit<Partial<SyncState>, 'host' | 'guest'> & {
  host?: Partial<SyncState['host']>;
  guest?: Partial<SyncState['guest']>;
};

export const buildSyncState = (overrides: SyncStateOverrides = {}): SyncState => ({
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
  endStop: overrides.endStop ?? { host: false, guest: false },
  revision: overrides.revision ?? 1,
  lastGameState: overrides.lastGameState,
  lastUndoableCardMoveActor: overrides.lastUndoableCardMoveActor ?? null,
  lastUndoableCardMoveState: overrides.lastUndoableCardMoveState ?? null,
  revealHandsMode: overrides.revealHandsMode ?? false,
  networkHasUndoableCardMove: overrides.networkHasUndoableCardMove,
});

export const seedHostSavedSession = (overrides: SyncStateOverrides = {}) => {
  window.sessionStorage.setItem('sv-evolve:host-session:ROOM123', JSON.stringify({
    room: 'ROOM123',
    savedAt: '2026-03-19T10:00:00.000Z',
    appVersion: '0.0.0',
    state: buildSyncState(overrides),
  }));
};

export const renderResumedHostHarness = (overrides: SyncStateOverrides = {}) => {
  seedHostSavedSession(overrides);
  renderHarness('/game?host=true&room=ROOM123');

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Resume Saved Session' }));
  });
};

export const installMockFileReader = (result: string) => {
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

export const installMockCatalogFetch = (cards: DeckBuilderCardData[]) => {
  mockLoadCardCatalog.mockResolvedValue(cards as Awaited<ReturnType<typeof loadCardCatalog>>);
  return mockLoadCardCatalog;
};

export const flushCatalogEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

export const createCatalogCard = (overrides: Partial<DeckBuilderCardData>): DeckBuilderCardData => ({
  id: 'CARD-001',
  name: 'Catalog Card',
  image: '/catalog-card.png',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  ...overrides,
});

export const connectGuest = (entry = '/game?host=false&room=ROOM123') => {
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

export const connectHostWithGuestAndSpectator = (entry = '/game?host=true&room=ROOM123') => {
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

beforeEach(() => {
  mockLoadCardCatalog.mockReset();
  mockLoadCardCatalog.mockReturnValue(new Promise(() => { }) as ReturnType<typeof loadCardCatalog>);
});
