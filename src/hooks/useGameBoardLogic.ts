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
  const [searchZone, setSearchZone] = useState<{ id: string, title: string } | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [coinMessage, setCoinMessage] = useState<string | null>(null);
  const [turnMessage, setTurnMessage] = useState<string | null>(null);
  const [cardPlayMessage, setCardPlayMessage] = useState<string | null>(null);
  const [attackMessage, setAttackMessage] = useState<string | null>(null);
  const [attackHistory, setAttackHistory] = useState<string[]>([]);
  const [attackVisual, setAttackVisual] = useState<Extract<SharedUiEffect, { type: 'ATTACK_DECLARED' }> | null>(null);
  const [revealedCardsOverlay, setRevealedCardsOverlay] = useState<{ title: string; cards: PublicCardView[] } | null>(null);
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
  const activeConnectionTokenRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diceRollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diceFinalizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diceMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealedCardsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attackMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardPlayMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const resetTransientUiState = useCallback(() => {
    setSearchZone(null);
    setIsMulliganModalOpen(false);
    setMulliganOrder([]);
    setTopDeckCards([]);
  }, []);

  const sendSnapshot = useCallback((state: SyncState, source: PlayerRole) => {
    sendMessage({ type: 'STATE_SNAPSHOT', state, source });
  }, [sendMessage]);

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
  }, []);

  const clearAttackMessageTimer = useCallback(() => {
    if (attackMessageTimeoutRef.current) {
      clearTimeout(attackMessageTimeoutRef.current);
      attackMessageTimeoutRef.current = null;
    }
  }, []);

  const clearCardPlayMessageTimer = useCallback(() => {
    if (cardPlayMessageTimeoutRef.current) {
      clearTimeout(cardPlayMessageTimeoutRef.current);
      cardPlayMessageTimeoutRef.current = null;
    }
  }, []);

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
      });
      revealedCardsTimeoutRef.current = setTimeout(() => {
        setRevealedCardsOverlay(null);
        revealedCardsTimeoutRef.current = null;
      }, 5000);
      return;
    }

    if (effect.type === 'REVEAL_SEARCHED_CARD_TO_HAND') {
      clearRevealedCardsTimer();
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
      attackMessageTimeoutRef.current = setTimeout(() => {
        setAttackMessage(null);
        setAttackVisual(null);
        attackMessageTimeoutRef.current = null;
      }, 2200);
      return;
    }

    if (effect.type === 'CARD_PLAYED') {
      clearCardPlayMessageTimer();
      setCardPlayMessage(formatCardPlayedEffect(effect, role, isSoloMode));
      cardPlayMessageTimeoutRef.current = setTimeout(() => {
        setCardPlayMessage(null);
        cardPlayMessageTimeoutRef.current = null;
      }, 2600);
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
  }, [clearAttackMessageTimer, clearCardPlayMessageTimer, clearCoinMessageTimer, clearDiceTimers, clearRevealedCardsTimer, isSoloMode, role, showTimedCoinMessage]);

  const maybeApplySnapshot = useCallback((incomingState: SyncState, source: PlayerRole) => {
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

  const setupConnection = useCallback((conn: DataConnection) => {
    const token = uuid();
    activeConnectionTokenRef.current = token;
    clearReconnectTimer();

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

      setStatus('Connected to host. Syncing latest game state...');
      conn.send({
        type: 'REQUEST_SNAPSHOT',
        lastKnownRevision: gameStateRef.current.revision,
        source: role,
      } satisfies SyncMessage);
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
          conn.send({ type: 'STATE_SNAPSHOT', state: gameStateRef.current, source: 'host' } satisfies SyncMessage);
        }
        return;
      }
      if (data.type === 'SHARED_UI_EFFECT') {
        playSharedUiEffect(data.effect);
        return;
      }
      if (data.type === 'STATE_SNAPSHOT') {
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

      if (isHost) {
        setConnectionState('disconnected');
        setStatus('Connection error. Waiting for guest...');
        return;
      }

      scheduleReconnect('Connection error. Reconnecting...');
    });
  }, [applyAuthoritativeEvent, clearReconnectTimer, isHost, maybeApplySnapshot, playSharedUiEffect, resetTransientUiState, role, scheduleReconnect]);

  useEffect(() => {
    setupConnectionRef.current = setupConnection;
  }, [setupConnection]);

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
      activeConnectionTokenRef.current = null;
      connRef.current = null;
      peer.destroy();
    };
  }, [clearReconnectTimer, connectToHost, room, isHost, isSoloMode, scheduleReconnect, setupConnection]); // gameState を除外して接続ループを防ぐ

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
    return () => {
      clearReconnectTimer();
      clearAttackMessageTimer();
      clearCardPlayMessageTimer();
      clearCoinMessageTimer();
      clearDiceTimers();
      clearRevealedCardsTimer();
    };
  }, [clearAttackMessageTimer, clearCardPlayMessageTimer, clearCoinMessageTimer, clearDiceTimers, clearReconnectTimer, clearRevealedCardsTimer]);

  useEffect(() => {
    if (gameState.gameStatus !== 'playing') return;
    if (!isSoloMode && gameState.turnPlayer !== role) return;
    if (gameState.turnCount === 0) return;
    const timer = setTimeout(() => setTurnMessage(null), 2500);
    setTurnMessage(isSoloMode ? `${gameState.turnPlayer === 'host' ? 'PLAYER 1' : 'PLAYER 2'} TURN` : 'YOUR TURN');
    return () => clearTimeout(timer);
  }, [gameState.turnPlayer, gameState.turnCount, gameState.gameStatus, isSoloMode, role]);

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
    setTurnMessage("GAME START!");
    setTimeout(() => setTurnMessage(null), 2500);
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
        const data = JSON.parse(e.target?.result as string);
        const newCards: CardInstance[] = [];
        const tokenOptionsById = new Map<string, TokenOption>();
        const shuffledMain = [...(data.mainDeck || [])]
          .filter((c: any) => !c.deck_section || c.deck_section === 'main')
          .sort(() => Math.random() - 0.5);
        shuffledMain.forEach((c: any) => {
          newCards.push({
            id: uuid(), cardId: c.id, name: c.name, image: c.image,
            zone: `mainDeck-${targetRole}`, owner: targetRole, isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 }, genericCounter: 0, baseCardType: normalizeBaseCardType(c.card_kind_normalized ?? c.type)
          });
        });
        (data.evolveDeck || [])
          .filter((c: any) => !c.deck_section || c.deck_section === 'evolve')
          .forEach((c: any) => {
          newCards.push({
            id: uuid(), cardId: c.id, name: c.name, image: c.image,
            zone: `evolveDeck-${targetRole}`, owner: targetRole, isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 }, genericCounter: 0, isEvolveCard: true, baseCardType: normalizeBaseCardType(c.card_kind_normalized ?? c.type)
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
    room, mode, isSoloMode, isHost, role, status, connectionState, canInteract, attemptReconnect, gameState, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage, cardPlayMessage, attackMessage, attackHistory, attackVisual, revealedCardsOverlay,
    isRollingDice, diceValue, mulliganOrder, isMulliganModalOpen, setIsMulliganModalOpen,
    handleStatChange, setPhase, endTurn, handleUndoTurn, handleSetInitialTurnOrder,
    handlePureCoinFlip, handleRollDice, handleStartGame, handleToggleReady,
    handleDrawInitialHand, startMulligan, handleMulliganOrderSelect, executeMulligan,
    drawCard, handleExtractCard, confirmResetGame, handleDeckUpload, spawnToken,
    handleModifyCounter, handleModifyGenericCounter, handleDragEnd, toggleTap, handleFlipCard, handleSendToBottom,
    handleBanish, handlePlayToField, handleSendToCemetery, handleReturnEvolve, handleShuffleDeck, handleDeclareAttack,
    getCards, getTokenOptions, lastGameState, millCard,
    topDeckCards, handleLookAtTop, handleResolveTopDeck, setTopDeckCards,
    isDebug
  };
};
