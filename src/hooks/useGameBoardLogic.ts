import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Peer, { type DataConnection } from 'peerjs';
import { type DragEndEvent } from '@dnd-kit/core';
import { type CardInstance } from '../components/Card';
import { type PlayerRole, type SyncState, type TokenOption, initialState } from '../types/game';
import { type AttackTarget, type GameSyncEvent, type PublicCardView, type SharedUiEffect, type SyncMessage } from '../types/sync';
import { uuid } from '../utils/helpers';
import * as CardLogic from '../utils/cardLogic';
import { canImportDeck } from '../utils/gameRules';
import { applyGameSyncEvent } from '../utils/gameSyncReducer';
import { flipSharedCoin, formatSharedUiMessage, getSharedActorLabel, rollSharedDie } from '../utils/sharedRandom';
import { createEventDeduper } from '../utils/eventDeduper';
import { buildTopDeckRevealEffect } from '../utils/topDeckReveal';
import { buildTopDeckSummaryEffect } from '../utils/topDeckSummary';
import { buildSingleCardRevealEffect } from '../utils/cardReveal';
import { buildAttackDeclaredEffect, formatAttackEffect } from '../utils/attackUi';
import { buildCardPlayedEffect, formatCardPlayedEffect } from '../utils/cardPlayUi';
import { normalizeBaseCardType } from '../utils/cardType';

type DispatchableGameSyncEvent =
  | { type: 'FLIP_SHARED_COIN'; actor?: PlayerRole }
  | { type: 'ROLL_SHARED_DIE'; actor?: PlayerRole }
  | { type: 'TOGGLE_READY'; actor?: PlayerRole }
  | { type: 'SET_PHASE'; actor?: PlayerRole; phase: SyncState['phase'] }
  | { type: 'END_TURN'; actor?: PlayerRole }
  | { type: 'START_GAME'; actor?: PlayerRole }
  | { type: 'RESET_GAME'; actor?: PlayerRole }
  | { type: 'MOVE_CARD'; actor?: PlayerRole; cardId: string; overId: string }
  | { type: 'MODIFY_COUNTER'; actor?: PlayerRole; cardId: string; stat: 'atk' | 'hp'; delta: number }
  | { type: 'MODIFY_GENERIC_COUNTER'; actor?: PlayerRole; cardId: string; delta: number }
  | { type: 'DRAW_CARD'; actor?: PlayerRole }
  | { type: 'MILL_CARD'; actor?: PlayerRole }
  | { type: 'TOGGLE_TAP'; actor?: PlayerRole; cardId: string }
  | { type: 'TOGGLE_FLIP'; actor?: PlayerRole; cardId: string }
  | { type: 'SEND_TO_BOTTOM'; actor?: PlayerRole; cardId: string }
  | { type: 'BANISH_CARD'; actor?: PlayerRole; cardId: string }
  | { type: 'SEND_TO_CEMETERY'; actor?: PlayerRole; cardId: string }
  | { type: 'RETURN_EVOLVE'; actor?: PlayerRole; cardId: string }
  | { type: 'PLAY_TO_FIELD'; actor?: PlayerRole; cardId: string }
  | { type: 'EXTRACT_CARD'; actor?: PlayerRole; cardId: string; destination?: string; revealToOpponent?: boolean }
  | { type: 'SHUFFLE_DECK'; actor?: PlayerRole }
  | { type: 'MODIFY_PLAYER_STAT'; actor?: PlayerRole; playerKey: PlayerRole; stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo'; delta: number }
  | { type: 'DRAW_INITIAL_HAND'; actor?: PlayerRole }
  | { type: 'EXECUTE_MULLIGAN'; actor?: PlayerRole; selectedIds: string[] }
  | { type: 'RESOLVE_TOP_DECK'; actor?: PlayerRole; results: CardLogic.TopDeckResult[] }
  | { type: 'IMPORT_DECK'; actor?: PlayerRole; cards: CardInstance[]; tokenOptions?: TokenOption[] }
  | { type: 'SET_INITIAL_TURN_ORDER'; actor?: PlayerRole; starter: PlayerRole; manual: boolean }
  | { type: 'UNDO_LAST_TURN'; actor?: PlayerRole; previousState: SyncState }
  | { type: 'SPAWN_TOKEN'; actor?: PlayerRole; token: CardInstance }
  | { type: 'ATTACK_DECLARATION'; actor?: PlayerRole; attackerCardId: string; target: AttackTarget };

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
type SavedHostSession = {
  room: string;
  savedAt: string;
  appVersion: string;
  state: SyncState;
};

type ImportableDeckData = {
  mainDeck?: Array<Record<string, any>>;
  evolveDeck?: Array<Record<string, any>>;
  leaderCards?: Array<Record<string, any>>;
  leaderCard?: Record<string, any>;
  tokenDeck?: Array<Record<string, any>>;
};

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
const getHostSessionStorageKey = (room: string) => `sv-evolve:host-session:${room}`;
const SNAPSHOT_REQUEST_TIMEOUT_MS = 2000;
const MAX_SNAPSHOT_REQUEST_RETRIES = 2;

const isPlayerHud = (value: unknown): value is SyncState['host'] => (
  typeof value === 'object' &&
  value !== null &&
  typeof (value as SyncState['host']).hp === 'number' &&
  typeof (value as SyncState['host']).pp === 'number' &&
  typeof (value as SyncState['host']).maxPp === 'number' &&
  typeof (value as SyncState['host']).ep === 'number' &&
  typeof (value as SyncState['host']).sep === 'number' &&
  typeof (value as SyncState['host']).combo === 'number' &&
  typeof (value as SyncState['host']).initialHandDrawn === 'boolean' &&
  typeof (value as SyncState['host']).mulliganUsed === 'boolean' &&
  typeof (value as SyncState['host']).isReady === 'boolean'
);

const isSyncState = (value: unknown): value is SyncState => (
  typeof value === 'object' &&
  value !== null &&
  isPlayerHud((value as SyncState).host) &&
  isPlayerHud((value as SyncState).guest) &&
  Array.isArray((value as SyncState).cards) &&
  ((value as SyncState).turnPlayer === 'host' || (value as SyncState).turnPlayer === 'guest') &&
  typeof (value as SyncState).turnCount === 'number' &&
  ['Start', 'Main', 'End'].includes((value as SyncState).phase) &&
  ['preparing', 'playing'].includes((value as SyncState).gameStatus) &&
  typeof (value as SyncState).tokenOptions === 'object' &&
  (value as SyncState).tokenOptions !== null &&
  Array.isArray((value as SyncState).tokenOptions.host) &&
  Array.isArray((value as SyncState).tokenOptions.guest) &&
  typeof (value as SyncState).revision === 'number'
);

const parseSavedHostSession = (rawValue: string | null, room: string): SavedHostSession | null => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<SavedHostSession>;
    if (!parsed || parsed.room !== room) return null;
    if (parsed.appVersion !== APP_VERSION) return null;
    if (typeof parsed.savedAt !== 'string') return null;
    if (!isSyncState(parsed.state)) return null;
    return {
      room: parsed.room,
      savedAt: parsed.savedAt,
      appVersion: parsed.appVersion,
      state: parsed.state,
    };
  } catch {
    return null;
  }
};

