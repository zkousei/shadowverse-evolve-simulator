import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Peer, { type DataConnection } from 'peerjs';
import { type DragEndEvent } from '@dnd-kit/core';
import { type CardInstance } from '../components/Card';
import { type SyncState, initialState } from '../types/game';
import { uuid } from '../utils/helpers';
import type { TopDeckAction } from '../components/TopDeckModal';

export const useGameBoardLogic = () => {
  const [searchParams] = useSearchParams();
  const room = searchParams.get('room') || '';
  const isHost = searchParams.get('host') === 'true';
  const role = (isHost ? 'host' : 'guest') as 'host' | 'guest';
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

  const syncState = useCallback((newState: SyncState) => {
    setGameState(newState);
    gameStateRef.current = newState;
    if (connRef.current?.open) {
      connRef.current.send({ type: 'SYNC', state: newState });
    }
  }, []);

  const setupConnection = useCallback((conn: DataConnection) => {
    connRef.current = conn;
    conn.on('open', () => {
      if (!isHost) setStatus('Connected to host! Game ready.');
    });
    conn.on('data', (data: any) => {
      if (data.type === 'SYNC') {
        // 相手からの同期: gameStateRef も更新して整合性を保つ
        setGameState(data.state);
        gameStateRef.current = data.state;
        setLastGameState(null);
      }
    });
    conn.on('close', () => setStatus('Opponent disconnected.'));
  }, [isHost]);

  useEffect(() => {
    if (!room) return;
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
      setTimeout(() => conn.send({ type: 'SYNC', state: gameStateRef.current }), 500);
      }
    });

    return () => peer.destroy();
  }, [room, isHost, setupConnection]); // gameState を除外して接続ループを防ぐ

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
    setGameState(debugState);
    gameStateRef.current = debugState; // ref も同期
    setStatus('[DEBUG] Game auto-started. Both decks injected (20 cards each).');
  }, [isDebug]);

  useEffect(() => {
    // ゲーム中、かつ自分のターンになったときだけ通知を表示
    if (gameState.gameStatus !== 'playing') return;
    if (gameState.turnPlayer !== role) return;
    // turnCount === 1 かつ phase === 'Start' の初回接続時は通知しない（相手の接続前に誤発火を防ぐ）
    if (gameState.turnCount === 0) return;
    const timer = setTimeout(() => setTurnMessage(null), 2500);
    setTurnMessage('YOUR TURN');
    return () => clearTimeout(timer);
  }, [gameState.turnPlayer, gameState.turnCount, gameState.gameStatus, role]);

  const handleStatChange = (playerKey: 'host' | 'guest', stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo', delta: number) => {
    let newValue = gameState[playerKey][stat] + delta;
    if (stat === 'maxPp') {
      newValue = Math.min(10, Math.max(0, newValue));
    } else if (stat === 'pp') {
      newValue = Math.min(gameState[playerKey].maxPp, Math.max(0, newValue));
    } else {
      newValue = Math.max(0, newValue);
    }
    syncState({
      ...gameState,
      [playerKey]: { ...gameState[playerKey], [stat]: newValue }
    });
  };

  const setPhase = (newPhase: 'Start' | 'Main' | 'End') => {
    syncState({ ...gameState, phase: newPhase });
  };

  const endTurn = () => {
    if (gameState.gameStatus !== 'playing') return;
    setLastGameState(JSON.parse(JSON.stringify(gameState)));
    const nextPlayer = gameState.turnPlayer === 'host' ? 'guest' : 'host';
    const isNewTurnRound = nextPlayer === 'host';
    const newTurnCount = isNewTurnRound ? gameState.turnCount + 1 : gameState.turnCount;
    const nextPlayerState = { ...gameState[nextPlayer] };

    if (nextPlayerState.maxPp < 10) nextPlayerState.maxPp += 1;
    nextPlayerState.pp = nextPlayerState.maxPp;
    nextPlayerState.combo = 0;

    const untapCards = gameState.cards.map(c =>
      c.isTapped && c.zone === `field-${nextPlayer}` ? { ...c, isTapped: false } : c
    );

    const nextPlayerDeck = untapCards.filter(c => c.zone === `mainDeck-${nextPlayer}`);
    let finalCards = untapCards;
    if (nextPlayerDeck.length > 0) {
      const topCardId = nextPlayerDeck[0].id;
      finalCards = untapCards.map(c =>
        c.id === topCardId ? { ...c, zone: `hand-${nextPlayer}`, isFlipped: false } : c
      );
    }

    syncState({
      ...gameState,
      turnPlayer: nextPlayer,
      turnCount: newTurnCount,
      phase: 'Start',
      [nextPlayer]: nextPlayerState,
      cards: finalCards
    });
  };

  const handleUndoTurn = () => {
    if (lastGameState) {
      syncState(lastGameState);
      setLastGameState(null);
    }
  };

  const handleSetInitialTurnOrder = (forcedStarter?: 'host' | 'guest') => {
    const isHostFirst = forcedStarter ? (forcedStarter === 'host') : (Math.random() > 0.5);
    const starter = isHostFirst ? 'host' : 'guest';
    const second = isHostFirst ? 'guest' : 'host';
    syncState({
      ...gameState,
      turnPlayer: starter,
      turnCount: 1,
      phase: 'Start',
      [starter]: { ...gameState[starter], ep: 0 },
      [second]: { ...gameState[second], ep: 3 }
    });
    const msg = `${starter === role ? "You" : "Opponent"} will go first!`;
    setCoinMessage(forcedStarter ? `Manually set: ${msg}` : msg);
    setTimeout(() => setCoinMessage(null), 4000);
  };

  const handlePureCoinFlip = () => {
    const isHeads = Math.random() > 0.5;
    const result = isHeads ? "HEADS (表)" : "TAILS (裏)";
    setCoinMessage(`Result: ${result}`);
    setTimeout(() => setCoinMessage(null), 3000);
  };

  const handleRollDice = () => {
    if (isRollingDice) return;
    setIsRollingDice(true);
    let rolls = 0;
    const maxRolls = 15;
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rolls++;
      if (rolls >= maxRolls) {
        clearInterval(interval);
        const finalValue = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalValue);
        setCoinMessage(`DIE ROLL: ${finalValue}`);
        setTimeout(() => {
          setIsRollingDice(false);
          setDiceValue(null);
          setTimeout(() => setCoinMessage(null), 3000);
        }, 800);
      }
    }, 60);
  };

  const handleStartGame = () => {
    const starter = gameState.turnPlayer;
    syncState({
      ...gameState,
      gameStatus: 'playing',
      [starter]: { ...gameState[starter], pp: 1, maxPp: 1 }
    });
    setTurnMessage("GAME START!");
    setTimeout(() => setTurnMessage(null), 2500);
  };

  const handleToggleReady = () => {
    syncState({
      ...gameState,
      [role]: { ...gameState[role], isReady: !gameState[role].isReady }
    });
  };

  const handleDrawInitialHand = () => {
    const myDeck = gameState.cards.filter(c => c.zone === `mainDeck-${role}`);
    if (myDeck.length < 4) return;
    const drawnIds = myDeck.slice(0, 4).map(c => c.id);
    const newCards = gameState.cards.map(c =>
      drawnIds.includes(c.id) ? { ...c, zone: `hand-${role}`, isFlipped: false } : c
    );
    syncState({
      ...gameState,
      cards: newCards,
      [role]: { ...gameState[role], initialHandDrawn: true }
    });
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

  const executeMulligan = () => {
    if (mulliganOrder.length !== 4) return;
    const myDeck = gameState.cards.filter(c => c.zone === `mainDeck-${role}`);
    
    // Cards originally in hand (being returned) - Respect user selection order
    const returnedCards = mulliganOrder.map(id => {
      const card = gameState.cards.find(c => c.id === id)!;
      return { ...card, zone: `mainDeck-${role}`, isFlipped: true };
    });
      
    // The rest of the deck
    const restOfDeck = myDeck.filter(c => !mulliganOrder.includes(c.id));
    
    // Draw 4 new ones from the TOP of the rest of the deck
    const newHandCards = restOfDeck.slice(0, 4).map(c => ({ ...c, zone: `hand-${role}`, isFlipped: false }));
    
    // Cards that remain in the deck
    const remainingDeckCards = restOfDeck.slice(4);
    
    // Everything that isn't part of my deck/hand involvement
    const otherCards = gameState.cards.filter(c => c.owner !== role || (c.zone !== `mainDeck-${role}` && c.zone !== `hand-${role}`));

    // Final order: [Others, New Hand, Remaining Deck, Returned cards at the bottom (ordered by selection)]
    syncState({
      ...gameState,
      cards: [...otherCards, ...newHandCards, ...remainingDeckCards, ...returnedCards],
      [role]: { ...gameState[role], mulliganUsed: true }
    });
    setIsMulliganModalOpen(false);
  };

  const drawCard = () => {
    if (gameState.gameStatus !== 'playing') return;
    const myDeck = gameState.cards.filter(c => c.zone === `mainDeck-${role}`);
    if (myDeck.length === 0) return;
    const topCard = myDeck[0];
    const newCards = gameState.cards.map(c =>
      c.id === topCard.id ? { ...c, zone: `hand-${role}`, isFlipped: false } : c
    );
    syncState({ ...gameState, cards: newCards });
  };

  const millCard = () => {
    if (gameState.gameStatus !== 'playing') return;
    const myDeck = gameState.cards.filter(c => c.zone === `mainDeck-${role}`);
    if (myDeck.length === 0) return;
    const topCard = myDeck[0];
    const newCards = gameState.cards.map(c =>
      c.id === topCard.id ? { ...c, zone: `cemetery-${role}`, isFlipped: false, isTapped: false, attachedTo: undefined, counters: { atk: 0, hp: 0 } } : c
    );
    syncState({ ...gameState, cards: newCards });
  };

  const handleLookAtTop = (n: number) => {
    if (gameState.gameStatus !== 'playing') return;
    const myDeck = gameState.cards.filter(c => c.zone === `mainDeck-${role}`);
    setTopDeckCards(myDeck.slice(0, n));
  };

  const handleResolveTopDeck = (results: { cardId: string, action: TopDeckAction, order?: number }[]) => {
    const cardsToMoveIds = results.map(r => r.cardId);
    
    const handResult = results.filter(r => r.action === 'hand');
    const fieldResult = results.filter(r => r.action === 'field');
    const exResult = results.filter(r => r.action === 'ex');
    const cemeteryResult = results.filter(r => r.action === 'cemetery');
    // Top 1 should be the first element in the deck array (the one drawn first)
    const topResult = results.filter(r => r.action === 'top').sort((a, b) => (a.order || 0) - (b.order || 0)); 
    const bottomResult = results.filter(r => r.action === 'bottom').sort((a, b) => (a.order || 0) - (b.order || 0)); 

    // Separate all cards into "my current deck" and "everything else"
    const myDeck = gameState.cards.filter(c => c.zone === `mainDeck-${role}`);
    const nonDeckCards = gameState.cards.filter(c => c.zone !== `mainDeck-${role}`);
    
    const resolveCard = (cardId: string, action: TopDeckAction): CardInstance => {
      const card = myDeck.find(c => c.id === cardId)!;
      let zone = `mainDeck-${role}`;
      if (action === 'hand') zone = `hand-${role}`;
      else if (action === 'field') zone = `field-${role}`;
      else if (action === 'ex') zone = `ex-${role}`;
      else if (action === 'cemetery') zone = `cemetery-${role}`;
      
      const isEnteringSafeZone = zone.startsWith('hand') || zone.startsWith('mainDeck');
      return { 
        ...card, 
        zone, 
        isFlipped: zone.startsWith('mainDeck'),
        isTapped: false,
        attachedTo: undefined,
        counters: isEnteringSafeZone ? { atk: 0, hp: 0 } : card.counters
      };
    };

    const movedHand = handResult.map(r => resolveCard(r.cardId, 'hand'));
    const movedField = fieldResult.map(r => resolveCard(r.cardId, 'field'));
    const movedEx = exResult.map(r => resolveCard(r.cardId, 'ex'));
    const movedCemetery = cemeteryResult.map(r => resolveCard(r.cardId, 'cemetery'));
    
    const movedTop = topResult.map(r => resolveCard(r.cardId, 'top'));
    const movedBottom = bottomResult.map(r => resolveCard(r.cardId, 'bottom'));

    // Cards that were in the deck but NOT even looked at (the rest of the deck)
    const unlookedDeck = myDeck.filter(c => !cardsToMoveIds.includes(c.id));
    
    // New deck structure: [Chosen Top cards (1,2,3...), Remaining cards, Chosen Bottom cards (1,2,3...)]
    const finalDeck = [...movedTop, ...unlookedDeck, ...movedBottom];

    syncState({
      ...gameState,
      cards: [...nonDeckCards, ...movedHand, ...movedField, ...movedEx, ...movedCemetery, ...finalDeck]
    });
    setTopDeckCards([]);
  };

  const handleExtractCard = (cardId: string, customDestination?: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;
    let destinationZone = targetCard.isEvolveCard ? `field-${role}` : `hand-${role}`;
    if (customDestination) destinationZone = customDestination;
    const isEnteringHand = destinationZone.startsWith('hand');
    const newCards = gameState.cards.map(c =>
      c.id === cardId ? {
        ...c,
        zone: destinationZone,
        isFlipped: false,
        counters: isEnteringHand ? { atk: 0, hp: 0 } : c.counters
      } : c
    );
    syncState({ ...gameState, cards: newCards });
    setSearchZone(null);
  };

  const confirmResetGame = () => {
    setShowResetConfirm(false);
    const resetCards = gameState.cards
      .filter(c => c.cardId !== 'token')
      .map(c => ({
        ...c,
        zone: c.isEvolveCard ? `evolveDeck-${c.owner}` : `mainDeck-${c.owner}`,
        isFlipped: true,
        isTapped: false,
        attachedTo: undefined,
        counters: { atk: 0, hp: 0 }
      }));
    syncState({ ...initialState, cards: resetCards });
  };

  const handleDeckUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
            zone: `mainDeck-${role}`, owner: role, isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 }
          });
        });
        (data.evolveDeck || []).forEach((c: any) => {
          newCards.push({
            id: uuid(), cardId: c.id, name: c.name, image: c.image,
            zone: `evolveDeck-${role}`, owner: role, isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 }, isEvolveCard: true
          });
        });
        const otherPlayersCards = gameState.cards.filter(c => c.owner !== role);
        syncState({ ...gameState, cards: [...otherPlayersCards, ...newCards] });
      } catch (err) { alert("Failed to parse deck JSON."); }
    };
    reader.readAsText(file);
  };

  const spawnToken = () => {
    const newCard: CardInstance = {
      id: uuid(), cardId: 'token', name: 'Token', 
      image: 'https://shadowverse-evolve.com/wordpress/wp-content/themes/shadowverse-evolve-release_v0/assets/images/common/ogp.jpg',
      zone: `ex-${role}`, owner: role, isTapped: false, isFlipped: false, counters: { atk: 1, hp: 1 }
    };
    syncState({ ...gameState, cards: [...gameState.cards, newCard] });
  };

  const handleModifyCounter = (cardId: string, stat: 'atk' | 'hp', delta: number) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard || targetCard.zone.startsWith('hand')) return;
    const newCards = gameState.cards.map(c =>
      c.id === cardId ? { ...c, counters: { ...c.counters, [stat]: c.counters[stat] + delta } } : c
    );
    syncState({ ...gameState, cards: newCards });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const cardId = active.id;
    const overId = over.id as string;
    if (cardId === overId) return;
    const activeCard = gameState.cards.find(c => c.id === cardId);
    if (!activeCard) return;

    let targetZone = overId;
    let isFlipped = activeCard.isFlipped;
    const overCard = gameState.cards.find(c => c.id === overId);
    if (overCard) {
      if (overCard.zone.startsWith('field')) {
        const newCards = gameState.cards.map(c =>
          c.id === cardId ? { ...c, zone: overCard.zone, attachedTo: overCard.id, isFlipped: false, isTapped: false } : c
        );
        syncState({ ...gameState, cards: newCards });
        return;
      } else targetZone = overCard.zone;
    }

    if (targetZone.startsWith('field') || targetZone.startsWith('ex') || targetZone.startsWith('hand') || targetZone.startsWith('cemetery') || targetZone.startsWith('banish')) {
      isFlipped = false;
    }

    let baseZonePrefix = targetZone.split('-')[0];
    if (['mainDeck', 'evolveDeck', 'hand', 'cemetery', 'banish'].includes(baseZonePrefix)) {
      const correctOwner = activeCard.owner;
      const restrictedDestinations = ['mainDeck', 'hand', 'cemetery', 'banish'];
      if (activeCard.isEvolveCard && restrictedDestinations.includes(baseZonePrefix)) baseZonePrefix = 'evolveDeck';
      else if (!activeCard.isEvolveCard && baseZonePrefix === 'evolveDeck') baseZonePrefix = 'mainDeck';
      targetZone = `${baseZonePrefix}-${correctOwner}`;
      if (activeCard.cardId === 'token') {
        syncState({ ...gameState, cards: gameState.cards.filter(c => c.id !== cardId) });
        return;
      }
    }

    if (baseZonePrefix === 'mainDeck') isFlipped = true;
    else if (['field', 'ex', 'hand', 'cemetery', 'banish'].includes(baseZonePrefix)) isFlipped = false;

    const movedCard = {
      ...activeCard, 
      zone: targetZone, 
      attachedTo: undefined, 
      isFlipped,
      isTapped: ['mainDeck', 'evolveDeck', 'hand', 'cemetery', 'banish'].includes(baseZonePrefix) ? false : activeCard.isTapped,
      counters: baseZonePrefix === 'hand' ? { atk: 0, hp: 0 } : activeCard.counters
    };

    const otherCards = gameState.cards.filter(c => c.id !== cardId);

    // If returning to deck, move to the FRONT (Top of deck)
    let finalCards: CardInstance[];
    if (baseZonePrefix === 'mainDeck' || baseZonePrefix === 'evolveDeck') {
      finalCards = [movedCard, ...otherCards];
    } else {
      // Otherwise maintain original index relation for others
      finalCards = gameState.cards.map(c => c.id === cardId ? movedCard : c);
    }

    syncState({ ...gameState, cards: finalCards });
  };

  const toggleTap = (cardId: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;
    const baseId = targetCard.attachedTo || targetCard.id;
    const stackIds = new Set([baseId]);
    gameState.cards.forEach(c => { if (c.attachedTo === baseId) stackIds.add(c.id); });
    const newIsTapped = !targetCard.isTapped;
    const newCards = gameState.cards.map(c => stackIds.has(c.id) ? { ...c, isTapped: newIsTapped } : c);
    syncState({ ...gameState, cards: newCards });
  };

  const handleFlipCard = (cardId: string) => {
    const newCards = gameState.cards.map(c => c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c);
    syncState({ ...gameState, cards: newCards });
  };

  const handleSendToBottom = (cardId: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;
    if (targetCard.cardId === 'token') {
      syncState({ ...gameState, cards: gameState.cards.filter(c => c.id !== cardId) });
      return;
    }
    const destinationDeck = targetCard.isEvolveCard ? 'evolveDeck' : 'mainDeck';
    const destinationZone = `${destinationDeck}-${targetCard.owner}`;
    const destinationFlipped = !targetCard.isEvolveCard;
    
    const movedCard = { 
      ...targetCard, 
      zone: destinationZone, 
      isFlipped: destinationFlipped, 
      isTapped: false, 
      attachedTo: undefined, 
      counters: { atk: 0, hp: 0 } 
    };

    // Filter out target card and its attachments
    const otherCards = gameState.cards.filter(c => c.id !== cardId && c.attachedTo !== cardId);
    
    // Also resolve attachments
    const movedAttachments = gameState.cards
      .filter(c => c.attachedTo === cardId)
      .map(c => ({
        ...c,
        zone: c.isEvolveCard ? `evolveDeck-${c.owner}` : `mainDeck-${c.owner}`,
        isFlipped: !c.isEvolveCard,
        isTapped: false,
        attachedTo: undefined,
        counters: { atk: 0, hp: 0 }
      }));

    // New order: [Existing other cards, attachments, the target card itself at the absolute bottom]
    syncState({ ...gameState, cards: [...otherCards, ...movedAttachments, movedCard] });
  };

  const handleBanish = (cardId: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;
    if (targetCard.cardId === 'token') {
      syncState({ ...gameState, cards: gameState.cards.filter(c => c.id !== cardId) });
      return;
    }
    const destinationZone = targetCard.isEvolveCard ? `evolveDeck-${targetCard.owner}` : `banish-${targetCard.owner}`;
    const newCards = gameState.cards.map(c => {
      if (c.id === cardId) return { ...c, zone: destinationZone, isTapped: false, isFlipped: false, attachedTo: undefined, counters: { atk: 0, hp: 0 } };
      if (c.attachedTo === cardId) return { ...c, zone: c.isEvolveCard ? `evolveDeck-${c.owner}` : `banish-${c.owner}`, isTapped: false, isFlipped: false, attachedTo: undefined, counters: { atk: 0, hp: 0 } };
      return c;
    });
    syncState({ ...gameState, cards: newCards });
  };

  const handlePlayToField = (cardId: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;
    syncState({
      ...gameState,
      cards: gameState.cards.map(c =>
        c.id === cardId ? { ...c, zone: `field-${targetCard.owner}`, attachedTo: undefined, isTapped: false, isFlipped: false } : c
      )
    });
  };

  const handleSendToCemetery = (cardId: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;
    if (targetCard.cardId === 'token') {
      syncState({ ...gameState, cards: gameState.cards.filter(c => c.id !== cardId) });
      return;
    }
    const targetDestination = targetCard.isEvolveCard ? `evolveDeck-${targetCard.owner}` : `cemetery-${targetCard.owner}`;
    const newCards = gameState.cards.map(c => {
      if (c.id === cardId) return { ...c, zone: targetDestination, isTapped: false, isFlipped: false, attachedTo: undefined, counters: { atk: 0, hp: 0 } };
      if (c.attachedTo === cardId) return { ...c, zone: c.isEvolveCard ? `evolveDeck-${c.owner}` : `cemetery-${c.owner}`, isTapped: false, isFlipped: false, attachedTo: undefined, counters: { atk: 0, hp: 0 } };
      return c;
    });
    syncState({ ...gameState, cards: newCards });
  };

  const handleReturnEvolve = (cardId: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;
    if (targetCard.cardId === 'token') {
      syncState({ ...gameState, cards: gameState.cards.filter(c => c.id !== cardId) });
      return;
    }
    const destinationZone = `evolveDeck-${targetCard.owner}`;
    const movedCard = { 
      ...targetCard, 
      zone: destinationZone, 
      isTapped: false, 
      isFlipped: false, 
      attachedTo: undefined, 
      counters: { atk: 0, hp: 0 } 
    };

    const otherCards = gameState.cards.filter(c => c.id !== cardId);
    // Push to the end of array to ensure it's at the "bottom" (back) of the evolve deck
    syncState({ ...gameState, cards: [...otherCards, movedCard] });
  };

  const handleShuffleDeck = () => {
    const deckCards = gameState.cards.filter(c => c.zone === `mainDeck-${role}`);
    const otherCards = gameState.cards.filter(c => c.zone !== `mainDeck-${role}`);
    const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
    syncState({ ...gameState, cards: [...otherCards, ...shuffled] });
  };

  const getCards = (zone: string) => gameState.cards.filter(c => c.zone === zone);

  return {
    room, isHost, role, status, gameState, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage,
    isRollingDice, diceValue, mulliganOrder, isMulliganModalOpen, setIsMulliganModalOpen,
    handleStatChange, setPhase, endTurn, handleUndoTurn, handleSetInitialTurnOrder,
    handlePureCoinFlip, handleRollDice, handleStartGame, handleToggleReady,
    handleDrawInitialHand, startMulligan, handleMulliganOrderSelect, executeMulligan,
    drawCard, handleExtractCard, confirmResetGame, handleDeckUpload, spawnToken,
    handleModifyCounter, handleDragEnd, toggleTap, handleFlipCard, handleSendToBottom,
    handleBanish, handlePlayToField, handleSendToCemetery, handleReturnEvolve, handleShuffleDeck,
    getCards, lastGameState, millCard,
    topDeckCards, handleLookAtTop, handleResolveTopDeck, setTopDeckCards
  };
};
