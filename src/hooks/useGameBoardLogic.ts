import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Peer, { type DataConnection } from 'peerjs';
import { type DragEndEvent } from '@dnd-kit/core';
import { type CardInstance } from '../components/Card';
import { type PlayerRole, type SyncState, initialState } from '../types/game';
import { type GameSyncEvent, type SharedUiEffect, type SyncMessage } from '../types/sync';
import { uuid } from '../utils/helpers';
import * as CardLogic from '../utils/cardLogic';
import { canImportDeck } from '../utils/gameRules';
import { applyGameSyncEvent } from '../utils/gameSyncReducer';
import { flipSharedCoin, formatSharedUiMessage, rollSharedDie } from '../utils/sharedRandom';
import { createEventDeduper } from '../utils/eventDeduper';

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
  | { type: 'DRAW_CARD'; actor?: PlayerRole }
  | { type: 'MILL_CARD'; actor?: PlayerRole }
  | { type: 'TOGGLE_TAP'; actor?: PlayerRole; cardId: string }
  | { type: 'TOGGLE_FLIP'; actor?: PlayerRole; cardId: string }
  | { type: 'SEND_TO_BOTTOM'; actor?: PlayerRole; cardId: string }
  | { type: 'BANISH_CARD'; actor?: PlayerRole; cardId: string }
  | { type: 'SEND_TO_CEMETERY'; actor?: PlayerRole; cardId: string }
  | { type: 'RETURN_EVOLVE'; actor?: PlayerRole; cardId: string }
  | { type: 'PLAY_TO_FIELD'; actor?: PlayerRole; cardId: string }
  | { type: 'EXTRACT_CARD'; actor?: PlayerRole; cardId: string; destination?: string }
  | { type: 'SHUFFLE_DECK'; actor?: PlayerRole }
  | { type: 'MODIFY_PLAYER_STAT'; actor?: PlayerRole; playerKey: PlayerRole; stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo'; delta: number }
  | { type: 'DRAW_INITIAL_HAND'; actor?: PlayerRole }
  | { type: 'EXECUTE_MULLIGAN'; actor?: PlayerRole; selectedIds: string[] }
  | { type: 'RESOLVE_TOP_DECK'; actor?: PlayerRole; results: CardLogic.TopDeckResult[] }
  | { type: 'IMPORT_DECK'; actor?: PlayerRole; cards: CardInstance[] }
  | { type: 'SET_INITIAL_TURN_ORDER'; actor?: PlayerRole; starter: PlayerRole; manual: boolean }
  | { type: 'UNDO_LAST_TURN'; actor?: PlayerRole; previousState: SyncState }
  | { type: 'SPAWN_TOKEN'; actor?: PlayerRole; token: CardInstance };

export const useGameBoardLogic = () => {
  const [searchParams] = useSearchParams();
  const room = searchParams.get('room') || '';
  const mode = searchParams.get('mode') === 'solo' ? 'solo' : 'p2p';
  const isSoloMode = mode === 'solo';
  const isHost = searchParams.get('host') === 'true';
  const role = (isSoloMode ? 'host' : (isHost ? 'host' : 'guest')) as 'host' | 'guest';
  const isDebug = searchParams.get('debug') === 'true';

  const [status, setStatus] = useState<string>('Initializing P2P...');
  const [gameState, setGameState] = useState<SyncState>(initialState);
  const [searchZone, setSearchZone] = useState<{ id: string, title: string } | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [coinMessage, setCoinMessage] = useState<string | null>(null);
  const [turnMessage, setTurnMessage] = useState<string | null>(null);
  const [lastGameState, setLastGameState] = useState<SyncState | null>(null);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);

  const [mulliganOrder, setMulliganOrder] = useState<string[]>([]);
  const [isMulliganModalOpen, setIsMulliganModalOpen] = useState(false);
  const [topDeckCards, setTopDeckCards] = useState<CardInstance[]>([]);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const gameStateRef = useRef<SyncState>(initialState);
  const coinMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diceRollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diceFinalizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diceMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const playSharedUiEffect = useCallback((effect: SharedUiEffect) => {
    if (effect.type === 'COIN_FLIP_RESULT') {
      showTimedCoinMessage(formatSharedUiMessage(effect, role, isSoloMode), 3000);
      return;
    }

    if (effect.type === 'STARTER_DECIDED') {
      showTimedCoinMessage(formatSharedUiMessage(effect, role, isSoloMode), 4000);
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
  }, [clearCoinMessageTimer, clearDiceTimers, isSoloMode, role, showTimedCoinMessage]);

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
  }, [applyLocalState, playSharedUiEffect, role, sendSharedUiEffect, sendSnapshot]);

  const dispatchGameEvent = useCallback((event: DispatchableGameSyncEvent) => {
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
  }, [applyAuthoritativeEvent, isHost, isSoloMode, role, sendMessage]);

  const setupConnection = useCallback((conn: DataConnection) => {
    connRef.current = conn;
    conn.on('open', () => {
      if (!isHost) setStatus('Connected to host! Game ready.');
    });
    conn.on('data', (rawData: unknown) => {
      const data = rawData as SyncMessage;
      if (data.type === 'EVENT') {
        if (isHost) {
          applyAuthoritativeEvent(data.event, 'guest');
        }
        return;
      }
      if (data.type === 'SHARED_UI_EFFECT') {
        playSharedUiEffect(data.effect);
        return;
      }
      if (data.type === 'STATE_SNAPSHOT') {
        maybeApplySnapshot(data.state, data.source);
      }
    });
    conn.on('close', () => setStatus('Opponent disconnected.'));
  }, [applyAuthoritativeEvent, isHost, maybeApplySnapshot, playSharedUiEffect]);

  useEffect(() => {
    if (isSoloMode) {
      setStatus('Solo Mode');
      processedEventDeduperRef.current.reset();
      return;
    }
    if (!room) return;
    processedEventDeduperRef.current.reset();
    const peerId = isHost ? `sv-evolve-${room}` : undefined;
    const peer = peerId ? new Peer(peerId) : new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      setStatus(`Connected! ${isHost ? 'Waiting for guest...' : 'Joining room...'}`);
      if (!isHost) {
        const conn = peer.connect(`sv-evolve-${room}`);
        setupConnection(conn);
      }
    });

    peer.on('connection', (conn) => {
      if (isHost) {
        setStatus('Guest connected! Game ready.');
        setupConnection(conn);
      setTimeout(() => conn.send({ type: 'STATE_SNAPSHOT', state: gameStateRef.current, source: 'host' } satisfies SyncMessage), 500);
      }
    });

    return () => peer.destroy();
  }, [room, isHost, isSoloMode, setupConnection]); // gameState を除外して接続ループを防ぐ

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
      clearCoinMessageTimer();
      clearDiceTimers();
    };
  }, [clearCoinMessageTimer, clearDiceTimers]);

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
    if (gameState.gameStatus !== 'playing') return;
    const myDeck = gameState.cards.filter(c => c.zone === `mainDeck-${targetRole}`);
    setTopDeckCards(myDeck.slice(0, n));
  };

  const handleResolveTopDeck = (results: CardLogic.TopDeckResult[], targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'RESOLVE_TOP_DECK', actor: targetRole, results });
    setTopDeckCards([]);
  };

  const handleExtractCard = (cardId: string, customDestination?: string, targetRole?: PlayerRole) => {
    dispatchGameEvent({ type: 'EXTRACT_CARD', actor: targetRole, cardId, destination: customDestination });
    setSearchZone(null);
  };

  const confirmResetGame = () => {
    setShowResetConfirm(false);
    dispatchGameEvent({ type: 'RESET_GAME' });
  };

  const handleDeckUpload = (event: React.ChangeEvent<HTMLInputElement>, targetRole: PlayerRole = role) => {
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
        const shuffledMain = [...(data.mainDeck || [])].sort(() => Math.random() - 0.5);
        shuffledMain.forEach((c: any) => {
          newCards.push({
            id: uuid(), cardId: c.id, name: c.name, image: c.image,
            zone: `mainDeck-${targetRole}`, owner: targetRole, isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 }
          });
        });
        (data.evolveDeck || []).forEach((c: any) => {
          newCards.push({
            id: uuid(), cardId: c.id, name: c.name, image: c.image,
            zone: `evolveDeck-${targetRole}`, owner: targetRole, isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 }, isEvolveCard: true
          });
        });
        dispatchGameEvent({ type: 'IMPORT_DECK', actor: targetRole, cards: newCards });
      } catch (err) { alert("Failed to parse deck JSON."); }
    };
    reader.readAsText(file);
  };

  const spawnToken = (targetRole: PlayerRole = role) => {
    const newCard: CardInstance = {
      id: uuid(), cardId: 'token', name: 'Token', 
      image: 'https://shadowverse-evolve.com/wordpress/wp-content/themes/shadowverse-evolve-release_v0/assets/images/common/ogp.jpg',
      zone: `ex-${targetRole}`, owner: targetRole, isTapped: false, isFlipped: false, counters: { atk: 1, hp: 1 }
    };
    dispatchGameEvent({ type: 'SPAWN_TOKEN', actor: targetRole, token: newCard });
  };

  const handleModifyCounter = (cardId: string, stat: 'atk' | 'hp', delta: number, actor?: PlayerRole) => {
    dispatchGameEvent({ type: 'MODIFY_COUNTER', actor, cardId, stat, delta });
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

  return {
    room, mode, isSoloMode, isHost, role, status, gameState, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage,
    isRollingDice, diceValue, mulliganOrder, isMulliganModalOpen, setIsMulliganModalOpen,
    handleStatChange, setPhase, endTurn, handleUndoTurn, handleSetInitialTurnOrder,
    handlePureCoinFlip, handleRollDice, handleStartGame, handleToggleReady,
    handleDrawInitialHand, startMulligan, handleMulliganOrderSelect, executeMulligan,
    drawCard, handleExtractCard, confirmResetGame, handleDeckUpload, spawnToken,
    handleModifyCounter, handleDragEnd, toggleTap, handleFlipCard, handleSendToBottom,
    handleBanish, handlePlayToField, handleSendToCemetery, handleReturnEvolve, handleShuffleDeck,
    getCards, lastGameState, millCard,
    topDeckCards, handleLookAtTop, handleResolveTopDeck, setTopDeckCards,
    isDebug
  };
};
