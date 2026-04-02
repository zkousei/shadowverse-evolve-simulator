import { initialState, type SyncState } from '../types/game';
import type { GameSyncEvent } from '../types/sync';
import * as CardLogic from './cardLogic';
import { canImportDeck, isHandCardMovementLocked } from './gameRules';
import { canDeclareAttack } from './attackUi';

type EventRequester = GameSyncEvent['actor'];

const bumpRevision = (state: SyncState): SyncState => ({
  ...state,
  revision: state.revision + 1,
});

const createReducerStateSnapshot = (
  state: SyncState
): NonNullable<SyncState['lastGameState']> => {
  const {
    lastGameState: _lastGameState,
    lastUndoableCardMoveState: _lastUndoableCardMoveState,
    lastUndoableCardMoveActor: _lastUndoableCardMoveActor,
    ...rest
  } = state;

  return {
  ...rest,
  host: { ...state.host },
  guest: { ...state.guest },
  cards: state.cards.map(card => ({ ...card })),
  tokenOptions: {
    host: state.tokenOptions.host.map(option => ({ ...option })),
    guest: state.tokenOptions.guest.map(option => ({ ...option })),
  },
  // Reducer-side checkpoints must stay flat. If we copy nested undo/turn
  // backups into every snapshot, the authoritative STATE_SNAPSHOT balloons
  // on card moves/look-top resolution and can overwhelm the WebRTC channel.
  };
};

const withCardMoveCheckpoint = (
  state: SyncState,
  actor: GameSyncEvent['actor'],
  nextCards: SyncState['cards']
): SyncState => bumpRevision({
  ...state,
  cards: nextCards,
  // Card-move undo is reducer-owned and actor-scoped. Clients only request an
  // undo; they never send back the state to restore.
  lastUndoableCardMoveState: createReducerStateSnapshot(state),
  lastUndoableCardMoveActor: actor,
});

const isHostRequester = (requester: EventRequester): boolean => requester === 'host';

const isActorRequester = (
  requester: EventRequester,
  actor: GameSyncEvent['actor']
): boolean => requester === actor;

const isPreparingEvolveDeckMoveBlocked = (
  state: SyncState,
  cardId: string
): boolean => {
  if (state.gameStatus !== 'preparing') return false;
  const card = state.cards.find(c => c.id === cardId);
  return card?.zone.startsWith('evolveDeck-') ?? false;
};

const isPreparingMainDeckDragBlocked = (
  state: SyncState,
  cardId: string
): boolean => {
  if (state.gameStatus !== 'preparing') return false;
  const card = state.cards.find(c => c.id === cardId);
  return card?.zone.startsWith('mainDeck-') ?? false;
};

const canToggleEvolveDeckUsage = (
  state: SyncState,
  actor: GameSyncEvent['actor'],
  cardId: string
): boolean => {
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return false;
  return card.owner === actor && card.zone === `evolveDeck-${actor}` && card.isEvolveCard === true;
};

const isPreparingMainDeckFieldSet = (
  state: SyncState,
  actor: GameSyncEvent['actor'],
  cardId: string,
  destination?: string
): boolean => {
  if (state.gameStatus !== 'preparing') return false;
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return false;
  return card.zone === `mainDeck-${actor}` && destination === `field-${actor}`;
};

const isPreparingHandMovementBlocked = (
  state: SyncState,
  cardId: string
): boolean => {
  if (!isHandCardMovementLocked(state)) return false;
  const card = state.cards.find(c => c.id === cardId);
  return card?.zone.startsWith('hand-') ?? false;
};

