import type { SyncState } from '../types/game';
import type { GameSyncEvent } from '../types/sync';
import * as CardLogic from './cardLogic';
import { canImportDeck } from './gameRules';

type EventRequester = GameSyncEvent['actor'];

const bumpRevision = (state: SyncState): SyncState => ({
  ...state,
  revision: state.revision + 1,
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
  if (state.gameStatus !== 'preparing') return false;
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return false;
  return card.owner === actor && card.zone === `evolveDeck-${actor}`;
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

      return bumpRevision({
        ...state,
        turnPlayer: nextPlayer,
        turnCount: newTurnCount,
        phase: 'Start',
        [nextPlayer]: nextPlayerState,
        cards: finalCards,
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
      });
    }

    case 'RESET_GAME': {
      if (!isHostRequester(requester)) return state;
      const resetCards = state.cards
        .filter(c => c.cardId !== 'token')
        .map(c => ({
          ...c,
          zone: CardLogic.getDeckZone(c),
          isFlipped: true,
          isTapped: false,
          attachedTo: undefined,
          counters: { atk: 0, hp: 0 },
        }));

      return {
        ...state,
        host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
        guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
        cards: resetCards,
        turnPlayer: 'host',
        turnCount: 1,
        phase: 'Start',
        gameStatus: 'preparing',
        revision: state.revision + 1,
      };
    }

    case 'MOVE_CARD': {
      if (isPreparingMainDeckDragBlocked(state, event.cardId)) return state;
      if (isPreparingEvolveDeckMoveBlocked(state, event.cardId)) return state;
      const nextCards = CardLogic.applyDrop(state.cards, event.cardId, event.overId);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'MODIFY_COUNTER': {
      const nextCards = CardLogic.modifyCardCounter(state.cards, event.cardId, event.stat, event.delta);
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
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'MILL_CARD': {
      if (!isActorRequester(requester, event.actor)) return state;
      if (state.gameStatus !== 'playing') return state;
      const nextCards = CardLogic.millCard(state.cards, event.actor);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
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
      const nextCards = CardLogic.sendCardToBottom(state.cards, event.cardId);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'BANISH_CARD': {
      const nextCards = CardLogic.banishCard(state.cards, event.cardId);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'SEND_TO_CEMETERY': {
      const nextCards = CardLogic.sendCardToCemetery(state.cards, event.cardId);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'RETURN_EVOLVE': {
      const nextCards = CardLogic.returnEvolveCard(state.cards, event.cardId);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'PLAY_TO_FIELD': {
      const nextCards = CardLogic.playCardToField(state.cards, event.cardId, event.actor);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'EXTRACT_CARD': {
      if (isPreparingEvolveDeckMoveBlocked(state, event.cardId)) return state;
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
        return bumpRevision({
          ...state,
          cards: nextCards,
        });
      }
      const nextCards = CardLogic.extractCard(state.cards, event.cardId, event.actor, event.destination);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }

    case 'SHUFFLE_DECK': {
      if (!isActorRequester(requester, event.actor)) return state;
      const nextCards = CardLogic.shuffleDeck(state.cards, event.actor);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
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
      });
    }

    case 'RESOLVE_TOP_DECK': {
      if (!isActorRequester(requester, event.actor)) return state;
      const nextCards = CardLogic.resolveTopDeckResults(state.cards, event.actor, event.results);
      if (nextCards === state.cards) return state;
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
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
        cards: nextCards,
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
      });
    }

    case 'UNDO_LAST_TURN':
      if (!isHostRequester(requester)) return state;
      return {
        ...event.previousState,
        revision: state.revision + 1,
      };

    case 'SPAWN_TOKEN': {
      if (!isActorRequester(requester, event.actor)) return state;
      const nextCards = CardLogic.spawnTokenCard(state.cards, event.token);
      return bumpRevision({
        ...state,
        cards: nextCards,
      });
    }
  }
};
