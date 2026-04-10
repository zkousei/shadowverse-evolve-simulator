import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { type DragEndEvent } from '@dnd-kit/core';
import { type CardInstance } from '../components/Card';
import { type PlayerRole, type SyncState, type TokenOption, initialState } from '../types/game';
import { type AttackTarget, type GameSyncEvent, type SharedUiEffect } from '../types/sync';
import { uuid } from '../utils/helpers';
import * as CardLogic from '../utils/cardLogic';
import { canImportDeck } from '../utils/gameRules';
import { applyGameSyncEvent } from '../utils/gameSyncReducer';
import { flipSharedCoin, rollSharedDie } from '../utils/sharedRandom';
import { createEventDeduper } from '../utils/eventDeduper';
import { buildTopDeckRevealEffect } from '../utils/topDeckReveal';
import { buildTopDeckSummaryEffect } from '../utils/topDeckSummary';
import { buildHandRevealEffect, buildSingleCardRevealEffect } from '../utils/cardReveal';
import { buildAttackDeclaredEffect } from '../utils/attackUi';
import { buildCardPlayedEffect } from '../utils/cardPlayUi';
import { buildImportedDeckPayload, buildSpawnTokenInstance, buildSpawnTokens, type ImportableDeckData } from '../utils/gameBoardDeckActions';
import {
  buildSnapshotRequestMessage,
  buildSnapshotSyncMessage,
} from '../utils/gameBoardNetworkMessages';
import { getConnectionOpenDecision } from '../utils/gameBoardConnectionOpen';
import { getConnectionTerminationDecision } from '../utils/gameBoardConnectionTermination';
import { getPeerOpenDecision } from '../utils/gameBoardPeerOpen';
import { getPeerTerminationDecision } from '../utils/gameBoardPeerTermination';
import { getSnapshotApplicationDecision } from '../utils/gameBoardSnapshotApplication';
import { getSnapshotRetryTimeoutDecision } from '../utils/gameBoardSnapshotRetry';
import { buildDebugGameBoardState } from '../utils/gameBoardDebugState';
import { getCanUndoMove, getCanUndoTurn } from '../utils/gameBoardUndoAvailability';
import { getTurnMessageDecision } from '../utils/gameBoardTurnMessage';
import { findUnitRootCard, isEquipmentLinkTargetCard, isTokenEquipmentCard } from '../utils/gameBoardManualLink';
import { canLookAtTopDeck, getCanInteractWithGameBoard, getCanViewGameBoard } from '../utils/gameBoardInteraction';
import {
  buildGameBoardEvolveAutoAttachSelection,
  type PendingGameBoardEvolveAutoAttachSelection,
} from '../utils/gameBoardEvolveAutoAttachSelection';
import { useGameBoardCatalogResources } from './useGameBoardCatalogResources';
import { useGameBoardConnectionSetup } from './useGameBoardConnectionSetup';
import { useGameBoardConnectionLifecycleState } from './useGameBoardConnectionLifecycleState';
import { useGameBoardIncomingMessages } from './useGameBoardIncomingMessages';
import { useGameBoardSnapshotMessaging } from './useGameBoardSnapshotMessaging';
import { useGameBoardSharedUiEffects } from './useGameBoardSharedUiEffects';
import { useGameBoardSessionPersistence } from './useGameBoardSessionPersistence';
import { useGameBoardMulliganActions } from './useGameBoardMulliganActions';

