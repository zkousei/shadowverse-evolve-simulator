import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

import { type CardInstance } from '../../components/Card';
import { type PlayerRole, type SyncState, type TokenOption, initialState } from '../../types/game';
import { type AttackTarget, type GameSyncEvent, type SharedUiEffect } from '../../types/sync';
import { uuid } from '../../utils/helpers';
import * as CardLogic from '../../utils/card/cardLogic';

import { applyGameSyncEvent } from '../../utils/gameBoard/gameSyncReducer';
import { flipSharedCoin, rollSharedDie } from '../../utils/gameBoard/sharedRandom';
import { createEventDeduper } from '../../utils/gameBoard/eventDeduper';
import { buildTopDeckRevealEffect } from '../../utils/gameBoard/topDeckReveal';
import { buildTopDeckSummaryEffect } from '../../utils/gameBoard/topDeckSummary';
import { buildCardRevealEffect } from '../../utils/gameBoard/cardReveal';
import { buildAttackDeclaredEffect } from '../../utils/gameBoard/attackUi';
import { buildCardPlayedEffect } from '../../utils/gameBoard/cardPlayUi';
import { resolveCardDisplayName } from '../../utils/card/cardDetails';

import {
  buildSnapshotRequestMessage,
  buildSnapshotSyncMessage,
} from '../../utils/gameBoard/network/gameBoardNetworkMessages';
import { getConnectionOpenDecision } from '../../utils/gameBoard/network/gameBoardConnectionOpen';
import { getConnectionTerminationDecision } from '../../utils/gameBoard/network/gameBoardConnectionTermination';
import { getPeerOpenDecision } from '../../utils/gameBoard/network/gameBoardPeerOpen';
import { getPeerTerminationDecision } from '../../utils/gameBoard/network/gameBoardPeerTermination';
import { getSnapshotApplicationDecision } from '../../utils/gameBoard/snapshot/gameBoardSnapshotApplication';
import { getSnapshotRetryTimeoutDecision } from '../../utils/gameBoard/snapshot/gameBoardSnapshotRetry';
import { buildDebugGameBoardState } from '../../utils/gameBoard/gameBoardDebugState';
import { getCanUndoMove, getCanUndoTurn } from '../../utils/gameBoard/gameBoardUndoAvailability';
import { getTurnMessageDecision } from '../../utils/gameBoard/gameBoardTurnMessage';
import { MAX_SPECTATOR_CONNECTIONS } from '../../utils/gameBoard/gameBoardSpectators';

import { getCanInteractWithGameBoard, getCanViewGameBoard } from '../../utils/gameBoard/gameBoardInteraction';
import {
  buildGameBoardEvolveAutoAttachSelection,
  type PendingGameBoardEvolveAutoAttachSelection,
} from '../../utils/gameBoard/gameBoardEvolveAutoAttachSelection';