export const useGameBoardLogic = () => {
  const [searchParams] = useSearchParams();
  const room = searchParams.get('room') || '';
  const mode = searchParams.get('mode') === 'solo' ? 'solo' : 'p2p';
  const isSoloMode = mode === 'solo';
  const isHost = searchParams.get('host') === 'true';
  const role = (isSoloMode ? 'host' : (isHost ? 'host' : 'guest')) as 'host' | 'guest';
  const isDebug = searchParams.get('debug') === 'true';

  const [status, setStatus] = useState<string>('Initializing P2P...');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [gameState, setGameState] = useState<SyncState>(initialState);
  const [savedSessionCandidate, setSavedSessionCandidate] = useState<SavedHostSession | null>(null);
  const [hasCheckedSavedSession, setHasCheckedSavedSession] = useState(false);
  const [searchZone, setSearchZone] = useState<{ id: string, title: string } | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [coinMessage, setCoinMessage] = useState<string | null>(null);
  const [turnMessage, setTurnMessage] = useState<string | null>(null);
  const [cardPlayMessage, setCardPlayMessage] = useState<string | null>(null);
  const [attackMessage, setAttackMessage] = useState<string | null>(null);
  const [attackHistory, setAttackHistory] = useState<string[]>([]);
  const [eventHistory, setEventHistory] = useState<string[]>([]);
  const [attackVisual, setAttackVisual] = useState<Extract<SharedUiEffect, { type: 'ATTACK_DECLARED' }> | null>(null);
  const [revealedCardsOverlay, setRevealedCardsOverlay] = useState<{ title: string; cards: PublicCardView[]; summaryLines?: string[] } | null>(null);
  const [lastGameState, setLastGameState] = useState<SyncState | null>(null);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);

  const [mulliganOrder, setMulliganOrder] = useState<string[]>([]);
  const [isMulliganModalOpen, setIsMulliganModalOpen] = useState(false);
  const [topDeckCards, setTopDeckCards] = useState<CardInstance[]>([]);
  const defaultTokenOption = useRef<TokenOption>({
    cardId: 'token',
    name: 'Token',
    image: 'https://shadowverse-evolve.com/wordpress/wp-content/themes/shadowverse-evolve-release_v0/assets/images/common/ogp.jpg',
    baseCardType: 'follower',
  });

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const setupConnectionRef = useRef<(conn: DataConnection) => void>(() => undefined);
  const gameStateRef = useRef<SyncState>(initialState);
  const savedSessionCandidateRef = useRef<SavedHostSession | null>(null);
  const awaitingInitialSnapshotRef = useRef(false);
  const activeConnectionTokenRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRequestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRetryCountRef = useRef(0);
  const coinMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diceRollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diceFinalizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diceMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealedCardsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attackMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardPlayMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLookTopSummaryLinesRef = useRef<string[] | null>(null);
  const processedEventDeduperRef = useRef(createEventDeduper());

  const applyLocalState = useCallback((newState: SyncState) => {
    const guardedCards = CardLogic.applyStateWithGuards(newState.cards);
    const guardedState: SyncState = {
      ...newState,
      cards: CardLogic.normalizeCardsForGameState(guardedCards, newState.gameStatus)
    };
    setGameState(guardedState);
    gameStateRef.current = guardedState;
  }, []);

  const sendMessage = useCallback((message: SyncMessage) => {
    if (connRef.current?.open) {
      connRef.current.send(message);
    }
  }, []);

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

  const resetTransientUiState = useCallback(() => {
    setSearchZone(null);
    setIsMulliganModalOpen(false);
    setMulliganOrder([]);
    setTopDeckCards([]);
  }, []);

  const sendSnapshot = useCallback((state: SyncState, source: PlayerRole) => {
    sendMessage({ type: 'STATE_SNAPSHOT', state, source });
  }, [sendMessage]);

  const sendSnapshotToCurrentConnection = useCallback((state: SyncState, source: PlayerRole) => {
    if (connRef.current?.open) {
      connRef.current.send({ type: 'STATE_SNAPSHOT', state, source } satisfies SyncMessage);
    }
  }, []);

  const sendSharedUiEffect = useCallback((effect: SharedUiEffect) => {
    sendMessage({ type: 'SHARED_UI_EFFECT', effect });
  }, [sendMessage]);

  const clearCoinMessageTimer = useCallback(() => {
    if (coinMessageTimeoutRef.current) {
      clearTimeout(coinMessageTimeoutRef.current);
      coinMessageTimeoutRef.current = null;
    }
  }, []);

  const showTimedCoinMessage = useCallback((message: string, durationMs: number) => {
    clearCoinMessageTimer();
    setCoinMessage(message);
    coinMessageTimeoutRef.current = setTimeout(() => {
      setCoinMessage(null);
      coinMessageTimeoutRef.current = null;
    }, durationMs);
  }, [clearCoinMessageTimer]);

  const clearDiceTimers = useCallback(() => {
    if (diceRollIntervalRef.current) {
      clearInterval(diceRollIntervalRef.current);
      diceRollIntervalRef.current = null;
    }
    if (diceFinalizeTimeoutRef.current) {
      clearTimeout(diceFinalizeTimeoutRef.current);
      diceFinalizeTimeoutRef.current = null;
    }
    if (diceMessageTimeoutRef.current) {
      clearTimeout(diceMessageTimeoutRef.current);
      diceMessageTimeoutRef.current = null;
    }
  }, []);

  const clearRevealedCardsTimer = useCallback(() => {
    if (revealedCardsTimeoutRef.current) {
      clearTimeout(revealedCardsTimeoutRef.current);
      revealedCardsTimeoutRef.current = null;
    }
    pendingLookTopSummaryLinesRef.current = null;
  }, []);

  const clearAttackMessageTimer = useCallback(() => {
    if (attackMessageTimeoutRef.current) {
      clearTimeout(attackMessageTimeoutRef.current);
      attackMessageTimeoutRef.current = null;
    }
  }, []);

  const clearAttackUiState = useCallback(() => {
    clearAttackMessageTimer();
    setAttackMessage(null);
    setAttackVisual(null);
    setAttackHistory([]);
    setEventHistory([]);
  }, [clearAttackMessageTimer]);

  const clearCardPlayMessageTimer = useCallback(() => {
    if (cardPlayMessageTimeoutRef.current) {
      clearTimeout(cardPlayMessageTimeoutRef.current);
      cardPlayMessageTimeoutRef.current = null;
    }
  }, []);

  const clearTurnMessageTimer = useCallback(() => {
    if (turnMessageTimeoutRef.current) {
      clearTimeout(turnMessageTimeoutRef.current);
      turnMessageTimeoutRef.current = null;
    }
  }, []);

  const showTimedCardPlayMessage = useCallback((message: string, durationMs: number) => {
    clearCardPlayMessageTimer();
    setCardPlayMessage(message);
    cardPlayMessageTimeoutRef.current = setTimeout(() => {
      setCardPlayMessage(null);
      cardPlayMessageTimeoutRef.current = null;
    }, durationMs);
  }, [clearCardPlayMessageTimer]);

  const showTimedTurnMessage = useCallback((message: string, durationMs: number) => {
    clearTurnMessageTimer();
    setTurnMessage(message);
    turnMessageTimeoutRef.current = setTimeout(() => {
      setTurnMessage(null);
      turnMessageTimeoutRef.current = null;
    }, durationMs);
  }, [clearTurnMessageTimer]);

  const pushEventHistory = useCallback((entry: string) => {
    setEventHistory((previous) => [entry, ...previous].slice(0, 5));
  }, []);

  useEffect(() => {
    if (
      !revealedCardsOverlay ||
      !revealedCardsOverlay.title.includes('revealed from Look Top') ||
      !pendingLookTopSummaryLinesRef.current
    ) {
      return;
    }

    const summaryLines = pendingLookTopSummaryLinesRef.current;
    pendingLookTopSummaryLinesRef.current = null;
    setRevealedCardsOverlay((previous) => {
      if (!previous || !previous.title.includes('revealed from Look Top')) return previous;
      return {
        ...previous,
        summaryLines,
      };
    });
  }, [revealedCardsOverlay]);

  const playSharedUiEffect = useCallback((effect: SharedUiEffect) => {
    if (effect.type === 'COIN_FLIP_RESULT') {
      showTimedCoinMessage(formatSharedUiMessage(effect, role, isSoloMode), 3000);
      return;
    }

    if (effect.type === 'STARTER_DECIDED') {
      showTimedCoinMessage(formatSharedUiMessage(effect, role, isSoloMode), 4000);
      return;
    }

    if (effect.type === 'REVEAL_TOP_DECK_CARDS') {
      clearRevealedCardsTimer();
      setRevealedCardsOverlay({
        title: `${getSharedActorLabel(effect.actor, role, isSoloMode)} revealed from Look Top`,
        cards: effect.cards,
        summaryLines: [],
      });
      revealedCardsTimeoutRef.current = setTimeout(() => {
        setRevealedCardsOverlay(null);
        revealedCardsTimeoutRef.current = null;
      }, 5000);
      return;
    }

    if (effect.type === 'REVEAL_SEARCHED_CARD_TO_HAND') {
      clearRevealedCardsTimer();
      pushEventHistory(`${getSharedActorLabel(effect.actor, role, isSoloMode)} revealed from Search: ${effect.cards.map((card) => card.name).join(', ')}`);
      setRevealedCardsOverlay({
        title: `${getSharedActorLabel(effect.actor, role, isSoloMode)} revealed from Search`,
        cards: effect.cards,
      });
      revealedCardsTimeoutRef.current = setTimeout(() => {
        setRevealedCardsOverlay(null);
        revealedCardsTimeoutRef.current = null;
      }, 5000);
      return;
    }

    if (effect.type === 'ATTACK_DECLARED') {
      const formattedAttack = formatAttackEffect(effect, role, isSoloMode);
      clearAttackMessageTimer();
      setAttackMessage(formattedAttack.announcement);
      setAttackVisual(effect);
      setAttackHistory(previous => [formattedAttack.history, ...previous].slice(0, 3));
      pushEventHistory(formattedAttack.history);
      attackMessageTimeoutRef.current = setTimeout(() => {
        setAttackMessage(null);
        setAttackVisual(null);
        attackMessageTimeoutRef.current = null;
      }, 2200);
      return;
    }

    if (effect.type === 'CARD_PLAYED') {
      const message = formatCardPlayedEffect(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'RESET_GAME_COMPLETED') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'SHUFFLE_DECK_COMPLETED') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      pushEventHistory(message);
      return;
    }

    if (effect.type === 'DRAW_CARD_COMPLETED') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'MILL_CARD_COMPLETED') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'SEARCHED_CARD_TO_HAND') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      pushEventHistory(message);
      return;
    }

    if (effect.type === 'SEARCHED_CARD_PLACED') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'CEMETERY_CARD_TO_HAND') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      pushEventHistory(message);
      return;
    }

    if (effect.type === 'CEMETERY_CARD_PLACED') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'EVOLVE_CARD_PLACED') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'EVOLVE_USAGE_TOGGLED') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      if (gameStateRef.current.gameStatus === 'playing') {
        pushEventHistory(message);
      }
      return;
    }

    if (effect.type === 'BANISHED_CARD_TO_HAND') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      pushEventHistory(message);
      return;
    }

    if (effect.type === 'BANISHED_CARD_PLACED') {
      const message = formatSharedUiMessage(effect, role, isSoloMode);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'LOOK_TOP_RESOLVED') {
      const summaryLines = formatSharedUiMessage(effect, role, isSoloMode).split('\n').filter(Boolean);
      pushEventHistory(summaryLines.join('\n'));
      if (revealedCardsOverlay?.title.includes('revealed from Look Top')) {
        setRevealedCardsOverlay((previous) => {
          if (!previous || !previous.title.includes('revealed from Look Top')) return previous;
          return {
            ...previous,
            summaryLines,
          };
        });
      } else if (revealedCardsTimeoutRef.current) {
        pendingLookTopSummaryLinesRef.current = summaryLines;
      } else {
        const message = summaryLines.join('\n');
        showTimedCardPlayMessage(message, 3200);
        pushEventHistory(message);
      }
      return;
    }

    clearDiceTimers();
    clearCoinMessageTimer();
    setIsRollingDice(true);
    setCoinMessage(null);

    let rolls = 0;
    const maxRolls = 15;
    diceRollIntervalRef.current = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rolls += 1;
      if (rolls >= maxRolls && diceRollIntervalRef.current) {
        clearInterval(diceRollIntervalRef.current);
        diceRollIntervalRef.current = null;
      }
    }, 60);

    diceFinalizeTimeoutRef.current = setTimeout(() => {
      if (diceRollIntervalRef.current) {
        clearInterval(diceRollIntervalRef.current);
        diceRollIntervalRef.current = null;
      }
      setDiceValue(effect.value);
      showTimedCoinMessage(formatSharedUiMessage(effect, role, isSoloMode), 3000);
      diceMessageTimeoutRef.current = setTimeout(() => {
        setIsRollingDice(false);
        setDiceValue(null);
        diceMessageTimeoutRef.current = null;
      }, 800);
      diceFinalizeTimeoutRef.current = null;
    }, 900);
  }, [clearAttackMessageTimer, clearCoinMessageTimer, clearDiceTimers, clearRevealedCardsTimer, isSoloMode, pushEventHistory, revealedCardsOverlay, role, showTimedCardPlayMessage, showTimedCoinMessage]);

  const maybeApplySnapshot = useCallback((incomingState: SyncState, source: PlayerRole) => {
    if (!isHost && source === 'host' && awaitingInitialSnapshotRef.current) {
      awaitingInitialSnapshotRef.current = false;
      applyLocalState(incomingState);
      setLastGameState(null);
      return;
    }

    const currentRevision = gameStateRef.current.revision;
    if (incomingState.revision < currentRevision) return;
    if (incomingState.revision === currentRevision && !(source === 'host' && !isHost)) return;
    applyLocalState(incomingState);
    setLastGameState(null);
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
    if (event.type === 'END_TURN') {
      setLastGameState(JSON.parse(JSON.stringify(currentState)));
    }
    const nextState = applyGameSyncEvent(currentState, event, requester);
    if (nextState === currentState) return;
    applyLocalState(nextState);
    sendSnapshot(nextState, role);

    if (event.type === 'RESOLVE_TOP_DECK') {
      const revealEffect = buildTopDeckRevealEffect(currentState.cards, event.actor, event.results);
      if (revealEffect) {
        playSharedUiEffect(revealEffect);
        sendSharedUiEffect(revealEffect);
      }
      const summaryEffect = buildTopDeckSummaryEffect(currentState.cards, event.actor, event.results);
      if (summaryEffect) {
        playSharedUiEffect(summaryEffect);
        sendSharedUiEffect(summaryEffect);
      }
    }

    if (event.type === 'EXTRACT_CARD' && event.revealToOpponent && event.destination?.startsWith('hand-')) {
      const revealEffect = buildSingleCardRevealEffect(
        currentState.cards,
        event.actor,
        event.cardId,
        'REVEAL_SEARCHED_CARD_TO_HAND'
      );
      if (revealEffect) {
        playSharedUiEffect(revealEffect);
        sendSharedUiEffect(revealEffect);
      }
    }

    if (event.type === 'EXTRACT_CARD' && !event.revealToOpponent && event.destination?.startsWith('hand-')) {
      const extractedCard = currentState.cards.find((card) => card.id === event.cardId);
      if (extractedCard?.zone === `mainDeck-${event.actor}`) {
        const effect: SharedUiEffect = {
          type: 'SEARCHED_CARD_TO_HAND',
          actor: event.actor,
        };
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
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
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }

      if (extractedCard?.zone === `banish-${event.actor}`) {
        const effect: SharedUiEffect = {
          type: 'BANISHED_CARD_TO_HAND',
          actor: event.actor,
          cardName: extractedCard.name,
        };
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
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
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }

      if (extractedCard?.zone === `cemetery-${event.actor}`) {
        const effect: SharedUiEffect = {
          type: 'CEMETERY_CARD_PLACED',
          actor: event.actor,
          destination: event.destination.startsWith('field-') ? 'field' : 'ex',
          cardName: extractedCard.name,
        };
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }

      if (extractedCard?.zone === `evolveDeck-${event.actor}` && event.destination.startsWith('field-')) {
        const effect: SharedUiEffect = {
          type: 'EVOLVE_CARD_PLACED',
          actor: event.actor,
          cardName: extractedCard.name,
        };
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }

      if (extractedCard?.zone === `banish-${event.actor}`) {
        const effect: SharedUiEffect = {
          type: 'BANISHED_CARD_PLACED',
          actor: event.actor,
          destination: event.destination.startsWith('field-') ? 'field' : 'ex',
          cardName: extractedCard.name,
        };
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }
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
    if (event.type === 'ATTACK_DECLARATION') {
      const effect = buildAttackDeclaredEffect(currentState.cards, event.actor, event.attackerCardId, event.target);
      if (effect) {
        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
      }
    }
  }, [applyLocalState, playSharedUiEffect, role, sendSharedUiEffect, sendSnapshot]);

  const dispatchGameEvent = useCallback((event: DispatchableGameSyncEvent) => {
    if (!isSoloMode && !isHost && connectionState !== 'connected') {
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
  }, [applyAuthoritativeEvent, connectionState, isHost, isSoloMode, role, sendMessage]);

  const connectToHost = useCallback(() => {
    if (isSoloMode || isHost) return;
    const peer = peerRef.current;
    if (!peer) return;

    setConnectionState(current => current === 'connected' ? 'reconnecting' : 'connecting');
    setStatus('Connecting to host...');
    const conn = peer.connect(`sv-evolve-${room}`);
    setupConnectionRef.current(conn);
  }, [isHost, isSoloMode, room]);

  const scheduleReconnect = useCallback((message: string) => {
    if (isSoloMode || isHost) return;
    clearReconnectTimer();
    setConnectionState('reconnecting');
    setStatus(message);
    resetTransientUiState();
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connectToHost();
    }, 1000);
  }, [clearReconnectTimer, connectToHost, isHost, isSoloMode, resetTransientUiState]);

  const attemptReconnect = useCallback(() => {
    if (isSoloMode || isHost) return;
    clearReconnectTimer();
    connectToHost();
  }, [clearReconnectTimer, connectToHost, isHost, isSoloMode]);

  const requestSnapshotWithRetry = useCallback(function requestSnapshotWithRetry(conn: DataConnection, token: string) {
    if (isSoloMode || isHost) return;
    if (activeConnectionTokenRef.current !== token || !conn.open) return;

    conn.send({
      type: 'REQUEST_SNAPSHOT',
      lastKnownRevision: gameStateRef.current.revision,
      source: role,
    } satisfies SyncMessage);

    if (snapshotRequestTimeoutRef.current) {
      clearTimeout(snapshotRequestTimeoutRef.current);
    }

    snapshotRequestTimeoutRef.current = setTimeout(() => {
      if (activeConnectionTokenRef.current !== token || connRef.current !== conn) {
        clearSnapshotRequestTimer();
        return;
      }

      if (snapshotRetryCountRef.current >= MAX_SNAPSHOT_REQUEST_RETRIES) {
        clearSnapshotRequestTimer();
        setStatus('Timed out waiting for host state. Reconnecting...');
        attemptReconnect();
        return;
      }

      snapshotRetryCountRef.current += 1;
      setStatus('Waiting for host session restore... retrying sync.');
      requestSnapshotWithRetry(conn, token);
    }, SNAPSHOT_REQUEST_TIMEOUT_MS);
  }, [attemptReconnect, clearSnapshotRequestTimer, isHost, isSoloMode, role]);

  const setupConnection = useCallback((conn: DataConnection) => {
    const token = uuid();
    activeConnectionTokenRef.current = token;
    clearReconnectTimer();
    clearSnapshotRequestTimer();

    if (connRef.current && connRef.current !== conn) {
      try {
        connRef.current.close();
      } catch {
        // Ignore close races on replaced connections.
      }
    }

    connRef.current = conn;
    conn.on('open', () => {
      if (activeConnectionTokenRef.current !== token) return;
      setConnectionState('connected');

      if (isHost) {
        setStatus('Guest connected! Game ready.');
        return;
      }

      awaitingInitialSnapshotRef.current = true;
      setStatus('Connected to host. Syncing latest game state...');
      requestSnapshotWithRetry(conn, token);
    });
    conn.on('data', (rawData: unknown) => {
      if (activeConnectionTokenRef.current !== token) return;
      const data = rawData as SyncMessage;
      if (data.type === 'EVENT') {
        if (isHost) {
          applyAuthoritativeEvent(data.event, 'guest');
        }
        return;
      }
      if (data.type === 'REQUEST_SNAPSHOT') {
        if (isHost) {
          if (savedSessionCandidateRef.current) {
            setStatus('Guest connected. Choose whether to resume the saved session.');
            return;
          }
          conn.send({ type: 'STATE_SNAPSHOT', state: gameStateRef.current, source: 'host' } satisfies SyncMessage);
        }
        return;
      }
      if (data.type === 'SHARED_UI_EFFECT') {
        playSharedUiEffect(data.effect);
        return;
      }
      if (data.type === 'STATE_SNAPSHOT') {
        clearSnapshotRequestTimer();
        maybeApplySnapshot(data.state, data.source);
        if (!isHost && data.source === 'host') {
          resetTransientUiState();
          setStatus('Connected to host! Game ready.');
        }
      }
    });
    conn.on('close', () => {
      if (activeConnectionTokenRef.current !== token) return;
      connRef.current = null;
      activeConnectionTokenRef.current = null;
      clearSnapshotRequestTimer();
      awaitingInitialSnapshotRef.current = false;

      if (isHost) {
        setConnectionState('disconnected');
        setStatus('Guest disconnected. Waiting for reconnection...');
        return;
      }

      scheduleReconnect('Connection lost. Reconnecting...');
    });
    conn.on('error', () => {
      if (activeConnectionTokenRef.current !== token) return;
      connRef.current = null;
      activeConnectionTokenRef.current = null;
      clearSnapshotRequestTimer();
      awaitingInitialSnapshotRef.current = false;

      if (isHost) {
        setConnectionState('disconnected');
        setStatus('Connection error. Waiting for guest...');
        return;
      }

      scheduleReconnect('Connection error. Reconnecting...');
    });
  }, [applyAuthoritativeEvent, clearReconnectTimer, clearSnapshotRequestTimer, isHost, maybeApplySnapshot, playSharedUiEffect, requestSnapshotWithRetry, resetTransientUiState, role, scheduleReconnect]);

  useEffect(() => {
    setupConnectionRef.current = setupConnection;
  }, [setupConnection]);

  useEffect(() => {
    savedSessionCandidateRef.current = savedSessionCandidate;
  }, [savedSessionCandidate]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHasCheckedSavedSession(true);
      setSavedSessionCandidate(null);
      return;
    }

    if (isSoloMode || !isHost || !room) {
      setSavedSessionCandidate(null);
      setHasCheckedSavedSession(true);
      return;
    }

    const storageKey = getHostSessionStorageKey(room);
    const parsed = parseSavedHostSession(window.sessionStorage.getItem(storageKey), room);

    if (!parsed) {
      window.sessionStorage.removeItem(storageKey);
    }

    setSavedSessionCandidate(parsed);
    setHasCheckedSavedSession(true);
  }, [isHost, isSoloMode, room]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasCheckedSavedSession || isSoloMode || !isHost || !room) return;
    if (savedSessionCandidate) return;

    const payload: SavedHostSession = {
      room,
      savedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      state: gameState,
    };

    window.sessionStorage.setItem(getHostSessionStorageKey(room), JSON.stringify(payload));
  }, [gameState, hasCheckedSavedSession, isHost, isSoloMode, room, savedSessionCandidate]);

  const resumeSavedSession = useCallback(() => {
    if (!savedSessionCandidate) return;

    applyLocalState(savedSessionCandidate.state);
    resetTransientUiState();
    setLastGameState(null);
    setSavedSessionCandidate(null);
    setStatus('Saved host session restored.');
    sendSnapshotToCurrentConnection(savedSessionCandidate.state, 'host');
  }, [applyLocalState, resetTransientUiState, savedSessionCandidate, sendSnapshotToCurrentConnection]);

  const discardSavedSession = useCallback(() => {
    if (typeof window !== 'undefined' && room) {
      window.sessionStorage.removeItem(getHostSessionStorageKey(room));
    }

    setSavedSessionCandidate(null);
    setStatus('Starting a fresh host session.');
    sendSnapshotToCurrentConnection(gameStateRef.current, 'host');
  }, [room, sendSnapshotToCurrentConnection]);

  useEffect(() => {
    if (isSoloMode) {
      setStatus('Solo Mode');
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

    peer.on('open', () => {
      setStatus(`Connected! ${isHost ? 'Waiting for guest...' : 'Joining room...'}`);
      if (isHost) {
        setConnectionState('disconnected');
      }
      if (!isHost) {
        connectToHost();
      }
    });

    peer.on('connection', (conn) => {
      if (isHost) {
        setupConnection(conn);
      }
    });

    peer.on('disconnected', () => {
      if (isHost) {
        setStatus('Disconnected from Peer server. Reopen room if needed.');
        return;
      }

      scheduleReconnect('Peer connection lost. Reconnecting...');
    });

    peer.on('error', () => {
      if (isHost) {
        setStatus('P2P error. Waiting for guest...');
        return;
      }

      scheduleReconnect('Unable to reach host. Reconnecting...');
    });

    return () => {
      clearReconnectTimer();
      clearSnapshotRequestTimer();
      awaitingInitialSnapshotRef.current = false;
      activeConnectionTokenRef.current = null;
      connRef.current = null;
      peer.destroy();
    };
  }, [clearReconnectTimer, clearSnapshotRequestTimer, connectToHost, room, isHost, isSoloMode, scheduleReconnect, setupConnection]); // gameState を除外して接続ループを防ぐ

  useEffect(() => {
    if (!isDebug) return;
    const makeMockCards = (playerRole: 'host' | 'guest') =>
      Array.from({ length: 20 }, (_, i) => ({
        id: `debug-${playerRole}-${i}`,
        cardId: `debug-card-${i}`,
        name: `Debug Card ${i + 1}`,
        image: '',
        zone: `mainDeck-${playerRole}`,
        owner: playerRole,
        isTapped: false,
        isFlipped: true,
        counters: { atk: 0, hp: 0 },
      }));
    const debugCards = [...makeMockCards('host'), ...makeMockCards('guest')];
    const debugState: SyncState = {
      ...initialState,
      cards: debugCards,
      host: { ...initialState.host, pp: 1, maxPp: 1, initialHandDrawn: true, isReady: true },
      guest: { ...initialState.guest, initialHandDrawn: true, isReady: true },
      gameStatus: 'playing',
      turnPlayer: 'host',
    };
    applyLocalState(debugState);
    setStatus('[DEBUG] Game auto-started. Both decks injected (20 cards each).');
  }, [applyLocalState, isDebug]);

  useEffect(() => {
    if (gameState.gameStatus !== 'preparing') return;
    clearAttackUiState();
  }, [clearAttackUiState, gameState.gameStatus]);

  useEffect(() => {
    return () => {
      clearReconnectTimer();
      clearSnapshotRequestTimer();
      clearAttackUiState();
      clearCardPlayMessageTimer();
      clearTurnMessageTimer();
      clearCoinMessageTimer();
      clearDiceTimers();
      clearRevealedCardsTimer();
    };
  }, [clearAttackUiState, clearCardPlayMessageTimer, clearCoinMessageTimer, clearDiceTimers, clearReconnectTimer, clearRevealedCardsTimer, clearSnapshotRequestTimer, clearTurnMessageTimer]);

  useEffect(() => {
    if (gameState.gameStatus !== 'playing') {
      clearTurnMessageTimer();
      setTurnMessage(null);
      return;
    }
    if (!isSoloMode && gameState.turnPlayer !== role) {
      clearTurnMessageTimer();
      setTurnMessage(null);
      return;
    }
    if (gameState.turnCount === 0) return;
    showTimedTurnMessage(
      isSoloMode ? `${gameState.turnPlayer === 'host' ? 'PLAYER 1' : 'PLAYER 2'} TURN` : 'YOUR TURN',
      2500
    );
  }, [clearTurnMessageTimer, gameState.turnPlayer, gameState.turnCount, gameState.gameStatus, isSoloMode, role, showTimedTurnMessage]);

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
    if (lastGameState) {
      dispatchGameEvent({ type: 'UNDO_LAST_TURN', previousState: lastGameState });
      setLastGameState(null);
    }
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
    dispatchGameEvent({ type: 'START_GAME' });
    showTimedTurnMessage('GAME START!', 2500);
  };

  const handleToggleReady = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'TOGGLE_READY', actor: targetRole });
  };

  const handleDrawInitialHand = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'DRAW_INITIAL_HAND', actor: targetRole });
  };

  const startMulligan = () => {
    setMulliganOrder([]);
    setIsMulliganModalOpen(true);
  };

  const handleMulliganOrderSelect = (cardId: string) => {
    if (mulliganOrder.includes(cardId)) {
      setMulliganOrder(prev => prev.filter(id => id !== cardId));
    } else {
      setMulliganOrder(prev => [...prev, cardId]);
    }
  };

  const executeMulligan = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'EXECUTE_MULLIGAN', actor: targetRole, selectedIds: mulliganOrder });
    setIsMulliganModalOpen(false);
  };

  const drawCard = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'DRAW_CARD', actor: targetRole });
  };

  const millCard = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'MILL_CARD', actor: targetRole });
  };

  const handleLookAtTop = (n: number, targetRole: PlayerRole = role) => {
    if (!isSoloMode && !isHost && connectionState !== 'connected') return;
    if (gameState.gameStatus !== 'playing') return;
    const myDeck = gameState.cards.filter(c => c.zone === `mainDeck-${targetRole}`);
    setTopDeckCards(myDeck.slice(0, n));
  };

  const handleResolveTopDeck = (results: CardLogic.TopDeckResult[], targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'RESOLVE_TOP_DECK', actor: targetRole, results });
    setTopDeckCards([]);
  };

  const handleExtractCard = (
    cardId: string,
    customDestination?: string,
    targetRole?: PlayerRole,
    revealToOpponent = false
  ) => {
    dispatchGameEvent({ type: 'EXTRACT_CARD', actor: targetRole, cardId, destination: customDestination, revealToOpponent });
    setSearchZone(null);
  };

  const confirmResetGame = () => {
    setShowResetConfirm(false);
    setLastGameState(null);
    dispatchGameEvent({ type: 'RESET_GAME' });
  };

  const importDeckData = (data: ImportableDeckData, targetRole: PlayerRole = role) => {
    const newCards: CardInstance[] = [];
    const tokenOptionsById = new Map<string, TokenOption>();
    const shuffledMain = [...(data.mainDeck || [])]
      .filter((c: any) => !c.deck_section || c.deck_section === 'main')
      .sort(() => Math.random() - 0.5);

    shuffledMain.forEach((c: any) => {
      newCards.push({
        id: uuid(),
        cardId: c.id,
        name: c.name,
        image: c.image,
        zone: `mainDeck-${targetRole}`,
        owner: targetRole,
        isTapped: false,
        isFlipped: true,
        counters: { atk: 0, hp: 0 },
        genericCounter: 0,
        baseCardType: normalizeBaseCardType(c.card_kind_normalized ?? c.type)
      });
    });

    (data.evolveDeck || [])
      .filter((c: any) => !c.deck_section || c.deck_section === 'evolve')
      .forEach((c: any) => {
        newCards.push({
          id: uuid(),
          cardId: c.id,
          name: c.name,
          image: c.image,
          zone: `evolveDeck-${targetRole}`,
          owner: targetRole,
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
          genericCounter: 0,
          isEvolveCard: true,
          baseCardType: normalizeBaseCardType(c.card_kind_normalized ?? c.type)
        });
      });

    const importedLeaderCards = Array.isArray(data.leaderCards)
      ? data.leaderCards
      : data.leaderCard
        ? [data.leaderCard]
        : [];

    importedLeaderCards
      .filter((c: any) => c?.deck_section === 'leader')
      .forEach((c: any) => {
        newCards.push({
          id: uuid(),
          cardId: c.id,
          name: c.name,
          image: c.image,
          zone: `leader-${targetRole}`,
          owner: targetRole,
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          genericCounter: 0,
          isLeaderCard: true,
          baseCardType: normalizeBaseCardType(c.card_kind_normalized ?? c.type),
        });
      });

    (data.tokenDeck || [])
      .filter((c: any) => c.deck_section === 'token')
      .forEach((c: any) => {
        if (!tokenOptionsById.has(c.id)) {
          tokenOptionsById.set(c.id, {
            cardId: c.id,
            name: c.name,
            image: c.image,
            baseCardType: normalizeBaseCardType(c.card_kind_normalized ?? c.type),
          });
        }
      });

    dispatchGameEvent({
      type: 'IMPORT_DECK',
      actor: targetRole,
      cards: newCards,
      tokenOptions: Array.from(tokenOptionsById.values()),
    });
  };

  const handleDeckUpload = (event: React.ChangeEvent<HTMLInputElement>, targetRole: PlayerRole = role) => {
    if (!isSoloMode && !isHost && connectionState !== 'connected') {
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
      } catch (err) { alert("Failed to parse deck JSON."); }
    };
    reader.readAsText(file);
  };

  const spawnToken = (targetRole: PlayerRole = role, tokenOption?: TokenOption) => {
    const selectedToken = tokenOption ?? defaultTokenOption.current;
    const newCard: CardInstance = {
      id: uuid(),
      cardId: selectedToken.cardId,
      name: selectedToken.name,
      image: selectedToken.image,
      zone: `ex-${targetRole}`,
      owner: targetRole,
      isTapped: false,
      isFlipped: false,
      counters: selectedToken.cardId === 'token' ? { atk: 1, hp: 1 } : { atk: 0, hp: 0 },
      genericCounter: 0,
      isTokenCard: true,
      baseCardType: selectedToken.baseCardType ?? null,
    };
    dispatchGameEvent({ type: 'SPAWN_TOKEN', actor: targetRole, token: newCard });
  };

  const handleModifyCounter = (cardId: string, stat: 'atk' | 'hp', delta: number, actor?: PlayerRole) => {
    dispatchGameEvent({ type: 'MODIFY_COUNTER', actor, cardId, stat, delta });
  };

  const handleModifyGenericCounter = (cardId: string, delta: number, actor?: PlayerRole) => {
    dispatchGameEvent({ type: 'MODIFY_GENERIC_COUNTER', actor, cardId, delta });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const cardId = active.id as string;
    const overId = over.id as string;
    dispatchGameEvent({ type: 'MOVE_CARD', cardId, overId });
  };

  const toggleTap = (cardId: string) => {
    dispatchGameEvent({ type: 'TOGGLE_TAP', cardId });
  };

  const handleFlipCard = (cardId: string, targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'TOGGLE_FLIP', actor: targetRole, cardId });
  };

  const handleSendToBottom = (cardId: string) => {
    dispatchGameEvent({ type: 'SEND_TO_BOTTOM', cardId });
  };

  const handleBanish = (cardId: string) => {
    dispatchGameEvent({ type: 'BANISH_CARD', cardId });
  };

  const handlePlayToField = (cardId: string, targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'PLAY_TO_FIELD', actor: targetRole, cardId });
  };

  const handleDeclareAttack = (
    attackerCardId: string,
    target: AttackTarget,
    targetRole?: PlayerRole
  ) => {
    dispatchGameEvent({ type: 'ATTACK_DECLARATION', actor: targetRole, attackerCardId, target });
  };

  const handleSendToCemetery = (cardId: string) => {
    dispatchGameEvent({ type: 'SEND_TO_CEMETERY', cardId });
  };

  const handleReturnEvolve = (cardId: string) => {
    dispatchGameEvent({ type: 'RETURN_EVOLVE', cardId });
  };

  const handleShuffleDeck = (targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'SHUFFLE_DECK', actor: targetRole });
  };

  const getCards = (zone: string) => gameState.cards.filter(c => c.zone === zone);
  const getTokenOptions = (targetRole: PlayerRole) => [
    defaultTokenOption.current,
    ...gameState.tokenOptions[targetRole],
  ];
  const canInteract = isSoloMode || isHost || connectionState === 'connected';

  return {
    room, mode, isSoloMode, isHost, role, status, connectionState, canInteract, attemptReconnect, gameState, savedSessionCandidate, resumeSavedSession, discardSavedSession, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage, cardPlayMessage, attackMessage, attackHistory, eventHistory, attackVisual, revealedCardsOverlay,
    isRollingDice, diceValue, mulliganOrder, isMulliganModalOpen, setIsMulliganModalOpen,
    handleStatChange, setPhase, endTurn, handleUndoTurn, handleSetInitialTurnOrder,
    handlePureCoinFlip, handleRollDice, handleStartGame, handleToggleReady,
    handleDrawInitialHand, startMulligan, handleMulliganOrderSelect, executeMulligan,
    drawCard, handleExtractCard, confirmResetGame, handleDeckUpload, importDeckData, spawnToken,
    handleModifyCounter, handleModifyGenericCounter, handleDragEnd, toggleTap, handleFlipCard, handleSendToBottom,
    handleBanish, handlePlayToField, handleSendToCemetery, handleReturnEvolve, handleShuffleDeck, handleDeclareAttack,
    getCards, getTokenOptions, lastGameState, millCard,
    topDeckCards, handleLookAtTop, handleResolveTopDeck, setTopDeckCards,
    isDebug
  };
};