export const applyGameSyncEvent = (
  state: SyncState,
  event: GameSyncEvent,
  requester: EventRequester = event.actor
): SyncState => {
  switch (event.type) {
    case 'FLIP_SHARED_COIN':
    case 'ROLL_SHARED_DIE':
      return state;

    case 'TOGGLE_READY':
      if (!isActorRequester(requester, event.actor)) return state;
      return bumpRevision({
        ...state,
        [event.actor]: {
          ...state[event.actor],
          isReady: !state[event.actor].isReady,
        },
      });

    case 'SET_PHASE':
      if (!isActorRequester(requester, event.actor)) return state;
      if (state.gameStatus !== 'playing') return state;
      if (state.turnPlayer !== event.actor) return state;
      return bumpRevision({
        ...state,
        phase: event.phase,
      });

    case 'SET_REVEAL_HANDS_MODE':
      if (requester !== 'host') return state;
      return bumpRevision({
        ...state,
        revealHandsMode: event.enabled,
      });

    case 'END_TURN': {
      if (!isActorRequester(requester, event.actor)) return state;
      if (state.gameStatus !== 'playing') return state;
      if (state.turnPlayer !== event.actor) return state;

      const nextPlayer = state.turnPlayer === 'host' ? 'guest' : 'host';
      const isNewTurnRound = nextPlayer === 'host';
      const newTurnCount = isNewTurnRound ? state.turnCount + 1 : state.turnCount;
      const nextPlayerState = { ...state[nextPlayer] };

      if (nextPlayerState.maxPp < 10) nextPlayerState.maxPp += 1;
      nextPlayerState.pp = nextPlayerState.maxPp;
      nextPlayerState.combo = 0;

      const untapCards = state.cards.map(c =>
        c.isTapped && c.zone === `field-${nextPlayer}` ? { ...c, isTapped: false } : c
      );

      const finalCards = CardLogic.drawCard(untapCards, nextPlayer);

      const stateBackup: SyncState = { 
        ...state, 
        lastGameState: null,
        lastUndoableCardMoveState: null,
        lastUndoableCardMoveActor: null,
        cards: [...state.cards].map(c => ({ ...c })) // Deep copy cards at least
      };
      
      return bumpRevision({
        ...state,
        turnPlayer: nextPlayer,
        turnCount: newTurnCount,
        phase: 'Start',
        [nextPlayer]: nextPlayerState,
        cards: finalCards,
        lastGameState: stateBackup,
        lastUndoableCardMoveState: null,
        lastUndoableCardMoveActor: null,
      });
    }

    case 'START_GAME': {
      if (!isHostRequester(requester)) return state;
      const starter = state.turnPlayer;
      return bumpRevision({
        ...state,
        gameStatus: 'playing',
        cards: state.cards.map(card => card.zone.startsWith('field-') ? { ...card, isFlipped: false } : card),
        [starter]: { ...state[starter], pp: 1, maxPp: 1 },
        lastGameState: null,
        lastUndoableCardMoveState: null,
        lastUndoableCardMoveActor: null,
      });
    }

    case 'RESET_GAME': {
      if (!isHostRequester(requester)) return state;
      // Reset Game returns the board to a fresh room state but intentionally
      // keeps token options so imported/custom token presets survive the reset.
      const resetCards = state.cards
        .filter(c => !c.isTokenCard && c.cardId !== 'token')
        .map(c => ({
          ...c,
          zone: c.isLeaderCard ? `leader-${c.owner}` : CardLogic.getDeckZone(c),
          isFlipped: c.isLeaderCard ? false : true,
          isTapped: false,
          attachedTo: undefined,
          linkedTo: undefined,
          counters: { atk: 0, hp: 0 },
          genericCounter: 0,
        }));
      const shuffledResetCards = CardLogic.shuffleDeck(
        CardLogic.shuffleDeck(resetCards, 'host'),
        'guest'
      );

      return {
        ...initialState,
        cards: shuffledResetCards,
        tokenOptions: state.tokenOptions,
        lastGameState: null,
        lastUndoableCardMoveState: null,
        lastUndoableCardMoveActor: null,
        revision: state.revision + 1,
      };
    }

    case 'MOVE_CARD': {
      if (isPreparingHandMovementBlocked(state, event.cardId)) return state;
      if (isPreparingMainDeckDragBlocked(state, event.cardId)) return state;
      if (isPreparingEvolveDeckMoveBlocked(state, event.cardId)) return state;
      const nextCards = CardLogic.applyDrop(state.cards, event.cardId, event.overId);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'LINK_CARD_TO_FIELD': {
      if (isPreparingHandMovementBlocked(state, event.cardId)) return state;
      if (isPreparingMainDeckDragBlocked(state, event.cardId)) return state;
      if (isPreparingEvolveDeckMoveBlocked(state, event.cardId)) return state;
      const nextCards = CardLogic.linkCardToField(state.cards, event.cardId, event.parentCardId);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'MODIFY_COUNTER': {
      const nextCards = CardLogic.modifyCardCounter(state.cards, event.cardId, event.stat, event.delta);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'MODIFY_GENERIC_COUNTER': {
      const nextCards = CardLogic.modifyGenericCounter(state.cards, event.cardId, event.delta);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'DRAW_CARD': {
      if (!isActorRequester(requester, event.actor)) return state;
      if (state.gameStatus !== 'playing') return state;
      const nextCards = CardLogic.drawCard(state.cards, event.actor);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'MILL_CARD': {
      if (!isActorRequester(requester, event.actor)) return state;
      if (state.gameStatus !== 'playing') return state;
      const nextCards = CardLogic.millCard(state.cards, event.actor);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'MOVE_TOP_CARD_TO_EX': {
      if (!isActorRequester(requester, event.actor)) return state;
      if (state.gameStatus !== 'playing') return state;
      const nextCards = CardLogic.moveTopCardToEx(state.cards, event.actor);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'TOGGLE_TAP': {
      const nextCards = CardLogic.toggleTapStack(state.cards, event.cardId);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'TOGGLE_FLIP': {
      if (!isActorRequester(requester, event.actor)) return state;
      if (!canToggleEvolveDeckUsage(state, event.actor, event.cardId)) return state;
      const nextCards = CardLogic.toggleFlip(state.cards, event.cardId);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'SEND_TO_BOTTOM': {
      if (isPreparingHandMovementBlocked(state, event.cardId)) return state;
      const nextCards = CardLogic.sendCardToBottom(state.cards, event.cardId);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'BANISH_CARD': {
      if (isPreparingHandMovementBlocked(state, event.cardId)) return state;
      const nextCards = CardLogic.banishCard(state.cards, event.cardId);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'SEND_TO_CEMETERY': {
      if (isPreparingHandMovementBlocked(state, event.cardId)) return state;
      const nextCards = CardLogic.sendCardToCemetery(state.cards, event.cardId);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'RETURN_EVOLVE': {
      const nextCards = CardLogic.returnEvolveCard(state.cards, event.cardId);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'PLAY_TO_FIELD': {
      if (isPreparingHandMovementBlocked(state, event.cardId)) return state;
      const nextCards = CardLogic.playCardToField(state.cards, event.cardId, event.actor);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'EXTRACT_CARD': {
      if (isPreparingEvolveDeckMoveBlocked(state, event.cardId)) return state;
      if (event.attachToCardId) {
        const nextCards = CardLogic.extractCardToFieldAttachment(state.cards, event.cardId, event.actor, event.attachToCardId);
        if (nextCards === state.cards) return state;
        return withCardMoveCheckpoint(state, event.actor, nextCards);
      }
      if (isPreparingMainDeckFieldSet(state, event.actor, event.cardId, event.destination)) {
        const nextCards = CardLogic.moveCardToEnd(state.cards, event.cardId, {
          zone: `field-${event.actor}`,
          isFlipped: true,
          isTapped: false,
          attachedTo: undefined,
          counters: { atk: 0, hp: 0 },
          preserveAttachment: false,
        });
        if (nextCards === state.cards) return state;
        return withCardMoveCheckpoint(state, event.actor, nextCards);
      }
      const nextCards = CardLogic.extractCard(state.cards, event.cardId, event.actor, event.destination);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'SHUFFLE_DECK': {
      if (!isActorRequester(requester, event.actor)) return state;
      const nextCards = CardLogic.shuffleDeck(state.cards, event.actor);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
        lastUndoableCardMoveState: null,
        lastUndoableCardMoveActor: null,
      });
    }

    case 'MODIFY_PLAYER_STAT': {
      const playerState = state[event.playerKey];
      const effectiveMaxPp =
        event.stat === 'pp'
          ? playerState.maxPp
          : event.stat === 'maxPp'
            ? CardLogic.modifyPlayerStatValue(playerState.maxPp, playerState.maxPp, 'maxPp', event.delta)
            : playerState.maxPp;
      const nextValue = CardLogic.modifyPlayerStatValue(
        playerState[event.stat],
        effectiveMaxPp,
        event.stat,
        event.delta
      );

      return bumpRevision({
        ...state,
        [event.playerKey]: {
          ...playerState,
          [event.stat]: nextValue,
          ...(event.stat === 'maxPp' && playerState.pp > nextValue ? { pp: nextValue } : {}),
        },
      });
    }

    case 'DRAW_INITIAL_HAND': {
      if (!isActorRequester(requester, event.actor)) return state;
      const nextCards = CardLogic.drawInitialHand(state.cards, event.actor);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
        [event.actor]: {
          ...state[event.actor],
          initialHandDrawn: true,
        },
        lastUndoableCardMoveState: null,
        lastUndoableCardMoveActor: null,
      });
    }

    case 'EXECUTE_MULLIGAN': {
      if (!isActorRequester(requester, event.actor)) return state;
      const nextCards = CardLogic.executeMulligan(state.cards, event.actor, event.selectedIds);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
        [event.actor]: {
          ...state[event.actor],
          mulliganUsed: true,
        },
        lastUndoableCardMoveState: null,
        lastUndoableCardMoveActor: null,
      });
    }

    case 'RESOLVE_TOP_DECK': {
      if (!isActorRequester(requester, event.actor)) return state;
      const nextCards = CardLogic.resolveTopDeckResults(state.cards, event.actor, event.results);
      if (nextCards === state.cards) return state;
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'IMPORT_DECK': {
      if (!isActorRequester(requester, event.actor)) return state;
      if (!canImportDeck(state, event.actor)) return state;
      const nextCards = CardLogic.importDeckCards(state.cards, event.actor, event.cards);
      return bumpRevision({
        ...state,
        [event.actor]: {
          ...state[event.actor],
          initialHandDrawn: false,
          mulliganUsed: false,
          isReady: false,
        },
        tokenOptions: {
          ...state.tokenOptions,
          [event.actor]: event.tokenOptions ?? [],
        },
        cards: nextCards,
        lastUndoableCardMoveState: null,
        lastUndoableCardMoveActor: null,
      });
    }

    case 'SET_INITIAL_TURN_ORDER': {
      if (!isHostRequester(requester)) return state;
      const starter = event.starter;
      const second = starter === 'host' ? 'guest' : 'host';
      return bumpRevision({
        ...state,
        turnPlayer: starter,
        turnCount: 1,
        phase: 'Start',
        [starter]: { ...state[starter], ep: 0 },
        [second]: { ...state[second], ep: 3 },
        lastUndoableCardMoveState: null,
        lastUndoableCardMoveActor: null,
      });
    }

    case 'UNDO_LAST_TURN': {
      // Allow any role to trigger turn undo as long as the state has a backup.
      if (!state.lastGameState) return state;
      return {
        ...state.lastGameState,
        revision: state.revision + 1,
        lastGameState: null,
        lastUndoableCardMoveState: null,
        lastUndoableCardMoveActor: null,
      } as SyncState;
    }

    case 'UNDO_CARD_MOVE':
      if (!isActorRequester(requester, event.actor)) return state;
      if (!state.lastUndoableCardMoveState) return state;
      if (state.lastUndoableCardMoveActor !== event.actor) return state;
      return {
        ...state.lastUndoableCardMoveState,
        revision: state.revision + 1,
        lastUndoableCardMoveState: null,
        lastUndoableCardMoveActor: null,
      };

    case 'SPAWN_TOKEN': {
      if (!isActorRequester(requester, event.actor)) return state;
      const nextCards = CardLogic.spawnTokenCard(state.cards, event.token);
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'SPAWN_TOKENS_BATCH': {
      if (!isActorRequester(requester, event.actor)) return state;
      if (event.tokens.length === 0) return state;
      const nextCards = CardLogic.spawnTokenCards(state.cards, event.tokens);
      return withCardMoveCheckpoint(state, event.actor, nextCards);
    }

    case 'ATTACK_DECLARATION': {
      if (!isActorRequester(requester, event.actor)) return state;
      if (!canDeclareAttack(state.cards, event.actor, event.attackerCardId, event.target, state.turnPlayer, state.gameStatus)) {
        return state;
      }
      const nextCards = CardLogic.tapStack(state.cards, event.attackerCardId);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }
  }
};