import { useGameBoardCatalogResources } from './useGameBoardCatalogResources';
import { useGameBoardConnectionSetup } from './useGameBoardConnectionSetup';
import { useGameBoardConnectionLifecycleState } from './useGameBoardConnectionLifecycleState';
import { useGameBoardIncomingMessages } from './useGameBoardIncomingMessages';
import { useGameBoardSnapshotMessaging } from './useGameBoardSnapshotMessaging';
import { useGameBoardSharedUiEffects } from './useGameBoardSharedUiEffects';
import { useGameBoardSessionPersistence } from './useGameBoardSessionPersistence';
import { useGameBoardSetupActions } from './useGameBoardSetupActions';
import { useGameBoardFieldActions } from './useGameBoardFieldActions';
import { useGameBoardCardActions } from './useGameBoardCardActions';
import { useGameBoardSystemActions } from './useGameBoardSystemActions';
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
  | { type: 'MOVE_TOP_CARD_TO_BANISH'; actor?: PlayerRole }
  | { type: 'TOGGLE_TAP'; actor?: PlayerRole; cardId: string }
  | { type: 'TOGGLE_FLIP'; actor?: PlayerRole; cardId: string }
  | { type: 'SET_CARD_FACE'; actor?: PlayerRole; cardId: string; faceSide: 'front' | 'back' }
  | { type: 'SEND_TO_BOTTOM'; actor?: PlayerRole; cardId: string }
  | { type: 'SEND_TO_BOTTOM_BATCH'; actor?: PlayerRole; cardIds: string[] }
  | { type: 'BANISH_CARD'; actor?: PlayerRole; cardId: string }
  | { type: 'BANISH_CARDS_BATCH'; actor?: PlayerRole; cardIds: string[] }
  | { type: 'SEND_TO_CEMETERY'; actor?: PlayerRole; cardId: string }
  | { type: 'SEND_TO_CEMETERY_BATCH'; actor?: PlayerRole; cardIds: string[] }
  | { type: 'DISCARD_RANDOM_HAND_CARDS'; actor?: PlayerRole; target: PlayerRole; count: number }
  | { type: 'RETURN_EVOLVE'; actor?: PlayerRole; cardId: string }
  | { type: 'PLAY_TO_FIELD'; actor?: PlayerRole; cardId: string }
  | { type: 'EXTRACT_CARD'; actor?: PlayerRole; cardId: string; destination?: string; revealToOpponent?: boolean; attachToCardId?: string }
  | { type: 'EXTRACT_CARDS_BATCH'; actor?: PlayerRole; cardIds: string[]; destination?: string; revealToOpponent?: boolean }
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
const PEER_OPEN_TIMEOUT_MS = 10_000;
const HOST_PEER_RECOVERY_DELAY_MS = 3_000;
const HOST_ROOM_RELEASE_RETRY_MS = 1_000;
const HOST_ROOM_RELEASE_MAX_RETRY_MS = 8_000;
const MAX_HOST_ROOM_RELEASE_ATTEMPTS = 10;
const MAX_PEER_RECOVERY_ATTEMPTS = 5;
const MAX_GUEST_RECOVERY_ATTEMPTS = 10;
const CONNECTION_PROTOCOL_VERSION = 2;
const CONNECTION_CAPABILITIES = ['heartbeat-v1'];

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
  const [spectatorCount, setSpectatorCount] = useState(0);
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
  const clientSessionIdRef = useRef(uuid());
  const connectionAttemptRef = useRef(0);
  const spectatorConnectionsRef = useRef<Map<string, DataConnection>>(new Map());
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
    tokenManualLinkCardIdsRef,
  } = useGameBoardCatalogResources();
  const topDeckCardsRef = useRef<CardInstance[]>([]);
  const topDeckTargetRoleRef = useRef<PlayerRole>(role);
  const awaitingInitialSnapshotRef = useRef(false);
  const activeConnectionTokenRef = useRef<string | null>(null);
  const openedSpectatorConnectionTokensRef = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerRecoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerRecoveryAttemptsRef = useRef(0);
  const guestRecoveryAttemptsRef = useRef(0);
  const createPeerTransportRef = useRef<(() => Peer | null) | null>(null);
  const snapshotRequestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRetryCountRef = useRef(0);
  const waitingForHostSessionRef = useRef(false);
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
    spectatorConnectionsRef,
  });

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearPeerRecoveryTimer = useCallback(() => {
    if (peerRecoveryTimeoutRef.current) {
      clearTimeout(peerRecoveryTimeoutRef.current);
      peerRecoveryTimeoutRef.current = null;
    }
  }, []);

  const clearSnapshotRequestTimer = useCallback(() => {
    if (snapshotRequestTimeoutRef.current) {
      clearTimeout(snapshotRequestTimeoutRef.current);
      snapshotRequestTimeoutRef.current = null;
    }
    snapshotRetryCountRef.current = 0;
    waitingForHostSessionRef.current = false;
  }, []);

  const stopAutomaticGuestRecovery = useCallback(() => {
    clearReconnectTimer();
    clearPeerRecoveryTimer();
    clearSnapshotRequestTimer();
    clearPendingSnapshotMessage();
    activeConnectionTokenRef.current = null;
    awaitingInitialSnapshotRef.current = false;
    connRef.current = null;
    const exhaustedPeer = peerRef.current;
    peerRef.current = null;
    exhaustedPeer?.destroy();
    setConnectionState('disconnected');
    setStatusKey('gameBoard.status.reconnectExhausted');
  }, [clearPeerRecoveryTimer, clearPendingSnapshotMessage, clearReconnectTimer, clearSnapshotRequestTimer]);

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
    hasCheckedSavedSession,
    hasCheckedSavedSessionRef,
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

  const isHostSessionDecisionPending = isHost
    && !isSoloMode
    && (!hasCheckedSavedSession || savedSessionCandidate !== null);
  const visibleConnectionState: ConnectionState = isHostSessionDecisionPending && connectionState === 'connected'
    ? 'reconnecting'
    : connectionState;
  const canInteract = !isHostSessionDecisionPending
    && getCanInteractWithGameBoard({ isSoloMode, isHost, isSpectator, connectionState });

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
    const nextState = applyGameSyncEvent(currentState, event, requester, { isSoloMode });
    if (nextState === currentState) return;
    applyLocalState(nextState);
    const pendingEffects: SharedUiEffect[] = [];
    const queueSnapshotEffect = (effect: SharedUiEffect | null | undefined) => {
      if (!effect) return;
      playSharedUiEffect(effect);
      pendingEffects.push(effect);
    };
    const extractDestination =
      event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH'
        ? event.destination
        : undefined;
    const extractRevealToOpponent =
      event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH'
        ? Boolean(event.revealToOpponent)
        : false;
    const extractedCardIds =
      event.type === 'EXTRACT_CARD'
        ? [event.cardId]
        : event.type === 'EXTRACT_CARDS_BATCH'
          ? event.cardIds
          : [];
    const extractedCards = extractedCardIds
      .map((cardId) => currentState.cards.find((card) => card.id === cardId))
      .filter((card): card is CardInstance => Boolean(card));
    const cardsFromZonePrefix = (cards: CardInstance[], zonePrefix: string) => (
      cards.filter((card) => card.zone.startsWith(`${zonePrefix}-`))
    );
    const getZoneOwner = (zone?: string): PlayerRole | undefined => {
      if (zone?.endsWith('-host')) return 'host';
      if (zone?.endsWith('-guest')) return 'guest';
      return undefined;
    };
    const getUniformCardOwner = (cards: CardInstance[]): PlayerRole | undefined => {
      if (cards.length === 0) return undefined;
      const firstOwner = cards[0].owner;
      return cards.every((card) => card.owner === firstOwner) ? firstOwner : undefined;
    };
    const buildOwnerContext = (
      sourceOwner?: PlayerRole,
      destinationOwner?: PlayerRole
    ): { sourceOwner?: PlayerRole; destinationOwner?: PlayerRole } => {
      const shouldIncludeOwnerContext =
        (sourceOwner !== undefined && sourceOwner !== event.actor) ||
        (destinationOwner !== undefined && destinationOwner !== event.actor);

      return shouldIncludeOwnerContext
        ? { sourceOwner, destinationOwner }
        : {};
    };
    const countCardsInZone = (zonePrefix: string) => cardsFromZonePrefix(extractedCards, zonePrefix);
    const getPreviewCardNames = (cards: CardInstance[]) => cards.slice(0, 5).map((card) => card.name);
    const mainDeckExtractedCards = countCardsInZone('mainDeck');
    const cemeteryExtractedCards = countCardsInZone('cemetery');
    const banishExtractedCards = countCardsInZone('banish');
    const evolveExtractedCards = countCardsInZone('evolveDeck');
    const extractDestinationOwner = getZoneOwner(extractDestination);
    const bottomedCardIds =
      event.type === 'SEND_TO_BOTTOM'
        ? [event.cardId]
        : event.type === 'SEND_TO_BOTTOM_BATCH'
          ? event.cardIds
          : [];
    const bottomedCards = bottomedCardIds
      .map((cardId) => currentState.cards.find((card) => card.id === cardId))
      .filter((card): card is CardInstance => Boolean(card));
    const cemeteryBottomedCards = cardsFromZonePrefix(bottomedCards, 'cemetery');
    const banishBottomedCards = cardsFromZonePrefix(bottomedCards, 'banish');
    const cemeteriedCardIds =
      event.type === 'SEND_TO_CEMETERY'
        ? [event.cardId]
        : event.type === 'SEND_TO_CEMETERY_BATCH'
          ? event.cardIds
          : [];
    const cemeteriedCards = cemeteriedCardIds
      .map((cardId) => currentState.cards.find((card) => card.id === cardId))
      .filter((card): card is CardInstance => Boolean(card));
    const mainDeckToCemeteryCards = cardsFromZonePrefix(cemeteriedCards, 'mainDeck');
    const banishedCardIds =
      event.type === 'BANISH_CARD'
        ? [event.cardId]
        : event.type === 'BANISH_CARDS_BATCH'
          ? event.cardIds
          : [];
    const banishedCards = banishedCardIds
      .map((cardId) => currentState.cards.find((card) => card.id === cardId))
      .filter((card): card is CardInstance => Boolean(card));
    const cemeteryBanishedCards = cardsFromZonePrefix(banishedCards, 'cemetery');

    if (event.type === 'RESOLVE_TOP_DECK') {
      // Embed SharedUiEffects into the snapshot so everything is sent in one
      // WebRTC message instead of three, eliminating data-channel congestion.
      const revealEffect = buildTopDeckRevealEffect(currentState.cards, event.actor, event.results);
      queueSnapshotEffect(revealEffect);
      const summaryEffect = buildTopDeckSummaryEffect(currentState.cards, event.actor, event.results);
      queueSnapshotEffect(summaryEffect);
    }

    if (
      (event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH') &&
      extractRevealToOpponent &&
      extractDestination?.startsWith('hand-')
    ) {
      // Keep public Search hand reveals in the same snapshot as the card move.
      // Sending the reveal as a second WebRTC message right after the snapshot can
      // overwhelm the data channel on slower links and disconnect guests.
      const revealEffect = buildCardRevealEffect(
        currentState.cards,
        event.actor,
        extractedCardIds,
        'REVEAL_SEARCHED_CARD_TO_HAND'
      );
      queueSnapshotEffect(revealEffect);
    }

    if (
      (event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH') &&
      !extractRevealToOpponent &&
      extractDestination?.startsWith('hand-')
    ) {
      if (mainDeckExtractedCards.length > 0) {
        const effect: SharedUiEffect = {
          type: 'SEARCHED_CARD_TO_HAND',
          actor: event.actor,
          ...buildOwnerContext(getUniformCardOwner(mainDeckExtractedCards), extractDestinationOwner),
          count: mainDeckExtractedCards.length > 1 ? mainDeckExtractedCards.length : undefined,
        };
        queueSnapshotEffect(effect);
      }
    }

    if (
      (event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH') &&
      extractDestination?.startsWith('hand-')
    ) {
      if (cemeteryExtractedCards.length > 0) {
        const effect: SharedUiEffect = {
          type: 'CEMETERY_CARD_TO_HAND',
          actor: event.actor,
          ...buildOwnerContext(getUniformCardOwner(cemeteryExtractedCards), extractDestinationOwner),
          cardName: cemeteryExtractedCards.length === 1 ? cemeteryExtractedCards[0].name : undefined,
          cardNames: cemeteryExtractedCards.length > 1 ? getPreviewCardNames(cemeteryExtractedCards) : undefined,
          count: cemeteryExtractedCards.length > 1 ? cemeteryExtractedCards.length : undefined,
        };
        queueSnapshotEffect(effect);
      }

      if (banishExtractedCards.length > 0) {
        const effect: SharedUiEffect = {
          type: 'BANISHED_CARD_TO_HAND',
          actor: event.actor,
          ...buildOwnerContext(getUniformCardOwner(banishExtractedCards), extractDestinationOwner),
          cardName: banishExtractedCards.length === 1 ? banishExtractedCards[0].name : undefined,
          cardNames: banishExtractedCards.length > 1 ? getPreviewCardNames(banishExtractedCards) : undefined,
          count: banishExtractedCards.length > 1 ? banishExtractedCards.length : undefined,
        };
        queueSnapshotEffect(effect);
      }
    }

    if (
      (event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH') &&
      (extractDestination?.startsWith('field-') || extractDestination?.startsWith('ex-'))
    ) {
      if (mainDeckExtractedCards.length > 0) {
        const isFieldDestination = extractDestination.startsWith('field-');
        // Keep the preparation-time field notification generic because starter amulet support
        // allows cards to be set face-down from the main deck before the game starts.
        const isFaceDownPlacement = isFieldDestination && currentState.gameStatus === 'preparing';
        const effect: SharedUiEffect = {
          type: 'SEARCHED_CARD_PLACED',
          actor: event.actor,
          ...buildOwnerContext(getUniformCardOwner(mainDeckExtractedCards), extractDestinationOwner),
          destination: isFieldDestination ? 'field' : 'ex',
          cardName: !isFaceDownPlacement && mainDeckExtractedCards.length === 1 ? mainDeckExtractedCards[0].name : undefined,
          count: mainDeckExtractedCards.length > 1 ? mainDeckExtractedCards.length : undefined,
          isFaceDown: isFaceDownPlacement,
        };
        queueSnapshotEffect(effect);
      }

      if (cemeteryExtractedCards.length > 0) {
        const effect: SharedUiEffect = {
          type: 'CEMETERY_CARD_PLACED',
          actor: event.actor,
          ...buildOwnerContext(getUniformCardOwner(cemeteryExtractedCards), extractDestinationOwner),
          destination: extractDestination.startsWith('field-') ? 'field' : 'ex',
          cardName: cemeteryExtractedCards.length === 1 ? cemeteryExtractedCards[0].name : undefined,
          count: cemeteryExtractedCards.length > 1 ? cemeteryExtractedCards.length : undefined,
        };
        queueSnapshotEffect(effect);
      }

      if (evolveExtractedCards.length === 1 && extractDestination.startsWith('field-')) {
        const effect: SharedUiEffect = {
          type: 'EVOLVE_CARD_PLACED',
          actor: event.actor,
          cardName: resolveCardDisplayName(evolveExtractedCards[0], cardDetailLookupRef.current),
        };
        queueSnapshotEffect(effect);
      }

      if (banishExtractedCards.length > 0) {
        const effect: SharedUiEffect = {
          type: 'BANISHED_CARD_PLACED',
          actor: event.actor,
          ...buildOwnerContext(getUniformCardOwner(banishExtractedCards), extractDestinationOwner),
          destination: extractDestination.startsWith('field-') ? 'field' : 'ex',
          cardName: banishExtractedCards.length === 1 ? banishExtractedCards[0].name : undefined,
          count: banishExtractedCards.length > 1 ? banishExtractedCards.length : undefined,
        };
        queueSnapshotEffect(effect);
      }
    }

    if (event.type === 'SEND_TO_BOTTOM' || event.type === 'SEND_TO_BOTTOM_BATCH') {
      if (cemeteryBottomedCards.length > 0) {
        const effect: SharedUiEffect = {
          type: 'CEMETERY_CARD_TO_BOTTOM',
          actor: event.actor,
          ...buildOwnerContext(getUniformCardOwner(cemeteryBottomedCards), getUniformCardOwner(cemeteryBottomedCards)),
          cardName: cemeteryBottomedCards.length === 1 ? cemeteryBottomedCards[0].name : undefined,
          cardNames: cemeteryBottomedCards.length > 1 ? getPreviewCardNames(cemeteryBottomedCards) : undefined,
          count: cemeteryBottomedCards.length > 1 ? cemeteryBottomedCards.length : undefined,
        };
        queueSnapshotEffect(effect);
      }

      if (banishBottomedCards.length > 0) {
        const effect: SharedUiEffect = {
          type: 'BANISHED_CARD_TO_BOTTOM',
          actor: event.actor,
          ...buildOwnerContext(getUniformCardOwner(banishBottomedCards), getUniformCardOwner(banishBottomedCards)),
          cardName: banishBottomedCards.length === 1 ? banishBottomedCards[0].name : undefined,
          cardNames: banishBottomedCards.length > 1 ? getPreviewCardNames(banishBottomedCards) : undefined,
          count: banishBottomedCards.length > 1 ? banishBottomedCards.length : undefined,
        };
        queueSnapshotEffect(effect);
      }
    }

    if (event.type === 'SEND_TO_CEMETERY' || event.type === 'SEND_TO_CEMETERY_BATCH') {
      if (mainDeckToCemeteryCards.length > 0) {
        const effect: SharedUiEffect = {
          type: 'MAIN_DECK_CARD_TO_CEMETERY',
          actor: event.actor,
          ...buildOwnerContext(getUniformCardOwner(mainDeckToCemeteryCards), getUniformCardOwner(mainDeckToCemeteryCards)),
          cardName: mainDeckToCemeteryCards.length === 1 ? mainDeckToCemeteryCards[0].name : undefined,
          cardNames: mainDeckToCemeteryCards.length > 1 ? getPreviewCardNames(mainDeckToCemeteryCards) : undefined,
          count: mainDeckToCemeteryCards.length > 1 ? mainDeckToCemeteryCards.length : undefined,
        };
        queueSnapshotEffect(effect);
      }
    }

    if (event.type === 'BANISH_CARD' || event.type === 'BANISH_CARDS_BATCH') {
      if (cemeteryBanishedCards.length > 0) {
        const effect: SharedUiEffect = {
          type: 'CEMETERY_CARD_TO_BANISH',
          actor: event.actor,
          ...buildOwnerContext(getUniformCardOwner(cemeteryBanishedCards), getUniformCardOwner(cemeteryBanishedCards)),
          cardName: cemeteryBanishedCards.length === 1 ? cemeteryBanishedCards[0].name : undefined,
          cardNames: cemeteryBanishedCards.length > 1 ? getPreviewCardNames(cemeteryBanishedCards) : undefined,
          count: cemeteryBanishedCards.length > 1 ? cemeteryBanishedCards.length : undefined,
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
          cardName: resolveCardDisplayName(toggledCard, cardDetailLookupRef.current),
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
    if (event.type === 'MOVE_TOP_CARD_TO_BANISH') {
      const movedCard = currentState.cards.find(card => card.zone === `mainDeck-${event.actor}`);
      if (movedCard) {
        const effect: SharedUiEffect = {
          type: 'TOP_CARD_TO_BANISH_COMPLETED',
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
  }, [applyLocalState, cardDetailLookupRef, isSoloMode, playSharedUiEffect, role, sendSharedUiEffect, sendSnapshot]);

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
    connectionAttemptRef.current += 1;
    const conn = peer.connect(`sv-evolve-${room}`, {
      metadata: {
        connectionRole: isSpectator ? 'spectator' : 'guest',
        protocolVersion: CONNECTION_PROTOCOL_VERSION,
        capabilities: CONNECTION_CAPABILITIES,
        clientSessionId: clientSessionIdRef.current,
        connectionAttempt: connectionAttemptRef.current,
      },
    });
    setupConnectionRef.current(conn);
  }, [isHost, isSoloMode, isSpectator, room]);

  const scheduleReconnectAttempt = useCallback(() => {
    if (guestRecoveryAttemptsRef.current >= MAX_GUEST_RECOVERY_ATTEMPTS) {
      stopAutomaticGuestRecovery();
      return;
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      guestRecoveryAttemptsRef.current += 1;
      connectToHost();
    }, RECONNECT_DELAY_MS);
  }, [connectToHost, stopAutomaticGuestRecovery]);

  const scheduleReconnect = useCallback((messageKey: GameBoardStatusKey) => {
    if (isSoloMode || isHost) return;
    clearReconnectTimer();
    setConnectionState('reconnecting');
    setStatusKey(messageKey);
    resetTransientUiState();
    if (!peerRecoveryTimeoutRef.current) {
      scheduleReconnectAttempt();
    }
  }, [clearReconnectTimer, isHost, isSoloMode, resetTransientUiState, scheduleReconnectAttempt]);

  const attemptAutomaticReconnect = useCallback(() => {
    if (isSoloMode || isHost) return;
    clearReconnectTimer();
    if (guestRecoveryAttemptsRef.current >= MAX_GUEST_RECOVERY_ATTEMPTS) {
      stopAutomaticGuestRecovery();
      return;
    }
    guestRecoveryAttemptsRef.current += 1;
    connectToHost();
  }, [clearReconnectTimer, connectToHost, isHost, isSoloMode, stopAutomaticGuestRecovery]);

  const attemptReconnect = useCallback(() => {
    if (isSoloMode || isHost) return;
    guestRecoveryAttemptsRef.current = 0;
    peerRecoveryAttemptsRef.current = 0;
    clearReconnectTimer();
    clearPeerRecoveryTimer();
    setConnectionState('connecting');
    setStatusKey('gameBoard.status.connectingToHost');
    const peer = peerRef.current;
    if (!peer || peer.destroyed) {
      createPeerTransportRef.current?.();
      return;
    }
    connectToHost();
  }, [clearPeerRecoveryTimer, clearReconnectTimer, connectToHost, isHost, isSoloMode]);

  const isActiveConnectionToken = useCallback((token: string) => {
    return activeConnectionTokenRef.current === token;
  }, []);

  const isActiveSpectatorConnectionToken = useCallback((token: string) => {
    return spectatorConnectionsRef.current.has(token);
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

    if (waitingForHostSessionRef.current) {
      if (retryDecision === 'reconnect') {
        clearSnapshotRequestTimer();
        setStatusKey('gameBoard.status.syncTimedOut');
        attemptAutomaticReconnect();
        return;
      }
      snapshotRetryCountRef.current += 1;
      retrySnapshotRequest(conn, token);
      return;
    }

    if (retryDecision === 'reconnect') {
      clearSnapshotRequestTimer();
      setStatusKey('gameBoard.status.syncTimedOut');
      attemptAutomaticReconnect();
      return;
    }

    snapshotRetryCountRef.current += 1;
    setStatusKey('gameBoard.status.waitingForRestore');
    retrySnapshotRequest(conn, token);
  }, [attemptAutomaticReconnect, clearSnapshotRequestTimer, isCurrentActiveConnection]);

  const requestSnapshotWithRetry = useCallback(function requestSnapshotWithRetry(conn: DataConnection, token: string) {
    if (isSoloMode || isHost) return;
    if (!isActiveConnectionToken(token) || !conn.open) return;

    try {
      conn.send(buildSnapshotRequestMessage(gameStateRef.current.revision, isSpectator ? 'guest' : role));
    } catch {
      conn.close();
      return;
    }

    if (snapshotRequestTimeoutRef.current) {
      clearTimeout(snapshotRequestTimeoutRef.current);
    }

    snapshotRequestTimeoutRef.current = setTimeout(() => {
      handleSnapshotRequestTimeout(conn, token, requestSnapshotWithRetry);
    }, SNAPSHOT_REQUEST_TIMEOUT_MS);
  }, [handleSnapshotRequestTimeout, isActiveConnectionToken, isHost, isSoloMode, isSpectator, role]);

  const handleWaitingForHostSession = useCallback(() => {
    waitingForHostSessionRef.current = true;
    const conn = connRef.current;
    const token = activeConnectionTokenRef.current;
    if (!conn || !token) return;

    snapshotRequestTimeoutRef.current = setTimeout(() => {
      requestSnapshotWithRetry(conn, token);
    }, RECONNECT_DELAY_MS);
  }, [requestSnapshotWithRetry]);

  const handleHostSnapshotReady = useCallback(() => {
    guestRecoveryAttemptsRef.current = 0;
    setConnectionState('connected');
  }, []);

  const {
    handleIncomingConnectionData,
    handleIncomingSpectatorConnectionData,
  } = useGameBoardIncomingMessages({
    applyAuthoritativeEvent,
    awaitingInitialSnapshotRef,
    cardDetailLookupRef,
    clearSnapshotRequestTimer,
    gameStateRef,
    hasCheckedSavedSessionRef,
    isActiveConnectionToken,
    isActiveSpectatorConnectionToken,
    isHost,
    maybeApplySnapshot,
    onHostSnapshotReady: handleHostSnapshotReady,
    onWaitingForHostSession: handleWaitingForHostSession,
    playIncomingSharedUiEffects,
    reconcileOpenTopDeckCards,
    resetTransientUiState,
    savedSessionCandidateRef,
    setStatusKey,
  });

  const {
    clearActiveConnectionLifecycleState,
    clearSpectatorConnectionLifecycleState,
    markSpectatorConnectionOpen,
    pruneInactiveSpectatorConnections,
    removeSpectatorConnection,
    prepareActiveConnection,
    prepareSpectatorConnection,
  } = useGameBoardConnectionLifecycleState({
    activeConnectionTokenRef,
    awaitingInitialSnapshotRef,
    clearPendingSnapshotMessage,
    clearReconnectTimer,
    clearSnapshotRequestTimer,
    connRef,
    openedSpectatorConnectionTokensRef,
    spectatorConnectionsRef,
    setSpectatorCount,
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

    const openDecision = getConnectionOpenDecision({ isHost });
    setStatusKey(openDecision.statusKey);

    if (openDecision.type === 'host') {
      setConnectionState('connected');
      return;
    }

    setConnectionState('reconnecting');

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
    connRef,
    handleConnectionLifecycleEvent,
    handleConnectionOpen,
    handleIncomingConnectionData,
    handleIncomingSpectatorConnectionData,
    isActiveSpectatorConnectionToken,
    isHost,
    markSpectatorConnectionOpen,
    prepareActiveConnection,
    pruneInactiveSpectatorConnections,
    removeSpectatorConnection,
    prepareSpectatorConnection,
    spectatorConnectionsRef,
    uuidFactory: uuid,
  });

  useEffect(() => {
    setupConnectionRef.current = setupConnection;
  }, [setupConnection]);

  useEffect(() => {
    if (!isSpectator) return undefined;

    const leaveSpectatorRoom = () => {
      const conn = connRef.current;
      if (!conn?.open) return;

      conn.send({ type: 'SPECTATOR_LEAVE' });
      conn.close();
    };

    window.addEventListener('pagehide', leaveSpectatorRoom);
    return () => {
      window.removeEventListener('pagehide', leaveSpectatorRoom);
    };
  }, [isSpectator]);

  const handlePeerOpen = useCallback(() => {
    if (connRef.current?.open) {
      if (!isHost && awaitingInitialSnapshotRef.current) {
        setConnectionState('reconnecting');
        setStatusKey('gameBoard.status.connectedHostSyncing');
        return;
      }
      setConnectionState('connected');
      setStatusKey(isHost ? 'gameBoard.status.guestConnectedReady' : 'gameBoard.status.connectedHostReady');
      return;
    }

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

    setConnectionState('reconnecting');
    setStatusKey(terminationDecision.statusKey);
    resetTransientUiState();
    clearReconnectTimer();

    if (peerRecoveryTimeoutRef.current) return;
    if (!isHost && guestRecoveryAttemptsRef.current >= MAX_GUEST_RECOVERY_ATTEMPTS) {
      stopAutomaticGuestRecovery();
      return;
    }
    if (peerRecoveryAttemptsRef.current >= MAX_PEER_RECOVERY_ATTEMPTS) {
      if (!isHost) {
        stopAutomaticGuestRecovery();
        return;
      }
      setConnectionState('disconnected');
      const exhaustedPeer = peerRef.current;
      peerRef.current = null;
      exhaustedPeer?.destroy();
      return;
    }

    const delay = isHost ? HOST_PEER_RECOVERY_DELAY_MS : RECONNECT_DELAY_MS;
    peerRecoveryTimeoutRef.current = setTimeout(() => {
      peerRecoveryTimeoutRef.current = null;
      peerRecoveryAttemptsRef.current += 1;
      if (!isHost) guestRecoveryAttemptsRef.current += 1;
      createPeerTransportRef.current?.();
    }, delay);
  }, [clearReconnectTimer, isHost, resetTransientUiState, stopAutomaticGuestRecovery]);

  const cleanupPeerLifecycle = useCallback((peer: Peer) => {
    clearReconnectTimer();
    clearActiveConnectionLifecycleState();
    clearSpectatorConnectionLifecycleState();
    peer.destroy();
  }, [clearActiveConnectionLifecycleState, clearReconnectTimer, clearSpectatorConnectionLifecycleState]);

  const createPeerTransport = useCallback(() => {
    if (isSoloMode || !room) return null;

    clearReconnectTimer();

    const previousPeer = peerRef.current;
    if (previousPeer) {
      peerRef.current = null;
      clearActiveConnectionLifecycleState();
      clearSpectatorConnectionLifecycleState();
      previousPeer.destroy();
    }

    setConnectionState(peerRecoveryAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');
    const peerId = isHost ? `sv-evolve-${room}` : undefined;
    const peer = peerId ? new Peer(peerId) : new Peer();
    peerRef.current = peer;
    let opened = false;

    const openTimeout = setTimeout(() => {
      if (peerRef.current !== peer || opened) return;
      handlePeerTermination('error');
    }, PEER_OPEN_TIMEOUT_MS);

    peer.on('open', handlePeerOpen);
    peer.on('open', () => {
      if (peerRef.current !== peer) return;
      opened = true;
      clearTimeout(openTimeout);
      clearPeerRecoveryTimer();
      peerRecoveryAttemptsRef.current = 0;
    });
    peer.on('connection', handlePeerIncomingConnection);
    peer.on('disconnected', () => {
      if (peerRef.current !== peer) return;
      clearTimeout(openTimeout);
      if (!peer.destroyed && peer.disconnected) {
        try {
          peer.reconnect();
        } catch {
          if (!isHost) handlePeerTermination('disconnected');
        }
      }
      if (!isHost && connRef.current?.open) {
        return;
      }
      handlePeerTermination('disconnected');
    });
    peer.on('error', (error: { type?: string }) => {
      if (peerRef.current !== peer) return;
      clearTimeout(openTimeout);
      if (isHost && error?.type === 'unavailable-id' && !peerRecoveryTimeoutRef.current) {
        if (peerRecoveryAttemptsRef.current >= MAX_HOST_ROOM_RELEASE_ATTEMPTS) {
          handlePeerTermination('error');
          return;
        }
        setConnectionState('reconnecting');
        setStatusKey('gameBoard.status.p2pErrorWaiting');
        const retryDelay = Math.min(
          HOST_ROOM_RELEASE_RETRY_MS * (2 ** Math.min(peerRecoveryAttemptsRef.current, 3)),
          HOST_ROOM_RELEASE_MAX_RETRY_MS
        );
        peerRecoveryTimeoutRef.current = setTimeout(() => {
          peerRecoveryTimeoutRef.current = null;
          peerRecoveryAttemptsRef.current += 1;
          createPeerTransportRef.current?.();
        }, retryDelay);
        return;
      }
      handlePeerTermination('error');
    });

    return peer;
  }, [
    clearActiveConnectionLifecycleState,
    clearPeerRecoveryTimer,
    clearReconnectTimer,
    clearSpectatorConnectionLifecycleState,
    handlePeerIncomingConnection,
    handlePeerOpen,
    handlePeerTermination,
    isHost,
    isSoloMode,
    room,
  ]);

  useEffect(() => {
    createPeerTransportRef.current = createPeerTransport;
  }, [createPeerTransport]);

  useEffect(() => {
    if (isSoloMode) {
      setStatusKey('gameBoard.status.soloMode');
      setConnectionState('connected');
      processedEventDeduperRef.current.reset();
      return;
    }
    if (!room) return;
    processedEventDeduperRef.current.reset();
    const peer = createPeerTransport();
    if (!peer) return;

    return () => {
      clearPeerRecoveryTimer();
      const activePeer = peerRef.current;
      peerRef.current = null;
      if (activePeer) cleanupPeerLifecycle(activePeer);
    };
  }, [cleanupPeerLifecycle, clearPeerRecoveryTimer, createPeerTransport, room, isSoloMode]); // gameState を除外して接続ループを防ぐ

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

  const {
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
  } = useGameBoardSystemActions({
    canInteract,
    canUndoTurn,
    isRollingDice,
    phaseActor: isSoloMode ? gameState.turnPlayer : undefined,
    isSoloMode,
    showTimedTurnMessage,
    t,
    dispatchGameEvent,
  });

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

  const {
    drawCard,
    millCard,
    moveTopCardToEx,
    moveTopCardToBanish,
    discardRandomHandCards,
    revealHand,
    revealSelectedHandCards,
    handleLookAtTop,
    handleResolveTopDeck,
    handleUndoCardMove,
  } = useGameBoardCardActions({
    canInteract,
    gameStatus: gameState.gameStatus,
    gameStateCards: gameState.cards,
    lastUndoableCardMoveState: gameState.lastUndoableCardMoveState,
    lastUndoableCardMoveActor: gameState.lastUndoableCardMoveActor,
    networkHasUndoableCardMove: gameState.networkHasUndoableCardMove,
    isSoloMode,
    isHost,
    role,
    playSharedUiEffect,
    sendSharedUiEffect,
    dispatchGameEvent,
    setTopDeckTargetRole,
    setTopDeckCards,
  });



  const {
    handleExtractCard,
    handleExtractCards,
    spawnToken,
    spawnTokens,
    handleModifyCounter,
    handleModifyGenericCounter,
    handleDragEnd,
    toggleTap,
    handleFlipCard,
    handleSetCardFace,
    handleSendToBottom,
    handleSendCardsToBottom,
    handleBanish,
    handleBanishCards,
    handlePlayToField,
    handleDeclareAttack,
    handleSetRevealHandsMode,
    handleSetEndStop,
    handleSendToCemetery,
    handleSendCardsToCemetery,
    handleReturnEvolve,
    handleShuffleDeck,
  } = useGameBoardFieldActions({
    gameStateRef,
    isSoloMode,
    role,
    uuid,
    defaultTokenOption,
    cardCatalogByIdRef,
    tokenManualLinkCardIdsRef,
    fieldLinkCardIdsRef,
    setSearchZone,
    resolveEvolveAutoAttachSelection,
    executeEvolveAutoAttach,
    queueEvolveAutoAttachSelection,
    dispatchGameEvent,
  });

  const {
    confirmResetGame,
    importDeckData,
    handleDeckUpload,
  } = useGameBoardSetupActions({
    canInteract,
    gameState,
    role,
    uuid,
    dispatchGameEvent,
    setShowResetConfirm,
    t,
  });



  const getCards = (zone: string) => gameState.cards.filter(c => c.zone === zone);
  const getTokenOptions = (targetRole: PlayerRole) => [
    defaultTokenOption.current,
    ...gameState.tokenOptions[targetRole],
  ];

  return {
    room, mode, isSoloMode, isHost, isSpectator, role, status, connectionState: visibleConnectionState, spectatorCount, maxSpectatorConnections: MAX_SPECTATOR_CONNECTIONS, canInteract, canView, attemptReconnect, gameState, savedSessionCandidate, resumeSavedSession, discardSavedSession, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage, cardPlayMessage, attackMessage, attackHistory, eventHistory, attackVisual, revealedCardsOverlay,
    cardStatLookup, cardDetailLookup,
    isRollingDice, diceValue, mulliganOrder, isMulliganModalOpen, setIsMulliganModalOpen,
    handleStatChange, setPhase, endTurn, handleUndoTurn, handleSetInitialTurnOrder,
    handlePureCoinFlip, handleRollDice, handleStartGame, handleToggleReady,
    handleDrawInitialHand, startMulligan, handleMulliganOrderSelect, executeMulligan,
    drawCard, handleExtractCard, handleExtractCards, confirmResetGame, handleDeckUpload, importDeckData, spawnToken, spawnTokens,
    handleModifyCounter, handleModifyGenericCounter, handleDragEnd, toggleTap, handleFlipCard, handleSetCardFace, handleSendToBottom, handleSendCardsToBottom,
    handleBanish, handleBanishCards, handlePlayToField, handleSendToCemetery, handleSendCardsToCemetery, handleReturnEvolve, handleShuffleDeck, handleDeclareAttack,
    handleSetRevealHandsMode, handleSetEndStop,
    evolveAutoAttachSelection, confirmEvolveAutoAttachSelection, cancelEvolveAutoAttachSelection,
    getCards, getTokenOptions, lastGameState: gameState.lastGameState, millCard, moveTopCardToEx, moveTopCardToBanish, discardRandomHandCards, revealHand, revealSelectedHandCards,
    topDeckCards, topDeckTargetRole, setTopDeckTargetRole, handleLookAtTop, handleResolveTopDeck, setTopDeckCards,
    handleUndoCardMove, hasUndoableMove, canUndoTurn,
    isDebug
  };
};