export type DispatchableGameSyncEvent =
  | { type: 'FLIP_SHARED_COIN'; actor?: PlayerRole }
  | { type: 'ROLL_SHARED_DIE'; actor?: PlayerRole }
  | { type: 'TOGGLE_READY'; actor?: PlayerRole }
  | { type: 'SET_PHASE'; actor?: PlayerRole; phase: SyncState['phase'] }
  | { type: 'END_TURN'; actor?: PlayerRole }
  | { type: 'START_GAME'; actor?: PlayerRole }
  | { type: 'RESET_GAME'; actor?: PlayerRole }
  | { type: 'MOVE_CARD'; actor?: PlayerRole; cardId: string; overId: string }
  | { type: 'LINK_CARD_TO_FIELD'; actor?: PlayerRole; cardId: string; parentCardId: string }
  | { type: 'MODIFY_COUNTER'; actor?: PlayerRole; cardId: string; stat: 'atk' | 'hp'; delta: number }
  | { type: 'MODIFY_GENERIC_COUNTER'; actor?: PlayerRole; cardId: string; delta: number }
  | { type: 'DRAW_CARD'; actor?: PlayerRole }
  | { type: 'MILL_CARD'; actor?: PlayerRole }
  | { type: 'MOVE_TOP_CARD_TO_EX'; actor?: PlayerRole }
  | { type: 'TOGGLE_TAP'; actor?: PlayerRole; cardId: string }
  | { type: 'TOGGLE_FLIP'; actor?: PlayerRole; cardId: string }
  | { type: 'SEND_TO_BOTTOM'; actor?: PlayerRole; cardId: string }
  | { type: 'BANISH_CARD'; actor?: PlayerRole; cardId: string }
  | { type: 'SEND_TO_CEMETERY'; actor?: PlayerRole; cardId: string }
  | { type: 'DISCARD_RANDOM_HAND_CARDS'; actor?: PlayerRole; target: PlayerRole; count: number }
  | { type: 'RETURN_EVOLVE'; actor?: PlayerRole; cardId: string }
  | { type: 'PLAY_TO_FIELD'; actor?: PlayerRole; cardId: string }
  | { type: 'EXTRACT_CARD'; actor?: PlayerRole; cardId: string; destination?: string; revealToOpponent?: boolean; attachToCardId?: string }
  | { type: 'SHUFFLE_DECK'; actor?: PlayerRole }
  | { type: 'MODIFY_PLAYER_STAT'; actor?: PlayerRole; playerKey: PlayerRole; stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo'; delta: number }
  | { type: 'DRAW_INITIAL_HAND'; actor?: PlayerRole }
  | { type: 'EXECUTE_MULLIGAN'; actor?: PlayerRole; selectedIds: string[] }
  | { type: 'RESOLVE_TOP_DECK'; actor?: PlayerRole; results: CardLogic.TopDeckResult[] }
  | { type: 'IMPORT_DECK'; actor?: PlayerRole; cards: CardInstance[]; tokenOptions?: TokenOption[] }
  | { type: 'SET_INITIAL_TURN_ORDER'; actor?: PlayerRole; starter: PlayerRole; manual: boolean }
  | { type: 'UNDO_LAST_TURN'; actor?: PlayerRole }
  | { type: 'UNDO_CARD_MOVE'; actor?: PlayerRole }
  | { type: 'SET_REVEAL_HANDS_MODE'; actor?: PlayerRole; enabled: boolean }
  | { type: 'SET_END_STOP'; actor?: PlayerRole; enabled: boolean }
  | { type: 'SPAWN_TOKEN'; actor?: PlayerRole; token: CardInstance }
  | { type: 'SPAWN_TOKENS_BATCH'; actor?: PlayerRole; tokens: CardInstance[] }
  | { type: 'ATTACK_DECLARATION'; actor?: PlayerRole; attackerCardId: string; target: AttackTarget };

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
const SNAPSHOT_REQUEST_TIMEOUT_MS = 2000;
const MAX_SNAPSHOT_REQUEST_RETRIES = 2;
const RECONNECT_DELAY_MS = 1000;

type GameBoardStatusKey = `gameBoard.status.${string}`;
export const useGameBoardLogic = () => {
  const [searchParams] = useSearchParams();
  const room = searchParams.get('room') || '';
  const mode = searchParams.get('mode') === 'solo' ? 'solo' : 'p2p';
  const isSoloMode = mode === 'solo';
  const isSpectator = !isSoloMode && searchParams.get('spectator') === 'true';
  const isHost = !isSpectator && searchParams.get('host') === 'true';
  const role = (isSoloMode || isHost || isSpectator ? 'host' : 'guest') as PlayerRole;
  const isDebug = searchParams.get('debug') === 'true';

  const { t } = useTranslation();
  const tRef = useRef(t);
  // Keep the status as an i18n key so language switches update the current
  // connection message without waiting for another network event.
  const [statusKey, setStatusKey] = useState<GameBoardStatusKey>('gameBoard.status.initializing');
  const status = t(statusKey);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const canInteract = getCanInteractWithGameBoard({ isSoloMode, isHost, isSpectator, connectionState });
  const canView = getCanViewGameBoard({ isSoloMode, isHost, connectionState });
  const [gameState, setGameState] = useState<SyncState>(initialState);
  const [searchZone, setSearchZone] = useState<{ id: string, title: string } | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [hasUndoableMove, setHasUndoableMove] = useState(false);
  const [mulliganOrder, setMulliganOrder] = useState<string[]>([]);
  const [isMulliganModalOpen, setIsMulliganModalOpen] = useState(false);
  const [topDeckCards, setTopDeckCardsState] = useState<CardInstance[]>([]);
  const [topDeckTargetRole, setTopDeckTargetRoleState] = useState<PlayerRole>(role);
  const [pendingEvolveAutoAttachSelection, setPendingEvolveAutoAttachSelection] = useState<PendingGameBoardEvolveAutoAttachSelection | null>(null);
  const defaultTokenOption = useRef<TokenOption>({
    cardId: 'token',
    name: 'Token',
    image: 'https://shadowverse-evolve.com/wordpress/wp-content/themes/shadowverse-evolve-release_v0/assets/images/common/ogp.jpg',
    baseCardType: 'follower',
  });

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const spectatorConnRef = useRef<DataConnection | null>(null);
  const setupConnectionRef = useRef<(conn: DataConnection) => void>(() => undefined);
  const gameStateRef = useRef<SyncState>(initialState);
  const {
    cardStatLookup,
    cardDetailLookup,
    cardDetailLookupRef,
    cardCatalogByIdRef,
    evolveAutoAttachResolverRef,
    fieldLinkAutoAttachResolverRef,
    fieldLinkCardIdsRef,
    tokenEquipmentCardIdsRef,
  } = useGameBoardCatalogResources();
  const topDeckCardsRef = useRef<CardInstance[]>([]);
  const topDeckTargetRoleRef = useRef<PlayerRole>(role);
  const awaitingInitialSnapshotRef = useRef(false);
  const activeConnectionTokenRef = useRef<string | null>(null);
  const activeSpectatorConnectionTokenRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRequestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRetryCountRef = useRef(0);
  // Stores the game state immediately before the last card-move action so it
  // can be restored via the undo button.  Only one level of undo is supported.
  const processedEventDeduperRef = useRef(createEventDeduper());

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const applyLocalState = useCallback((newState: SyncState) => {
    const guardedCards = CardLogic.applyStateWithGuards(newState.cards);
    const guardedState: SyncState = {
      ...newState,
      cards: CardLogic.normalizeCardsForGameState(guardedCards, newState.gameStatus)
    };
    setGameState(guardedState);
    gameStateRef.current = guardedState;
  }, []);

  const setTopDeckCards = useCallback((cards: CardInstance[]) => {
    topDeckCardsRef.current = cards;
    setTopDeckCardsState(cards);
  }, []);

  const setTopDeckTargetRole = useCallback((targetRole: PlayerRole) => {
    topDeckTargetRoleRef.current = targetRole;
    setTopDeckTargetRoleState(targetRole);
  }, []);

  const reconcileOpenTopDeckCards = useCallback((incomingState: SyncState) => {
    const openTopDeckCards = topDeckCardsRef.current;
    if (openTopDeckCards.length === 0) return;

    const targetRole = topDeckTargetRoleRef.current;
    const incomingTopCards = incomingState.cards
      .filter(card => card.zone === `mainDeck-${targetRole}`)
      .slice(0, openTopDeckCards.length);
    const isSameTopDeckSelection = incomingTopCards.length === openTopDeckCards.length
      && incomingTopCards.every((card, index) => card.id === openTopDeckCards[index].id);

    setTopDeckCards(isSameTopDeckSelection ? incomingTopCards : []);
  }, [setTopDeckCards]);

  const { sendMessage, clearPendingSnapshotMessage } = useGameBoardSnapshotMessaging({
    connRef,
    spectatorConnRef,
  });

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearSnapshotRequestTimer = useCallback(() => {
    if (snapshotRequestTimeoutRef.current) {
      clearTimeout(snapshotRequestTimeoutRef.current);
      snapshotRequestTimeoutRef.current = null;
    }
    snapshotRetryCountRef.current = 0;
  }, []);

  const resetTransientUiState = useCallback((includingUndo = true) => {
    setSearchZone(null);
    setIsMulliganModalOpen(false);
    setMulliganOrder([]);
    setTopDeckCards([]);
    setPendingEvolveAutoAttachSelection(null);
    // Only clear undo state if explicitly requested (e.g. game reset or connection lost).
    if (includingUndo) {
      setHasUndoableMove(false);
    }
  }, [setTopDeckCards]);

  const resolveEvolveAutoAttachSelection = useCallback((cardId: string, boardCards = gameStateRef.current.cards) => {
    const sourceCard = boardCards.find(card => card.id === cardId);
    if (!sourceCard) return null;

    const fieldLinkResolver = fieldLinkAutoAttachResolverRef.current;
    if (fieldLinkResolver?.isEligibleSource(sourceCard)) {
      return {
        sourceCard,
        candidateCards: fieldLinkResolver.resolveCandidates(sourceCard, boardCards),
        placement: 'linked' as const,
      };
    }

    const resolver = evolveAutoAttachResolverRef.current;
    if (!resolver || !resolver.isEligibleSource(sourceCard)) return null;

    const candidateCards = resolver.resolveCandidates(sourceCard, boardCards)
      .map(candidate => candidate.card);

    return {
      sourceCard,
      candidateCards,
      placement: 'stack' as const,
    };
  }, [evolveAutoAttachResolverRef, fieldLinkAutoAttachResolverRef]);

  const queueEvolveAutoAttachSelection = useCallback((
    sourceCardId: string,
    actor: PlayerRole
  ) => {
    setPendingEvolveAutoAttachSelection({
      sourceCardId,
      actor,
    });
  }, []);

  const sendSnapshot = useCallback((state: SyncState, source: PlayerRole, effects?: SharedUiEffect[]) => {
    sendMessage(buildSnapshotSyncMessage(state, source, cardDetailLookupRef.current, effects));
  }, [cardDetailLookupRef, sendMessage]);

  const sendSnapshotToCurrentConnection = useCallback((state: SyncState, source: PlayerRole) => {
    sendMessage(buildSnapshotSyncMessage(state, source, cardDetailLookupRef.current));
  }, [cardDetailLookupRef, sendMessage]);

  const {
    savedSessionCandidate,
    savedSessionCandidateRef,
    resumeSavedSession,
    discardSavedSession,
  } = useGameBoardSessionPersistence({
    appVersion: APP_VERSION,
    applyLocalState,
    gameState,
    gameStateRef,
    isHost,
    isSoloMode,
    resetTransientUiState,
    room,
    sendSnapshotToCurrentConnection,
    setStatusKey,
  });

  const sendSharedUiEffect = useCallback((effect: SharedUiEffect) => {
    sendMessage({ type: 'SHARED_UI_EFFECT', effect });
  }, [sendMessage]);
  const {
    coinMessage,
    turnMessage,
    cardPlayMessage,
    attackMessage,
    attackHistory,
    eventHistory,
    attackVisual,
    revealedCardsOverlay,
    isRollingDice,
    diceValue,
    playSharedUiEffect,
    playIncomingSharedUiEffects,
    clearAttackUiState,
    clearTurnMessage,
    showTimedTurnMessage,
  } = useGameBoardSharedUiEffects({
    gameStateRef,
    isSoloMode,
    isSpectator,
    role,
    tRef,
  });

  const maybeApplySnapshot = useCallback((incomingState: SyncState, source: PlayerRole) => {
    const snapshotDecision = getSnapshotApplicationDecision({
      currentState: gameStateRef.current,
      incomingState,
      source,
      isHost,
      isAwaitingInitialSnapshot: awaitingInitialSnapshotRef.current,
    });

    if (!snapshotDecision.shouldApply) {
      return false;
    }

    if (snapshotDecision.shouldClearAwaitingInitialSnapshot) {
      awaitingInitialSnapshotRef.current = false;
    }

    applyLocalState(incomingState);
    return true;
  }, [applyLocalState, isHost]);

  const applyAuthoritativeEvent = useCallback((
    event: GameSyncEvent,
    requester: PlayerRole = role
  ) => {
    if (!processedEventDeduperRef.current.markIfNew(event.id)) {
      return;
    }

    if (event.type === 'FLIP_SHARED_COIN') {
      const effect: SharedUiEffect = {
        type: 'COIN_FLIP_RESULT',
        actor: event.actor,
        result: flipSharedCoin(),
      };
      playSharedUiEffect(effect);
      sendSharedUiEffect(effect);
      return;
    }

    if (event.type === 'ROLL_SHARED_DIE') {
      const effect: SharedUiEffect = {
        type: 'DICE_ROLL_RESULT',
        actor: event.actor,
        value: rollSharedDie(),
      };
      playSharedUiEffect(effect);
      sendSharedUiEffect(effect);
      return;
    }

    const currentState = gameStateRef.current;
    const nextState = applyGameSyncEvent(currentState, event, requester);
    if (nextState === currentState) return;
    applyLocalState(nextState);
    const pendingEffects: SharedUiEffect[] = [];
    const queueSnapshotEffect = (effect: SharedUiEffect | null | undefined) => {
      if (!effect) return;
      playSharedUiEffect(effect);
      pendingEffects.push(effect);
    };

    if (event.type === 'RESOLVE_TOP_DECK') {
      // Embed SharedUiEffects into the snapshot so everything is sent in one
      // WebRTC message instead of three, eliminating data-channel congestion.
      const revealEffect = buildTopDeckRevealEffect(currentState.cards, event.actor, event.results);
      queueSnapshotEffect(revealEffect);
      const summaryEffect = buildTopDeckSummaryEffect(currentState.cards, event.actor, event.results);
      queueSnapshotEffect(summaryEffect);
    }

    if (event.type === 'EXTRACT_CARD' && event.revealToOpponent && event.destination?.startsWith('hand-')) {
      // Keep public Search hand reveals in the same snapshot as the card move.
      // Sending the reveal as a second WebRTC message right after the snapshot can
      // overwhelm the data channel on slower links and disconnect guests.
      const revealEffect = buildSingleCardRevealEffect(
        currentState.cards,
        event.actor,
        event.cardId,
        'REVEAL_SEARCHED_CARD_TO_HAND'
      );
      queueSnapshotEffect(revealEffect);
    }

    if (event.type === 'EXTRACT_CARD' && !event.revealToOpponent && event.destination?.startsWith('hand-')) {
      const extractedCard = currentState.cards.find((card) => card.id === event.cardId);
      if (extractedCard?.zone === `mainDeck-${event.actor}`) {
        const effect: SharedUiEffect = {
          type: 'SEARCHED_CARD_TO_HAND',
          actor: event.actor,
        };
        queueSnapshotEffect(effect);
      }
    }

    if (event.type === 'EXTRACT_CARD' && event.destination?.startsWith('hand-')) {
      const extractedCard = currentState.cards.find((card) => card.id === event.cardId);
      if (extractedCard?.zone === `cemetery-${event.actor}`) {
        const effect: SharedUiEffect = {
          type: 'CEMETERY_CARD_TO_HAND',
          actor: event.actor,
          cardName: extractedCard.name,
        };
        queueSnapshotEffect(effect);
      }

      if (extractedCard?.zone === `banish-${event.actor}`) {
        const effect: SharedUiEffect = {
          type: 'BANISHED_CARD_TO_HAND',
          actor: event.actor,
          cardName: extractedCard.name,
        };
        queueSnapshotEffect(effect);
      }
    }

    if (event.type === 'EXTRACT_CARD' && (event.destination?.startsWith('field-') || event.destination?.startsWith('ex-'))) {
      const extractedCard = currentState.cards.find((card) => card.id === event.cardId);
      if (extractedCard?.zone === `mainDeck-${event.actor}`) {
        const isFieldDestination = event.destination.startsWith('field-');
        // Keep the preparation-time field notification generic because starter amulet support
        // allows cards to be set face-down from the main deck before the game starts.
        const shouldHideCardName = isFieldDestination && currentState.gameStatus === 'preparing';
        const effect: SharedUiEffect = {
          type: 'SEARCHED_CARD_PLACED',
          actor: event.actor,
          destination: isFieldDestination ? 'field' : 'ex',
          cardName: shouldHideCardName ? undefined : extractedCard.name,
        };
        queueSnapshotEffect(effect);
      }

      if (extractedCard?.zone === `cemetery-${event.actor}`) {
        const effect: SharedUiEffect = {
          type: 'CEMETERY_CARD_PLACED',
          actor: event.actor,
          destination: event.destination.startsWith('field-') ? 'field' : 'ex',
          cardName: extractedCard.name,
        };
        queueSnapshotEffect(effect);
      }

      if (extractedCard?.zone === `evolveDeck-${event.actor}` && event.destination.startsWith('field-')) {
        const effect: SharedUiEffect = {
          type: 'EVOLVE_CARD_PLACED',
          actor: event.actor,
          cardName: extractedCard.name,
        };
        queueSnapshotEffect(effect);
      }

      if (extractedCard?.zone === `banish-${event.actor}`) {
        const effect: SharedUiEffect = {
          type: 'BANISHED_CARD_PLACED',
          actor: event.actor,
          destination: event.destination.startsWith('field-') ? 'field' : 'ex',
          cardName: extractedCard.name,
        };
        queueSnapshotEffect(effect);
      }
    }

    if (pendingEffects.length > 0) {
      sendSnapshot(nextState, role, pendingEffects);
    } else {
      sendSnapshot(nextState, role);
    }

    if (event.type === 'SET_INITIAL_TURN_ORDER') {
      const effect: SharedUiEffect = {
        type: 'STARTER_DECIDED',
        actor: event.actor,
        starter: event.starter,
        manual: event.manual,
      };
      playSharedUiEffect(effect);
      sendSharedUiEffect(effect);
    }
    if (event.type === 'PLAY_TO_FIELD') {
      const effect = buildCardPlayedEffect(currentState.cards, event.actor, event.cardId);
      if (effect) {
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }
    }
    if (event.type === 'TOGGLE_FLIP') {
      const toggledCard = currentState.cards.find((card) => card.id === event.cardId);
      if (toggledCard?.zone === `evolveDeck-${event.actor}` && toggledCard.isEvolveCard) {
        const effect: SharedUiEffect = {
          type: 'EVOLVE_USAGE_TOGGLED',
          actor: event.actor,
          cardName: toggledCard.name,
          isUsed: toggledCard.isFlipped,
        };
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }
    }
    if (event.type === 'RESET_GAME') {
      const effect: SharedUiEffect = {
        type: 'RESET_GAME_COMPLETED',
        actor: event.actor,
      };
      playSharedUiEffect(effect);
      sendSharedUiEffect(effect);
    }
    if (event.type === 'SHUFFLE_DECK') {
      const effect: SharedUiEffect = {
        type: 'SHUFFLE_DECK_COMPLETED',
        actor: event.actor,
      };
      playSharedUiEffect(effect);
      sendSharedUiEffect(effect);
    }
    if (event.type === 'DRAW_CARD') {
      const effect: SharedUiEffect = {
        type: 'DRAW_CARD_COMPLETED',
        actor: event.actor,
      };
      playSharedUiEffect(effect);
      sendSharedUiEffect(effect);
    }
    if (event.type === 'MILL_CARD') {
      const milledCard = currentState.cards.find(card => card.zone === `mainDeck-${event.actor}`);
      if (milledCard) {
        const effect: SharedUiEffect = {
          type: 'MILL_CARD_COMPLETED',
          actor: event.actor,
          cardName: milledCard.name,
        };
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }
    }
    if (event.type === 'MOVE_TOP_CARD_TO_EX') {
      const movedCard = currentState.cards.find(card => card.zone === `mainDeck-${event.actor}`);
      if (movedCard) {
        const effect: SharedUiEffect = {
          type: 'TOP_CARD_TO_EX_COMPLETED',
          actor: event.actor,
          cardName: movedCard.name,
        };
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }
    }
    if (event.type === 'DISCARD_RANDOM_HAND_CARDS') {
      const beforeCount = currentState.cards.filter(card => card.zone === `hand-${event.target}`).length;
      const afterCount = nextState.cards.filter(card => card.zone === `hand-${event.target}`).length;
      const discardedCount = Math.max(0, beforeCount - afterCount);
      if (discardedCount > 0) {
        const effect: SharedUiEffect = {
          type: 'RANDOM_HAND_DISCARD_COMPLETED',
          actor: event.actor,
          target: event.target,
          count: discardedCount,
        };
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }
    }
    if (event.type === 'ATTACK_DECLARATION') {
      const effect = buildAttackDeclaredEffect(currentState.cards, event.actor, event.attackerCardId, event.target);
      if (effect) {
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }
    }
  }, [applyLocalState, playSharedUiEffect, role, sendSharedUiEffect, sendSnapshot]);

  const dispatchGameEvent = useCallback((event: DispatchableGameSyncEvent) => {
    if (!canInteract) {
      return;
    }

    const fullEvent: GameSyncEvent = {
      ...event,
      id: uuid(),
      actor: event.actor ?? role,
    } as GameSyncEvent;

    if (isSoloMode || isHost) {
      applyAuthoritativeEvent(fullEvent, isSoloMode ? fullEvent.actor : role);
      return;
    }

    sendMessage({ type: 'EVENT', event: fullEvent });
  }, [applyAuthoritativeEvent, canInteract, isHost, isSoloMode, role, sendMessage]);

  const executeEvolveAutoAttach = useCallback((
    sourceCardId: string,
    actor: PlayerRole,
    attachToCardId: string,
    placement: 'stack' | 'linked'
  ) => {
    if (placement === 'linked') {
      dispatchGameEvent({
        type: 'LINK_CARD_TO_FIELD',
        actor,
        cardId: sourceCardId,
        parentCardId: attachToCardId,
      });
      return;
    }

    dispatchGameEvent({
      type: 'EXTRACT_CARD',
      actor,
      cardId: sourceCardId,
      destination: `field-${actor}`,
      attachToCardId,
    });
  }, [dispatchGameEvent]);

  const confirmEvolveAutoAttachSelection = useCallback((attachToCardId: string) => {
    if (!pendingEvolveAutoAttachSelection) return;
    const resolvedSelection = resolveEvolveAutoAttachSelection(
      pendingEvolveAutoAttachSelection.sourceCardId,
      gameStateRef.current.cards
    );
    const sourceCard = resolvedSelection?.sourceCard;
    if (
      !resolvedSelection ||
      !sourceCard ||
      sourceCard.zone !== `evolveDeck-${pendingEvolveAutoAttachSelection.actor}` ||
      !resolvedSelection.candidateCards.some(candidateCard => candidateCard.id === attachToCardId)
    ) {
      setPendingEvolveAutoAttachSelection(null);
      return;
    }

    setPendingEvolveAutoAttachSelection(null);
    executeEvolveAutoAttach(
      pendingEvolveAutoAttachSelection.sourceCardId,
      pendingEvolveAutoAttachSelection.actor,
      attachToCardId,
      resolvedSelection.placement
    );
  }, [executeEvolveAutoAttach, pendingEvolveAutoAttachSelection, resolveEvolveAutoAttachSelection]);

  const cancelEvolveAutoAttachSelection = useCallback(() => {
    setPendingEvolveAutoAttachSelection(null);
  }, []);

  const connectToHost = useCallback(() => {
    if (isSoloMode || isHost) return;
    const peer = peerRef.current;
    if (!peer) return;

    setConnectionState(current => current === 'connected' ? 'reconnecting' : 'connecting');
    setStatusKey('gameBoard.status.connectingToHost');
    const conn = isSpectator
      ? peer.connect(`sv-evolve-${room}`, { metadata: { connectionRole: 'spectator' } })
      : peer.connect(`sv-evolve-${room}`);
    setupConnectionRef.current(conn);
  }, [isHost, isSoloMode, isSpectator, room]);

  const scheduleReconnectAttempt = useCallback(() => {
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connectToHost();
    }, RECONNECT_DELAY_MS);
  }, [connectToHost]);

  const scheduleReconnect = useCallback((messageKey: GameBoardStatusKey) => {
    if (isSoloMode || isHost) return;
    clearReconnectTimer();
    setConnectionState('reconnecting');
    setStatusKey(messageKey);
    resetTransientUiState();
    scheduleReconnectAttempt();
  }, [clearReconnectTimer, isHost, isSoloMode, resetTransientUiState, scheduleReconnectAttempt]);

  const attemptReconnect = useCallback(() => {
    if (isSoloMode || isHost) return;
    clearReconnectTimer();
    connectToHost();
  }, [clearReconnectTimer, connectToHost, isHost, isSoloMode]);

  const isActiveConnectionToken = useCallback((token: string) => {
    return activeConnectionTokenRef.current === token;
  }, []);

  const isActiveSpectatorConnectionToken = useCallback((token: string) => {
    return activeSpectatorConnectionTokenRef.current === token;
  }, []);

  const isCurrentActiveConnection = useCallback((conn: DataConnection, token: string) => {
    return isActiveConnectionToken(token) && connRef.current === conn;
  }, [isActiveConnectionToken]);

  const handleSnapshotRequestTimeout = useCallback((
    conn: DataConnection,
    token: string,
    retrySnapshotRequest: (conn: DataConnection, token: string) => void
  ) => {
    const retryDecision = getSnapshotRetryTimeoutDecision({
      isCurrentConnection: isCurrentActiveConnection(conn, token),
      retryCount: snapshotRetryCountRef.current,
      maxRetries: MAX_SNAPSHOT_REQUEST_RETRIES,
    });

    if (retryDecision === 'cancel') {
      clearSnapshotRequestTimer();
      return;
    }

    if (retryDecision === 'reconnect') {
      clearSnapshotRequestTimer();
      setStatusKey('gameBoard.status.syncTimedOut');
      attemptReconnect();
      return;
    }

    snapshotRetryCountRef.current += 1;
    setStatusKey('gameBoard.status.waitingForRestore');
    retrySnapshotRequest(conn, token);
  }, [attemptReconnect, clearSnapshotRequestTimer, isCurrentActiveConnection]);

  const requestSnapshotWithRetry = useCallback(function requestSnapshotWithRetry(conn: DataConnection, token: string) {
    if (isSoloMode || isHost) return;
    if (!isActiveConnectionToken(token) || !conn.open) return;

    conn.send(buildSnapshotRequestMessage(gameStateRef.current.revision, isSpectator ? 'guest' : role));

    if (snapshotRequestTimeoutRef.current) {
      clearTimeout(snapshotRequestTimeoutRef.current);
    }

    snapshotRequestTimeoutRef.current = setTimeout(() => {
      handleSnapshotRequestTimeout(conn, token, requestSnapshotWithRetry);
    }, SNAPSHOT_REQUEST_TIMEOUT_MS);
  }, [handleSnapshotRequestTimeout, isActiveConnectionToken, isHost, isSoloMode, isSpectator, role]);

  const {
    handleIncomingConnectionData,
    handleIncomingSpectatorConnectionData,
  } = useGameBoardIncomingMessages({
    applyAuthoritativeEvent,
    awaitingInitialSnapshotRef,
    cardDetailLookupRef,
    clearSnapshotRequestTimer,
    gameStateRef,
    isActiveConnectionToken,
    isActiveSpectatorConnectionToken,
    isHost,
    maybeApplySnapshot,
    playIncomingSharedUiEffects,
    reconcileOpenTopDeckCards,
    resetTransientUiState,
    savedSessionCandidateRef,
    setStatusKey,
  });

  const {
    clearActiveConnectionLifecycleState,
    clearSpectatorConnectionLifecycleState,
    prepareActiveConnection,
    prepareSpectatorConnection,
  } = useGameBoardConnectionLifecycleState({
    activeConnectionTokenRef,
    activeSpectatorConnectionTokenRef,
    awaitingInitialSnapshotRef,
    clearPendingSnapshotMessage,
    clearReconnectTimer,
    clearSnapshotRequestTimer,
    connRef,
    spectatorConnRef,
  });

  const handleConnectionTermination = useCallback((kind: 'close' | 'error') => {
    clearActiveConnectionLifecycleState();

    const terminationDecision = getConnectionTerminationDecision({
      isHost,
      kind,
    });

    if (terminationDecision.type === 'host') {
      setConnectionState(terminationDecision.nextConnectionState);
      setStatusKey(terminationDecision.statusKey);
      return;
    }

    scheduleReconnect(terminationDecision.statusKey);
  }, [clearActiveConnectionLifecycleState, isHost, scheduleReconnect]);

  const handleConnectionOpen = useCallback((conn: DataConnection, token: string) => {
    if (!isActiveConnectionToken(token)) return;
    setConnectionState('connected');

    const openDecision = getConnectionOpenDecision({ isHost });
    setStatusKey(openDecision.statusKey);

    if (openDecision.type === 'host') {
      return;
    }

    if (openDecision.shouldAwaitInitialSnapshot) {
      awaitingInitialSnapshotRef.current = true;
    }

    if (openDecision.shouldRequestSnapshot) {
      requestSnapshotWithRetry(conn, token);
    }
  }, [isActiveConnectionToken, isHost, requestSnapshotWithRetry]);

  const handleConnectionLifecycleEvent = useCallback((token: string, kind: 'close' | 'error') => {
    if (!isActiveConnectionToken(token)) return;
    handleConnectionTermination(kind);
  }, [handleConnectionTermination, isActiveConnectionToken]);

  const { setupConnection, handlePeerIncomingConnection } = useGameBoardConnectionSetup({
    clearSpectatorConnectionLifecycleState,
    handleConnectionLifecycleEvent,
    handleConnectionOpen,
    handleIncomingConnectionData,
    handleIncomingSpectatorConnectionData,
    isActiveSpectatorConnectionToken,
    isHost,
    prepareActiveConnection,
    prepareSpectatorConnection,
    uuidFactory: uuid,
  });

  useEffect(() => {
    setupConnectionRef.current = setupConnection;
  }, [setupConnection]);

  const handlePeerOpen = useCallback(() => {
    const openDecision = getPeerOpenDecision({ isHost });
    setStatusKey(openDecision.statusKey);

    if (openDecision.type === 'host') {
      setConnectionState(openDecision.nextConnectionState);
      return;
    }

    if (openDecision.shouldConnectToHost) {
      connectToHost();
    }
  }, [connectToHost, isHost]);

  const handlePeerTermination = useCallback((kind: 'disconnected' | 'error') => {
    const terminationDecision = getPeerTerminationDecision({
      isHost,
      kind,
    });

    if (terminationDecision.type === 'host') {
      setStatusKey(terminationDecision.statusKey);
      return;
    }

    scheduleReconnect(terminationDecision.statusKey);
  }, [isHost, scheduleReconnect]);

  const cleanupPeerLifecycle = useCallback((peer: Peer) => {
    clearReconnectTimer();
    clearActiveConnectionLifecycleState();
    clearSpectatorConnectionLifecycleState();
    peer.destroy();
  }, [clearActiveConnectionLifecycleState, clearReconnectTimer, clearSpectatorConnectionLifecycleState]);

  useEffect(() => {
    if (isSoloMode) {
      setStatusKey('gameBoard.status.soloMode');
      setConnectionState('connected');
      processedEventDeduperRef.current.reset();
      return;
    }
    if (!room) return;
    processedEventDeduperRef.current.reset();
    setConnectionState('connecting');
    const peerId = isHost ? `sv-evolve-${room}` : undefined;
    const peer = peerId ? new Peer(peerId) : new Peer();
    peerRef.current = peer;

    peer.on('open', handlePeerOpen);
    peer.on('connection', handlePeerIncomingConnection);
    peer.on('disconnected', () => {
      handlePeerTermination('disconnected');
    });
    peer.on('error', () => {
      handlePeerTermination('error');
    });

    return () => {
      cleanupPeerLifecycle(peer);
    };
  }, [cleanupPeerLifecycle, handlePeerIncomingConnection, handlePeerOpen, handlePeerTermination, room, isHost, isSoloMode]); // gameState を除外して接続ループを防ぐ

  useEffect(() => {
    if (!isDebug) return;
    applyLocalState(buildDebugGameBoardState());
    setStatusKey('gameBoard.status.debugAutoStarted');
  }, [applyLocalState, isDebug]);

  useEffect(() => {
    if (gameState.gameStatus !== 'preparing') return;
    clearAttackUiState();
  }, [clearAttackUiState, gameState.gameStatus]);

  const evolveAutoAttachSelection = React.useMemo(() => {
    return buildGameBoardEvolveAutoAttachSelection({
      pendingSelection: pendingEvolveAutoAttachSelection,
      cards: gameState.cards,
      resolveSelection: resolveEvolveAutoAttachSelection,
    });
  }, [gameState.cards, pendingEvolveAutoAttachSelection, resolveEvolveAutoAttachSelection]);

  useEffect(() => {
    if (!pendingEvolveAutoAttachSelection) return;
    if (!evolveAutoAttachSelection) {
      setPendingEvolveAutoAttachSelection(null);
    }
  }, [evolveAutoAttachSelection, pendingEvolveAutoAttachSelection]);

  useEffect(() => {
    setHasUndoableMove(getCanUndoMove({
      isHost,
      isSoloMode,
      role,
      state: {
        lastUndoableCardMoveActor: gameState.lastUndoableCardMoveActor,
        lastUndoableCardMoveState: gameState.lastUndoableCardMoveState,
        networkHasUndoableCardMove: gameState.networkHasUndoableCardMove,
      },
    }));
  }, [gameState.lastUndoableCardMoveActor, gameState.lastUndoableCardMoveState, gameState.networkHasUndoableCardMove, isHost, isSoloMode, role]);

  const canUndoTurn = getCanUndoTurn({
    isHost,
    isSoloMode,
    state: {
      lastGameState: gameState.lastGameState,
      networkHasUndoableTurn: gameState.networkHasUndoableTurn,
    },
  });

  useEffect(() => {
    return () => {
      clearReconnectTimer();
      clearSnapshotRequestTimer();
    };
  }, [clearReconnectTimer, clearSnapshotRequestTimer]);

  useEffect(() => {
    const turnMessageDecision = getTurnMessageDecision({
      gameStatus: gameState.gameStatus,
      isSoloMode: isSoloMode || isSpectator,
      role,
      turnCount: gameState.turnCount,
      turnPlayer: gameState.turnPlayer,
    });

    if (turnMessageDecision.type === 'clear') {
      clearTurnMessage();
      return;
    }

    if (turnMessageDecision.type === 'skip') {
      return;
    }

    showTimedTurnMessage(
      t(turnMessageDecision.key, turnMessageDecision.options),
      turnMessageDecision.durationMs
    );
  }, [clearTurnMessage, gameState.gameStatus, gameState.turnCount, gameState.turnPlayer, isSoloMode, isSpectator, role, showTimedTurnMessage, t]);

  const handleStatChange = (playerKey: 'host' | 'guest', stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo', delta: number) => {
    dispatchGameEvent({ type: 'MODIFY_PLAYER_STAT', playerKey, stat, delta });
  };

  const setPhase = (newPhase: 'Start' | 'Main' | 'End') => {
    dispatchGameEvent({ type: 'SET_PHASE', phase: newPhase });
  };

  const endTurn = (actor?: PlayerRole) => {
    dispatchGameEvent({ type: 'END_TURN', actor });
  };

  const handleUndoTurn = () => {
    if (!canUndoTurn) return;
    dispatchGameEvent({ type: 'UNDO_LAST_TURN' });
  };

  const handleSetInitialTurnOrder = (forcedStarter?: 'host' | 'guest') => {
    const isHostFirst = forcedStarter ? (forcedStarter === 'host') : (Math.random() > 0.5);
    const starter = isHostFirst ? 'host' : 'guest';
    dispatchGameEvent({ type: 'SET_INITIAL_TURN_ORDER', starter, manual: Boolean(forcedStarter) });
  };

  const handlePureCoinFlip = () => {
    dispatchGameEvent({ type: 'FLIP_SHARED_COIN' });
  };

  const handleRollDice = () => {
    if (isRollingDice) return;
    dispatchGameEvent({ type: 'ROLL_SHARED_DIE' });
  };

  const handleStartGame = () => {
    if (!canInteract) return;
    dispatchGameEvent({ type: 'START_GAME' });
    showTimedTurnMessage(t('gameBoard.alerts.gameStart'), 2500);
  };

  const handleToggleReady = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'TOGGLE_READY', actor: targetRole });
  };

  const handleDrawInitialHand = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'DRAW_INITIAL_HAND', actor: targetRole });
  };

  const {
    startMulligan,
    handleMulliganOrderSelect,
    executeMulligan,
  } = useGameBoardMulliganActions({
    canInteract,
    mulliganOrder,
    setMulliganOrder,
    setIsMulliganModalOpen,
    dispatchGameEvent,
  });

  const drawCard = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'DRAW_CARD', actor: targetRole });
  };

  const millCard = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'MILL_CARD', actor: targetRole });
  };

  const moveTopCardToEx = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'MOVE_TOP_CARD_TO_EX', actor: targetRole });
  };

  const discardRandomHandCards = (targetRole: PlayerRole, count: number, actor: PlayerRole = role) => {
    if (!Number.isFinite(count)) return;
    const normalizedCount = Math.floor(count);
    if (normalizedCount <= 0) return;
    dispatchGameEvent({
      type: 'DISCARD_RANDOM_HAND_CARDS',
      actor,
      target: targetRole,
      count: normalizedCount,
    });
  };

  const revealHand = () => {
    if (isSoloMode || !canInteract || gameStateRef.current.gameStatus !== 'playing') return;
    const effect = buildHandRevealEffect(gameStateRef.current.cards, role);
    if (!effect) return;

    playSharedUiEffect(effect);
    sendSharedUiEffect(effect);
  };

  const handleLookAtTop = (n: number, targetRole: PlayerRole = role) => {
    if (!canLookAtTopDeck({ canInteract, gameStatus: gameState.gameStatus })) return;
    const myDeck = gameState.cards.filter(c => c.zone === `mainDeck-${targetRole}`);
    setTopDeckTargetRole(targetRole);
    setTopDeckCards(myDeck.slice(0, n));
  };

  const handleResolveTopDeck = (results: CardLogic.TopDeckResult[], targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'RESOLVE_TOP_DECK', actor: targetRole, results });
    setTopDeckCards([]);
  };

  const handleUndoCardMove = () => {
    const canUndo = isSoloMode || isHost
      ? !!gameState.lastUndoableCardMoveState
      : !!(gameState.networkHasUndoableCardMove ?? gameState.lastUndoableCardMoveState);
    if (!canUndo) return;
    const undoActor = isSoloMode
      ? gameState.lastUndoableCardMoveActor ?? role
      : role;
    dispatchGameEvent({ type: 'UNDO_CARD_MOVE', actor: undoActor });
  };

  const handleExtractCard = (
    cardId: string,
    customDestination?: string,
    targetRole?: PlayerRole,
    revealToOpponent = false
  ) => {
    const actor = targetRole ?? role;

    if (customDestination?.startsWith(`field-${actor}`)) {
      const sourceCard = gameStateRef.current.cards.find(card => card.id === cardId);
      if (sourceCard?.zone === `evolveDeck-${actor}`) {
        const resolvedSelection = resolveEvolveAutoAttachSelection(cardId);
        if (resolvedSelection?.candidateCards.length === 1) {
          executeEvolveAutoAttach(
            cardId,
            actor,
            resolvedSelection.candidateCards[0].id,
            resolvedSelection.placement
          );
          setSearchZone(null);
          return;
        }

        if (resolvedSelection && resolvedSelection.candidateCards.length > 1) {
          queueEvolveAutoAttachSelection(cardId, actor);
          setSearchZone(null);
          return;
        }
      }
    }

    dispatchGameEvent({ type: 'EXTRACT_CARD', actor, cardId, destination: customDestination, revealToOpponent });
    setSearchZone(null);
  };

  const confirmResetGame = () => {
    setShowResetConfirm(false);
    dispatchGameEvent({ type: 'RESET_GAME' });
  };

  const importDeckData = (data: ImportableDeckData, targetRole: PlayerRole = role) => {
    const payload = buildImportedDeckPayload(data, targetRole, uuid);

    dispatchGameEvent({
      type: 'IMPORT_DECK',
      actor: targetRole,
      cards: payload.cards,
      tokenOptions: payload.tokenOptions,
    });
  };

  const handleDeckUpload = (event: React.ChangeEvent<HTMLInputElement>, targetRole: PlayerRole = role) => {
    if (!canInteract) {
      event.target.value = '';
      return;
    }
    if (!canImportDeck(gameState, targetRole)) {
      event.target.value = '';
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ImportableDeckData;
        importDeckData(data, targetRole);
      } catch { alert(t('deckBuilder.alerts.importFailed')); }
    };
    reader.readAsText(file);
  };

  const spawnToken = (
    targetRole: PlayerRole = role,
    tokenOption?: TokenOption,
    destination: 'ex' | 'field' = 'ex'
  ) => {
    const selectedToken = tokenOption ?? defaultTokenOption.current;
    const newCard = buildSpawnTokenInstance(targetRole, selectedToken, destination, uuid);
    dispatchGameEvent({ type: 'SPAWN_TOKEN', actor: targetRole, token: newCard });
  };

  const spawnTokens = (
    targetRole: PlayerRole = role,
    tokenSelections: Array<{ tokenOption: TokenOption; count: number }>,
    destination: 'ex' | 'field' = 'ex'
  ) => {
    const tokens = buildSpawnTokens(targetRole, tokenSelections, destination, uuid);

    if (tokens.length === 0) return;
    if (tokens.length === 1) {
      dispatchGameEvent({ type: 'SPAWN_TOKEN', actor: targetRole, token: tokens[0] });
      return;
    }

    dispatchGameEvent({ type: 'SPAWN_TOKENS_BATCH', actor: targetRole, tokens });
  };

  const handleModifyCounter = (cardId: string, stat: 'atk' | 'hp', delta: number, actor?: PlayerRole) => {
    dispatchGameEvent({ type: 'MODIFY_COUNTER', actor, cardId, stat, delta });
  };

  const handleModifyGenericCounter = (cardId: string, delta: number, actor?: PlayerRole) => {
    dispatchGameEvent({ type: 'MODIFY_GENERIC_COUNTER', actor, cardId, delta });
  };

  const getSoloCardMoveActor = (cardId: string): PlayerRole | undefined => {
    if (!isSoloMode) return undefined;
    return gameStateRef.current.cards.find(card => card.id === cardId)?.owner;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const cardId = active.id as string;
    const overId = over.id as string;

    const sourceCard = gameStateRef.current.cards.find(card => card.id === cardId);
    const overCard = gameStateRef.current.cards.find(card => card.id === overId);
    const overRootCard = overCard ? findUnitRootCard(gameStateRef.current.cards, overCard) : undefined;
    const overCatalogCard = overRootCard ? cardCatalogByIdRef.current[overRootCard.cardId] : undefined;

    const isEquipmentManualLink =
      Boolean(
        sourceCard &&
        overRootCard &&
        cardId !== overId &&
        isTokenEquipmentCard(sourceCard, tokenEquipmentCardIdsRef.current) &&
        (sourceCard.zone === `field-${sourceCard.owner}` || sourceCard.zone === `ex-${sourceCard.owner}`) &&
        overRootCard.zone === `field-${sourceCard.owner}` &&
        overRootCard.owner === sourceCard.owner &&
        isEquipmentLinkTargetCard(overRootCard, overCatalogCard)
      );

    if (
      sourceCard &&
      overCard &&
      cardId !== overId &&
      (
        (
          fieldLinkCardIdsRef.current.has(sourceCard.cardId) &&
          overCard.zone === `field-${sourceCard.owner}` &&
          overCard.owner === sourceCard.owner
        ) ||
        isEquipmentManualLink
      )
    ) {
      dispatchGameEvent({
        type: 'LINK_CARD_TO_FIELD',
        actor: sourceCard.owner,
        cardId,
        parentCardId: overRootCard?.id ?? overId,
      });
      return;
    }

    if (
      sourceCard &&
      sourceCard.zone === `evolveDeck-${sourceCard.owner}` &&
      overId === `field-${sourceCard.owner}`
    ) {
      const resolvedSelection = resolveEvolveAutoAttachSelection(cardId);
      if (resolvedSelection?.candidateCards.length === 1) {
        executeEvolveAutoAttach(
          cardId,
          sourceCard.owner,
          resolvedSelection.candidateCards[0].id,
          resolvedSelection.placement
        );
        return;
      }

      if (resolvedSelection && resolvedSelection.candidateCards.length > 1) {
        queueEvolveAutoAttachSelection(cardId, sourceCard.owner);
        return;
      }
    }

    dispatchGameEvent({
      type: 'MOVE_CARD',
      actor: isSoloMode ? sourceCard?.owner : undefined,
      cardId,
      overId,
    });
  };

  const toggleTap = (cardId: string) => {
    dispatchGameEvent({ type: 'TOGGLE_TAP', cardId });
  };

  const handleFlipCard = (cardId: string, targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'TOGGLE_FLIP', actor: targetRole, cardId });
  };

  const handleSendToBottom = (cardId: string) => {
    dispatchGameEvent({ type: 'SEND_TO_BOTTOM', actor: getSoloCardMoveActor(cardId), cardId });
  };

  const handleBanish = (cardId: string) => {
    dispatchGameEvent({ type: 'BANISH_CARD', actor: getSoloCardMoveActor(cardId), cardId });
  };

  const handlePlayToField = (cardId: string, targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'PLAY_TO_FIELD', actor: targetRole ?? getSoloCardMoveActor(cardId), cardId });
  };

  const handleDeclareAttack = (
    attackerCardId: string,
    target: AttackTarget,
    targetRole?: PlayerRole
  ) => {
    dispatchGameEvent({ type: 'ATTACK_DECLARATION', actor: targetRole, attackerCardId, target });
  };

  const handleSetRevealHandsMode = (enabled: boolean) => {
    dispatchGameEvent({ type: 'SET_REVEAL_HANDS_MODE', enabled });
  };

  const handleSetEndStop = (enabled: boolean) => {
    dispatchGameEvent({ type: 'SET_END_STOP', enabled });
  };

  const handleSendToCemetery = (cardId: string) => {
    dispatchGameEvent({ type: 'SEND_TO_CEMETERY', actor: getSoloCardMoveActor(cardId), cardId });
  };

  const handleReturnEvolve = (cardId: string) => {
    dispatchGameEvent({ type: 'RETURN_EVOLVE', actor: getSoloCardMoveActor(cardId), cardId });
  };

  const handleShuffleDeck = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'SHUFFLE_DECK', actor: targetRole });
  };

  const getCards = (zone: string) => gameState.cards.filter(c => c.zone === zone);
  const getTokenOptions = (targetRole: PlayerRole) => [
    defaultTokenOption.current,
    ...gameState.tokenOptions[targetRole],
  ];

  return {
    room, mode, isSoloMode, isHost, isSpectator, role, status, connectionState, canInteract, canView, attemptReconnect, gameState, savedSessionCandidate, resumeSavedSession, discardSavedSession, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage, cardPlayMessage, attackMessage, attackHistory, eventHistory, attackVisual, revealedCardsOverlay,
    cardStatLookup, cardDetailLookup,
    isRollingDice, diceValue, mulliganOrder, isMulliganModalOpen, setIsMulliganModalOpen,
    handleStatChange, setPhase, endTurn, handleUndoTurn, handleSetInitialTurnOrder,
    handlePureCoinFlip, handleRollDice, handleStartGame, handleToggleReady,
    handleDrawInitialHand, startMulligan, handleMulliganOrderSelect, executeMulligan,
    drawCard, handleExtractCard, confirmResetGame, handleDeckUpload, importDeckData, spawnToken, spawnTokens,
    handleModifyCounter, handleModifyGenericCounter, handleDragEnd, toggleTap, handleFlipCard, handleSendToBottom,
    handleBanish, handlePlayToField, handleSendToCemetery, handleReturnEvolve, handleShuffleDeck, handleDeclareAttack,
    handleSetRevealHandsMode, handleSetEndStop,
    evolveAutoAttachSelection, confirmEvolveAutoAttachSelection, cancelEvolveAutoAttachSelection,
    getCards, getTokenOptions, lastGameState: gameState.lastGameState, millCard, moveTopCardToEx, discardRandomHandCards, revealHand,
    topDeckCards, topDeckTargetRole, setTopDeckTargetRole, handleLookAtTop, handleResolveTopDeck, setTopDeckCards,
    handleUndoCardMove, hasUndoableMove, canUndoTurn,
    isDebug
  };
};
