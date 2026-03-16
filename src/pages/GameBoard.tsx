import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Peer, { type DataConnection } from 'peerjs';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { type CardInstance } from '../components/Card';
import Zone from '../components/Zone';
import CardSearchModal from '../components/CardSearchModal';

interface SyncState {
  host: PlayerHUD;
  guest: PlayerHUD;
  cards: CardInstance[]; // all cards in play
  turnPlayer: 'host' | 'guest';
  turnCount: number;
  phase: 'Start' | 'Main' | 'End';
  gameStatus: 'preparing' | 'playing';
}

interface PlayerHUD {
  hp: number;
  pp: number;
  maxPp: number;
  ep: number;
  sep: number;
  combo: number;
  initialHandDrawn: boolean;
  mulliganUsed: boolean;
  isReady: boolean;
}

const initialState: SyncState = {
  host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
  guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
  cards: [],
  turnPlayer: 'host', // Host goes first by default, but can be decided by coin flip
  turnCount: 1,
  phase: 'Start',
  gameStatus: 'preparing'
};

// Quick helper to generate random ID
const uuid = () => Math.random().toString(36).substr(2, 9);

const GameBoard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const room = searchParams.get('room') || '';
  const isHost = searchParams.get('host') === 'true';
  const role = isHost ? 'host' : 'guest';

  const [status, setStatus] = useState<string>('Initializing P2P...');
  const [gameState, setGameState] = useState<SyncState>(initialState);
  const [searchZone, setSearchZone] = useState<{ id: string, title: string } | null>(null);
  
  // Custom dialog states to replace native window.confirm/alert
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [coinMessage, setCoinMessage] = useState<string | null>(null);
  const [turnMessage, setTurnMessage] = useState<string | null>(null);
  const [lastGameState, setLastGameState] = useState<SyncState | null>(null);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);

  // Mulligan order selection state: list of card IDs in chosen return order
  const [mulliganOrder, setMulliganOrder] = useState<string[]>([]);
  const [isMulliganModalOpen, setIsMulliganModalOpen] = useState(false);
  
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

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
        setTimeout(() => conn.send({ type: 'SYNC', state: gameState }), 500);
      }
    });

    return () => peer.destroy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, isHost]);

  // Handle Turn Start Notification
  useEffect(() => {
    if (gameState.gameStatus === 'playing' && gameState.turnPlayer === role && gameState.turnCount > 0) {
      setTurnMessage("YOUR TURN");
      setTimeout(() => setTurnMessage(null), 2500);
    }
  }, [gameState.turnPlayer, gameState.turnCount, gameState.gameStatus, role]);

  const setupConnection = (conn: DataConnection) => {
    connRef.current = conn;
    conn.on('open', () => {
      if (!isHost) setStatus('Connected to host! Game ready.');
    });
    conn.on('data', (data: any) => {
      if (data.type === 'SYNC') {
        setGameState(data.state);
        setLastGameState(null); // Clear local undo state if opponent synced a new board
      }
    });
    conn.on('close', () => setStatus('Opponent disconnected.'));
  };

  const syncState = (newState: SyncState) => {
    setGameState(newState);
    if (connRef.current?.open) {
      connRef.current.send({ type: 'SYNC', state: newState });
    }
  };

  const handleStatChange = (playerKey: 'host' | 'guest', stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo', delta: number) => {
    let newValue = gameState[playerKey][stat] + delta;
    
    // Apply clamping rules
    if (stat === 'maxPp') {
      newValue = Math.min(10, Math.max(0, newValue));
    } else if (stat === 'pp') {
      newValue = Math.min(gameState[playerKey].maxPp, Math.max(0, newValue));
    } else {
      newValue = Math.max(0, newValue);
    }

    syncState({
      ...gameState,
      [playerKey]: {
        ...gameState[playerKey],
        [stat]: newValue
      }
    });
  };

  const setPhase = (newPhase: 'Start' | 'Main' | 'End') => {
    syncState({ ...gameState, phase: newPhase });
  };

  const endTurn = () => {
    // Save current state before modification for Undo (deep copy to avoid reference issues)
    setLastGameState(JSON.parse(JSON.stringify(gameState)));

    const nextPlayer = gameState.turnPlayer === 'host' ? 'guest' : 'host';
    const isNewTurnRound = nextPlayer === 'host'; // Assuming Host goes first, round completes when Guest finishes
    const newTurnCount = isNewTurnRound ? gameState.turnCount + 1 : gameState.turnCount;

    // Start Phase Logic for next player
    const nextPlayerState = { ...gameState[nextPlayer] };
    
    // 1. Max PP +1 (up to 10)
    if (nextPlayerState.maxPp < 10) {
      nextPlayerState.maxPp += 1;
    }
    // 2. Recover PP
    nextPlayerState.pp = nextPlayerState.maxPp;
    // 3. Reset Combo
    nextPlayerState.combo = 0;

    // 3. Stand all fields (handled dynamically or we can explicitly un-tap here)
    // Actually, rulebook says untap all field cards at Start Phase
    const newCards = gameState.cards.map(c => 
      c.isTapped && c.zone === `field-${nextPlayer}`
        ? { ...c, isTapped: false }
        : c
    );

    syncState({
      ...gameState,
      turnPlayer: nextPlayer,
      turnCount: newTurnCount,
      phase: 'Start',
      [nextPlayer]: nextPlayerState,
      cards: newCards
    });
  };

  const handleUndoTurn = () => {
    if (lastGameState) {
      syncState(lastGameState);
      setLastGameState(null);
    }
  };

  const handleSetInitialTurnOrder = (forcedStarter?: 'host' | 'guest') => {
    // 50/50 chance if no forced starter
    const isHostFirst = forcedStarter ? (forcedStarter === 'host') : (Math.random() > 0.5);
    const starter = isHostFirst ? 'host' : 'guest';
    const second = isHostFirst ? 'guest' : 'host';

    syncState({
      ...gameState,
      turnPlayer: starter,
      turnCount: 1,
      phase: 'Start',
      [starter]: { ...gameState[starter], ep: 0 }, // First player typically gets 0 EP
      [second]: { ...gameState[second], ep: 3 }    // Second player typically gets 3 EP
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
    
    // Draw top 4 cards
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
    // Cards to return are already in hand, but we move them to deck bottom in the chosen order.
    // Order: The 1st selected is the "top" of the bottom 4, the 4th selected is the ABSOLUTE bottom.
    
    const remainingCards = gameState.cards.filter(c => !mulliganOrder.includes(c.id));
    const returnedCards = mulliganOrder.map(id => {
      const c = gameState.cards.find(card => card.id === id)!;
      return { ...c, zone: `mainDeck-${role}`, isFlipped: true, isTapped: false };
    });

    // Re-construct the deck: [Current Other Cards] + [Chosen Returned Cards]
    // Note: mainDeck logic assumes top is index 0. So bottom is at the end.
    const otherInDeck = myDeck.filter(c => !mulliganOrder.includes(c.id));
    const newDeckPart = [...otherInDeck, ...returnedCards];
    
    // Draw new 4 cards from the TOP of the updated deck (excluding the ones we just returned)
    const newHandIds = otherInDeck.slice(0, 4).map(c => c.id);
    
    const finalCards = gameState.cards.map(c => {
      if (mulliganOrder.includes(c.id)) {
        return { ...c, zone: `mainDeck-${role}`, isFlipped: true };
      }
      if (newHandIds.includes(c.id)) {
        return { ...c, zone: `hand-${role}`, isFlipped: false };
      }
      return c;
    });

    syncState({
      ...gameState,
      cards: finalCards,
      [role]: { ...gameState[role], mulliganUsed: true }
    });
    setIsMulliganModalOpen(false);
  };

  const drawCard = () => {
    const myDeck = gameState.cards.filter(c => c.zone === `mainDeck-${role}`);
    if (myDeck.length === 0) return;

    // Draw the top card (first in array)
    const topCard = myDeck[0];
    const newCards = gameState.cards.map(c => 
      c.id === topCard.id ? { ...c, zone: `hand-${role}`, isFlipped: false } : c
    );
    syncState({ ...gameState, cards: newCards });
  };

  const handleExtractCard = (cardId: string, customDestination?: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;
    
    // By default, Evolve cards go to Field, others go to Hand.
    // octrice/usurpation effects might target specific zones.
    let destinationZone = targetCard.isEvolveCard ? `field-${role}` : `hand-${role}`;
    
    if (customDestination) {
      destinationZone = customDestination;
    }
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
    setSearchZone(null); // Close modal
  };

  const confirmResetGame = () => {
    setShowResetConfirm(false);
    
    // Purge tokens, and reset other cards to their original decks face-down
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
    
    syncState({
      ...initialState,
      turnPlayer: 'host', // Reset to host first
      cards: resetCards
    });
  };

  const handleDeckUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value so the same file name can be uploaded again if needed (e.g. after Undo)
    event.target.value = '';
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const newCards: CardInstance[] = [];

        // Shuffle main deck
        const shuffledMain = [...(data.mainDeck || [])].sort(() => Math.random() - 0.5);
        shuffledMain.forEach((c: any) => {
          newCards.push({
            id: uuid(), cardId: c.id, name: c.name, image: c.image,
            zone: `mainDeck-${role}`, owner: role, isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 }
          });
        });

        // Evolve deck (unused cards are physically placed face down)
        (data.evolveDeck || []).forEach((c: any) => {
          newCards.push({
            id: uuid(), cardId: c.id, name: c.name, image: c.image,
            zone: `evolveDeck-${role}`, owner: role, isTapped: false, isFlipped: true, counters: { atk: 0, hp: 0 }, isEvolveCard: true
          });
        });

        const otherPlayersCards = gameState.cards.filter(c => c.owner !== role);
        syncState({ ...gameState, cards: [...otherPlayersCards, ...newCards] });
      } catch (err) {
        alert("Failed to parse deck JSON.");
      }
    };
    reader.readAsText(file);
  };

  const spawnToken = () => {
    const newCard: CardInstance = {
      id: uuid(),
      cardId: 'token',
      name: 'Token',
      image: 'https://shadowverse-evolve.com/wordpress/wp-content/themes/shadowverse-evolve-release_v0/assets/images/common/ogp.jpg',
      zone: `ex-${role}`,
      owner: role,
      isTapped: false,
      isFlipped: false,
      counters: { atk: 1, hp: 1 }
    };
    syncState({ ...gameState, cards: [...gameState.cards, newCard] });
  };

  const handleModifyCounter = (cardId: string, stat: 'atk' | 'hp', delta: number) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard || targetCard.zone.startsWith('hand')) return;

    const newCards = gameState.cards.map(c => 
      c.id === cardId ? { 
        ...c, 
        counters: { ...c.counters, [stat]: c.counters[stat] + delta } 
      } : c
    );
    syncState({ ...gameState, cards: newCards });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const cardId = active.id;
    const overId = over.id as string;

    if (cardId === overId) return; // Prevent clicking from making the card disappear

    const activeCard = gameState.cards.find(c => c.id === cardId);
    if (!activeCard) return;

    let targetZone = overId;
    let isFlipped = activeCard.isFlipped;

    // Check if we dropped onto another card
    const overCard = gameState.cards.find(c => c.id === overId);
    if (overCard) {
      if (overCard.zone.startsWith('field')) {
        // Stacking Evolve onto field follower
        const newCards = gameState.cards.map(c => 
          c.id === cardId ? { ...c, zone: overCard.zone, attachedTo: overCard.id, isFlipped: false, isTapped: false } : c
        );
        syncState({ ...gameState, cards: newCards });
        return;
      } else {
        // Dropped on a card in a deck/hand/etc. Just move it to that card's zone.
        targetZone = overCard.zone;
      }
    }

    if (targetZone.startsWith('field') || targetZone.startsWith('ex') || targetZone.startsWith('hand') || targetZone.startsWith('cemetery') || targetZone.startsWith('banish')) {
      isFlipped = false; // Reveal when entering open play areas
    }

    // ENFORCE OWNERSHIP RETURNING & DECK TYPE RESTRICTIONS
    let baseZonePrefix = targetZone.split('-')[0];
    if (['mainDeck', 'evolveDeck', 'hand', 'cemetery', 'banish'].includes(baseZonePrefix)) {
      // 1. Ensure stolen cards return to original owner's zones
      const correctOwner = activeCard.owner;

      // 2. Ensure Evolve cards ONLY go to Evolve Deck when leaving play (Hand, Main Deck, Cemetery, Banish all redirect)
      const restrictedDestinations = ['mainDeck', 'hand', 'cemetery', 'banish'];
      if (activeCard.isEvolveCard && restrictedDestinations.includes(baseZonePrefix)) {
        baseZonePrefix = 'evolveDeck';
      } else if (!activeCard.isEvolveCard && baseZonePrefix === 'evolveDeck') {
        baseZonePrefix = 'mainDeck';
      }

      targetZone = `${baseZonePrefix}-${correctOwner}`;
      
      // Tokens disappear entirely if entering these restricted/hidden zones
      if (activeCard.cardId === 'token') {
        const remainingCards = gameState.cards.filter(c => c.id !== cardId);
        syncState({ ...gameState, cards: remainingCards });
        return;
      }
    }
    const baseZone = baseZonePrefix; // Update for reuse below

    // Define flip state based on where it's ending up
    if (baseZone === 'mainDeck') {
      isFlipped = true;
    } else if (['field', 'ex', 'hand', 'cemetery', 'banish'].includes(baseZone)) {
      isFlipped = false;
    }
    // For evolveDeck, we preserve the current flipped state (USED/UNUSED status)

    const isEnteringRestrictedZone = ['mainDeck', 'evolveDeck', 'hand', 'cemetery', 'banish'].includes(baseZone);
    
    const isEnteringHand = baseZone === 'hand';
    
    const newCards = gameState.cards.map(c => 
      c.id === cardId ? { 
        ...c, 
        zone: targetZone, 
        attachedTo: undefined, 
        isFlipped, 
        isTapped: isEnteringRestrictedZone ? false : c.isTapped,
        counters: isEnteringHand ? { atk: 0, hp: 0 } : c.counters
      } : c
    );

    syncState({ ...gameState, cards: newCards });
  };

  const toggleTap = (cardId: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;

    // Find all cards in this "stack" (either attached to this, or this is attached to something)
    const baseId = targetCard.attachedTo || targetCard.id;
    const stackIds = new Set([baseId]);
    gameState.cards.forEach(c => {
      if (c.attachedTo === baseId) stackIds.add(c.id);
    });

    const newIsTapped = !targetCard.isTapped;
    const newCards = gameState.cards.map(c => 
      stackIds.has(c.id) ? { ...c, isTapped: newIsTapped } : c
    );
    syncState({ ...gameState, cards: newCards });
  };

  const handleFlipCard = (cardId: string) => {
    const newCards = gameState.cards.map(c => 
      c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c
    );
    syncState({ ...gameState, cards: newCards });
  };

  const handleSendToBottom = (cardId: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;

    // Tokens disappear when sent to bottom of deck
    if (targetCard.cardId === 'token') {
       const filtered = gameState.cards.filter(c => c.id !== cardId);
       syncState({ ...gameState, cards: filtered });
       return;
    }

    // Prevent Evolve cards from entering Main Deck, and ensure stolen cards go to original OWNER's deck
    const destinationDeck = targetCard.isEvolveCard ? 'evolveDeck' : 'mainDeck';
    const destinationZone = `${destinationDeck}-${targetCard.owner}`;
    
    // Evolve cards are face up if they are in the Evolve Deck used, but usually bottom decking means returning it.
    const destinationFlipped = !targetCard.isEvolveCard; 

    // Push target to the appropriate deck
    const movedCard = { ...targetCard, zone: destinationZone, isFlipped: destinationFlipped, isTapped: false, attachedTo: undefined, counters: { atk: 0, hp: 0 } };
    
    // Also handle any attachments
    const newCards = gameState.cards.map(c => {
      if (c.id === cardId) return movedCard;
      if (c.attachedTo === cardId) {
        const attachDestZone = c.isEvolveCard ? `evolveDeck-${c.owner}` : `mainDeck-${c.owner}`;
        const attachFlipped = !c.isEvolveCard;
        return { ...c, zone: attachDestZone, isFlipped: attachFlipped, isTapped: false, attachedTo: undefined, counters: { atk: 0, hp: 0 } };
      }
      return c;
    });

    syncState({ ...gameState, cards: newCards });
  };

  const handleBanish = (cardId: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;

    if (targetCard.cardId === 'token') {
       const filtered = gameState.cards.filter(c => c.id !== cardId);
       syncState({ ...gameState, cards: filtered });
       return;
    }

    const destinationZone = targetCard.isEvolveCard ? `evolveDeck-${targetCard.owner}` : `banish-${targetCard.owner}`;

    const newCards = gameState.cards.map(c => {
      if (c.id === cardId) {
        return { ...c, zone: destinationZone, isTapped: false, isFlipped: false, attachedTo: undefined, counters: { atk: 0, hp: 0 } };
      }
      if (c.attachedTo === cardId) {
        // Handle attachments during banish: Evolve cards back to deck, others to banish
        const attachDest = c.isEvolveCard ? `evolveDeck-${c.owner}` : `banish-${c.owner}`;
        return { ...c, zone: attachDest, isTapped: false, isFlipped: false, attachedTo: undefined, counters: { atk: 0, hp: 0 } };
      }
      return c;
    });
    syncState({ ...gameState, cards: newCards });
  };

  const handleSendToCemetery = (cardId: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;

    if (targetCard.cardId === 'token') {
       const filtered = gameState.cards.filter(c => c.id !== cardId);
       syncState({ ...gameState, cards: filtered });
       return;
    }

    // Determine the destination for the target card itself
    const targetDestination = targetCard.isEvolveCard 
      ? `evolveDeck-${targetCard.owner}` 
      : `cemetery-${targetCard.owner}`;
    
    const newCards = gameState.cards.map(c => {
      if (c.id === cardId) {
        // Reset state and move to its proper destination
        return { ...c, zone: targetDestination, isTapped: false, isFlipped: false, attachedTo: undefined, counters: { atk: 0, hp: 0 } };
      }
      if (c.attachedTo === cardId) {
        // Handle attachments during cemetery move: Evolve cards back to deck, others to cemetery
        const attachDest = c.isEvolveCard ? `evolveDeck-${c.owner}` : `cemetery-${c.owner}`;
        return { ...c, zone: attachDest, isTapped: false, isFlipped: false, attachedTo: undefined, counters: { atk: 0, hp: 0 } };
      }
      return c;
    });

    syncState({ ...gameState, cards: newCards });
  };

  const handleReturnEvolve = (cardId: string) => {
    const targetCard = gameState.cards.find(c => c.id === cardId);
    if (!targetCard) return;

    if (targetCard.cardId === 'token') {
       const filtered = gameState.cards.filter(c => c.id !== cardId);
       syncState({ ...gameState, cards: filtered });
       return;
    }

    // According to Shadowverse Evolve rules, when an evolved card leaves the field, it goes FACE UP onto the Evolve Deck.
    // If somehow a non-evolve card triggered this, route it to the main deck as a safety fallback.
    const destinationDeck = targetCard.isEvolveCard ? 'evolveDeck' : 'mainDeck';
    const isFlipped = !targetCard.isEvolveCard; // main deck cards should be face down

    const newCards = gameState.cards.map(c => 
      c.id === cardId ? { ...c, zone: `${destinationDeck}-${c.owner}`, isTapped: false, isFlipped, attachedTo: undefined, counters: { atk: 0, hp: 0 } } : c
    );
    syncState({ ...gameState, cards: newCards });
  };

  const handleShuffleDeck = () => {
    const deckCards = gameState.cards.filter(c => c.zone === `mainDeck-${role}`);
    const otherCards = gameState.cards.filter(c => c.zone !== `mainDeck-${role}`);
    
    // Fisher-Yates inline or random sort
    const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
    
    syncState({ ...gameState, cards: [...otherCards, ...shuffled] });
  };

  // Helper to filter cards for a zone and enforce privacy flipping during render
  const getCards = (zone: string) => gameState.cards.filter(c => c.zone === zone);

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflow: 'hidden' }}>
        
        {/* Header bar */}
        {/* Header bar tracking Phase / Turn */ }
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>Room: <strong>{room}</strong></span>
            <span style={{ color: status.includes('ready') ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}>{status}</span>
            
            {gameState.gameStatus === 'preparing' ? (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button 
                  onClick={() => handleSetInitialTurnOrder()} 
                  disabled={!isHost}
                  style={{ padding: '0.3rem 0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: isHost ? 1 : 0.5 }}
                >
                  🪙 Random
                </button>
                <button 
                  onClick={() => handleSetInitialTurnOrder(role)} 
                  disabled={!isHost}
                  style={{ padding: '0.3rem 0.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: isHost ? 1 : 0.5 }}
                >
                  Me 1st
                </button>
                <button 
                  onClick={() => handleSetInitialTurnOrder(isHost ? 'guest' : 'host')} 
                  disabled={!isHost}
                  style={{ padding: '0.3rem 0.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: isHost ? 1 : 0.5 }}
                >
                  Opp 1st
                </button>
                {!gameState[role].initialHandDrawn && (
                  <button 
                    onClick={handleDrawInitialHand}
                    style={{ padding: '0.3rem 0.6rem', background: '#3b82f6', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    🃏 Draw Hand (4)
                  </button>
                )}

                <button 
                  onClick={handleStartGame} 
                  disabled={!isHost || !gameState.host.isReady || !gameState.guest.isReady}
                  style={{ 
                    padding: '0.3rem 0.6rem', 
                    background: 'var(--vivid-green-cyan)', 
                    color: 'black', 
                    fontWeight: 'bold', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: (isHost && gameState.host.isReady && gameState.guest.isReady) ? 'pointer' : 'not-allowed', 
                    fontSize: '0.75rem', 
                    opacity: (isHost && gameState.host.isReady && gameState.guest.isReady) ? 1 : 0.5,
                    boxShadow: (isHost && gameState.host.isReady && gameState.guest.isReady) ? '0 0 10px rgba(0, 208, 132, 0.4)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { if(isHost && gameState.host.isReady && gameState.guest.isReady) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                  onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                >
                  ▶ START GAME
                </button>

                {gameState[role].initialHandDrawn && (
                  <button 
                    onClick={handleToggleReady}
                    style={{ 
                      padding: '0.3rem 0.6rem', 
                      background: gameState[role].isReady ? '#ef4444' : 'var(--vivid-green-cyan)', 
                      color: gameState[role].isReady ? 'white' : 'black', 
                      fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' 
                    }}
                  >
                    {gameState[role].isReady ? '✕ Cancel Ready' : '✅ Ready (準備完了)'}
                  </button>
                )}

                <div style={{ display: 'flex', gap: '0.8rem', marginLeft: '0.5rem', borderLeft: '1px solid var(--border-light)', paddingLeft: '0.8rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>HOST</span>
                    <span style={{ color: gameState.host.isReady ? 'var(--vivid-green-cyan)' : '#ef4444', fontWeight: 'bold' }}>
                      {gameState.host.isReady ? 'READY' : (gameState.host.initialHandDrawn ? 'DECIDING' : 'WAITING')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>GUEST</span>
                    <span style={{ color: gameState.guest.isReady ? 'var(--vivid-green-cyan)' : '#ef4444', fontWeight: 'bold' }}>
                      {gameState.guest.isReady ? 'READY' : (gameState.guest.initialHandDrawn ? 'DECIDING' : 'WAITING')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <button 
                  onClick={handlePureCoinFlip} 
                  style={{ padding: '0.3rem 0.6rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  🪙 Toss Coin
                </button>
                <button 
                  onClick={handleRollDice} 
                  style={{ padding: '0.3rem 0.6rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold' }}
                >
                  🎲 Roll Dice
                </button>
              </>
            )}

            {gameState.turnPlayer !== role && lastGameState && (
              <button 
                onClick={handleUndoTurn} 
                style={{ 
                  padding: '0.3rem 0.6rem', 
                  background: '#ec4899', 
                  color: 'white', 
                  fontWeight: 'bold', 
                  border: '1px solid rgba(255,255,255,0.5)', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ fontSize: '1rem' }}>↺</span> UNDO LAST END TURN
              </button>
            )}
          </div>

          {/* Turn Management */}
          {gameState.gameStatus === 'playing' && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-overlay)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              <span style={{ color: gameState.turnPlayer === role ? 'var(--vivid-green-cyan)' : 'var(--vivid-red)' }}>
                {gameState.turnPlayer === role ? "YOUR TURN" : "OPPONENT'S TURN"}
              </span>
              <span className="Garamond">TURN {gameState.turnCount}</span>
              <select 
                value={gameState.phase} 
                onChange={(e) => setPhase(e.target.value as 'Start' | 'Main' | 'End')} 
                disabled={gameState.turnPlayer !== role}
                style={{ padding: '0.2rem', borderRadius: '4px', background: 'black', color: 'white' }}
              >
                <option value="Start">Start Phase</option>
                <option value="Main">Main Phase</option>
                <option value="End">End Phase</option>
              </select>
            </div>
          )}
        </div>

        {/* Board Playmat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'url("https://shadowverse-evolve.com/wordpress/wp-content/themes/shadowverse-evolve-release_v0/assets/images/common/bg.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 'var(--radius-lg)', padding: '1rem', overflowY: 'auto', alignItems: 'center' }}>
          
          {/* OPPONENT BOARD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '4px', display: 'flex', gap: '1rem', color: '#fff' }}>
                <span>Opponent HP: <strong style={{color:'#ef4444'}}>{gameState[isHost ? 'guest' : 'host'].hp}</strong></span>
                <span>PP: <strong style={{color:'#3b82f6'}}>{gameState[isHost ? 'guest' : 'host'].pp}</strong> / {gameState[isHost ? 'guest' : 'host'].maxPp}</span>
                <span>EP: <strong style={{color:'#fbbf24'}}>{gameState[isHost ? 'guest' : 'host'].ep}</strong></span>
                <span>SEP: <strong style={{color:'#facc15'}}>{gameState[isHost ? 'guest' : 'host'].sep}</strong></span>
                <span>Combo: <strong>{gameState[isHost ? 'guest' : 'host'].combo}</strong></span>
              </div>
            </div>            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', width: '100%' }}>
              {/* Opponent Hand (STRICT HIDDEN) */}
              <div style={{ width: '110px' }}>
                 <Zone id={`hand-${isHost ? 'guest' : 'host'}`} label="Opponent Hand" cards={getCards(`hand-${isHost ? 'guest' : 'host'}`)} hideCards={true} layout="stack" isProtected={true} viewerRole={role} containerStyle={{ minHeight: '150px' }} />
              </div>
              
              <Zone id={`ex-${isHost ? 'guest' : 'host'}`} label="Opponent EX Area" cards={getCards(`ex-${isHost ? 'guest' : 'host'}`)} isProtected={true} viewerRole={role} containerStyle={{ maxWidth: '600px', minHeight: '150px', flex: 'none', width: '600px' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Zone id={`evolveDeck-${isHost ? 'guest' : 'host'}`} label="Opponent Evolve Deck" cards={getCards(`evolveDeck-${isHost ? 'guest' : 'host'}`)} layout="stack" isProtected={true} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                  <button onClick={() => setSearchZone({ id: `evolveDeck-${isHost ? 'guest' : 'host'}`, title: "Opponent's Evolve Deck (Used)" })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                </div>
                <Zone id={`mainDeck-${isHost ? 'guest' : 'host'}`} label="Opponent Main Deck" cards={getCards(`mainDeck-${isHost ? 'guest' : 'host'}`)} layout="stack" isProtected={true} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Zone id={`cemetery-${isHost ? 'guest' : 'host'}`} label="Opponent Cemetery" cards={getCards(`cemetery-${isHost ? 'guest' : 'host'}`)} layout="stack" viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                  <button onClick={() => setSearchZone({ id: `cemetery-${isHost ? 'guest' : 'host'}`, title: "Opponent's Cemetery" })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Zone id={`banish-${isHost ? 'guest' : 'host'}`} label="Opponent Banish" cards={getCards(`banish-${isHost ? 'guest' : 'host'}`)} layout="stack" viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                  <button onClick={() => setSearchZone({ id: `banish-${isHost ? 'guest' : 'host'}`, title: "Opponent's Banish Zone" })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                </div>
              </div>
            </div>
            <Zone id={`field-${isHost ? 'guest' : 'host'}`} label="Opponent Field" cards={getCards(`field-${isHost ? 'guest' : 'host'}`)} onTap={toggleTap} onModifyCounter={handleModifyCounter} onCemetery={handleSendToCemetery} viewerRole={role} containerStyle={{ maxWidth: '850px', minHeight: '160px', width: '850px', flex: 'none' }} />
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />

          {/* MY BOARD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Zone id={`field-${role}`} label="My Field" cards={getCards(`field-${role}`)} onTap={toggleTap} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} viewerRole={role} containerStyle={{ maxWidth: '850px', minHeight: '160px', width: '850px', flex: 'none' }} />
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Zone id={`ex-${role}`} label="My EX Area" cards={getCards(`ex-${role}`)} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} viewerRole={role} containerStyle={{ maxWidth: '600px', minHeight: '160px', flex: 'none', width: '600px' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`banish-${role}`} label="Banish" cards={getCards(`banish-${role}`)} layout="stack" onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onCemetery={handleSendToCemetery} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                <button onClick={() => setSearchZone({ id: `banish-${role}`, title: 'Banish Zone' })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`cemetery-${role}`} label="Cemetery" cards={getCards(`cemetery-${role}`)} layout="stack" onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                <button onClick={() => setSearchZone({ id: `cemetery-${role}`, title: 'Cemetery' })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`evolveDeck-${role}`} label="Evolve Deck" cards={getCards(`evolveDeck-${role}`)} layout="stack" isProtected={true} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                <button onClick={() => setSearchZone({ id: `evolveDeck-${role}`, title: 'Evolve Deck' })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`mainDeck-${role}`} label="Main Deck" cards={getCards(`mainDeck-${role}`)} layout="stack" isProtected={true} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button onClick={() => setSearchZone({ id: `mainDeck-${role}`, title: 'Main Deck' })} style={{ flex: 1, fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                  <button onClick={handleShuffleDeck} style={{ flex: 1, fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Shuffle</button>
                </div>
              </div>
            </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
                <div style={{ width: '850px', minHeight: '160px', position: 'relative' }}>
                  {/* My Hand - strictly hidden from opponent but visible to me */}
                  <Zone id={`hand-${role}`} label="My Hand" cards={getCards(`hand-${role}`)} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} isProtected={true} viewerRole={role} containerStyle={{ minHeight: '160px' }} />
                  
                  {/* Mulligan Button Overlay near hand */}
                  {gameState.gameStatus === 'preparing' && gameState[role].initialHandDrawn && !gameState[role].mulliganUsed && (
                    <button 
                      onClick={startMulligan}
                      style={{ 
                        position: 'absolute', top: '-10px', right: '10px',
                        padding: '0.5rem 1rem', background: '#eab308', color: 'black', 
                        fontWeight: 'bold', borderRadius: '4px', 
                        cursor: 'pointer', fontSize: '0.875rem', zIndex: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        border: '2px solid black'
                      }}
                    >
                      🔄 Mulligan (マリガンする)
                    </button>
                  )}
                </div>
               
               {/* Controls */}
               <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.8)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  
                  <label className="glass-panel" style={{ padding: '0.5rem', background: 'var(--bg-surface-elevated)', textAlign: 'center', cursor: 'pointer', fontSize: '0.875rem' }}>
                    Import Deck (.json)
                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleDeckUpload} />
                  </label>
                  
                  <button onClick={drawCard} className="glass-panel" style={{ padding: '0.5rem', background: 'var(--accent-primary)', fontWeight: 'bold' }}>
                    Draw Card
                  </button>

                  {gameState.turnPlayer === role && (
                    <button onClick={endTurn} className="glass-panel" style={{ padding: '0.5rem', background: '#f59e0b', color: 'black', fontWeight: 'bold', marginBottom: '4px' }}>
                      END TURN
                    </button>
                  )}

                  <button onClick={spawnToken} className="glass-panel" style={{ padding: '0.5rem', background: 'var(--accent-secondary)' }}>
                    Spawn Token
                  </button>
                  <button onClick={() => setShowResetConfirm(true)} className="glass-panel" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontWeight: 'bold' }}>
                    Reset Game
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>HP: {gameState[role].hp}</span>
                    <div>
                      <button onClick={() => handleStatChange(role, 'hp', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
                      <button onClick={() => handleStatChange(role, 'hp', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>EP: {gameState[role].ep}</span>
                    <div>
                      <button onClick={() => handleStatChange(role, 'ep', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
                      <button onClick={() => handleStatChange(role, 'ep', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#facc15', fontWeight: 'bold' }}>SEP: {gameState[role].sep}</span>
                    <div>
                      <button onClick={() => handleStatChange(role, 'sep', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
                      <button onClick={() => handleStatChange(role, 'sep', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>Combo (Play): {gameState[role].combo}</span>
                    <div>
                      <button onClick={() => handleStatChange(role, 'combo', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
                      <button onClick={() => handleStatChange(role, 'combo', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
                    </div>
                  </div>

                  {/* PP Tracker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem', padding: '0.6rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: 'inset 0 0 10px rgba(59, 130, 246, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {/* Max PP Adjustment (Vertical) */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                         <button onClick={() => handleStatChange(role, 'maxPp', 1)} style={{ width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '2px', cursor: 'pointer', fontSize: '0.75rem', color: '#fff' }}>+</button>
                         <span style={{ fontSize: '0.6rem', color: '#93c5fd', fontWeight: 'bold' }}>MAX</span>
                         <button onClick={() => handleStatChange(role, 'maxPp', -1)} style={{ width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '2px', cursor: 'pointer', fontSize: '0.75rem', color: '#fff' }}>-</button>
                      </div>
                      
                      {/* PP Display */}
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-2px' }}>Play Points</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px' }}>
                          <span style={{ color: '#3b82f6', fontWeight: '900', fontSize: '1.75rem', textShadow: '0 0 15px rgba(59, 130, 246, 0.5)' }}>
                            {gameState[role].pp}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', fontWeight: 'bold' }}>/</span>
                          <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold' }}>
                            {gameState[role].maxPp}
                          </span>
                        </div>
                      </div>

                      {/* Current PP Adjustment (Horizontal) */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={() => handleStatChange(role, 'pp', -1)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', color: '#3b82f6', fontWeight: 'bold', transition: 'all 0.2s' }}>∨</button>
                        <button onClick={() => handleStatChange(role, 'pp', 1)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', color: '#3b82f6', fontWeight: 'bold', transition: 'all 0.2s' }}>∧</button>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Mulligan Modal */}
      {isMulliganModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '800px', width: '90%', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>Mulligan: Select Return Order</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select cards in the order you want to put them on the <strong>bottom</strong> of your deck.<br/>
              (The 4th selection will be at the absolute bottom.)
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {gameState.cards.filter(c => c.zone === `hand-${role}`).map(card => {
                const selectionIndex = mulliganOrder.indexOf(card.id);
                return (
                  <div 
                    key={card.id} 
                    onClick={() => handleMulliganOrderSelect(card.id)}
                    style={{ 
                      position: 'relative', 
                      cursor: 'pointer', 
                      border: selectionIndex !== -1 ? '3px solid var(--accent-primary)' : '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '4px',
                      transition: 'all 0.2s',
                      transform: selectionIndex !== -1 ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: selectionIndex !== -1 ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none'
                    }}
                  >
                    <img src={card.image} alt={card.name} style={{ width: '120px', borderRadius: '4px' }} />
                    {selectionIndex !== -1 && (
                      <div style={{ 
                        position: 'absolute', top: '-10px', right: '-10px', 
                        background: 'var(--accent-primary)', color: 'white', 
                        borderRadius: '50%', width: '28px', height: '28px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                      }}>
                        {selectionIndex + 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => setIsMulliganModalOpen(false)}
                style={{ padding: '0.6rem 1.5rem', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeMulligan}
                disabled={mulliganOrder.length !== 4}
                style={{ 
                  padding: '0.6rem 2rem', 
                  background: mulliganOrder.length === 4 ? 'var(--vivid-green-cyan)' : 'var(--bg-surface-elevated)', 
                  color: mulliganOrder.length === 4 ? 'black' : 'var(--text-muted)', 
                  fontWeight: 'bold', border: 'none', borderRadius: '4px', 
                  cursor: mulliganOrder.length === 4 ? 'pointer' : 'not-allowed',
                  boxShadow: mulliganOrder.length === 4 ? '0 0 10px rgba(0, 208, 132, 0.3)' : 'none'
                }}
              >
                Exchange (Mulligan)
              </button>
            </div>
          </div>
        </div>
      )}

      <CardSearchModal 
        isOpen={searchZone !== null}
        onClose={() => setSearchZone(null)}
        title={searchZone?.title || ''}
        cards={searchZone ? (
          searchZone.id.startsWith('evolveDeck-') && !searchZone.id.endsWith(role)
            ? getCards(searchZone.id).filter(c => !c.isFlipped) // Only show face-up (used) cards for opponent's evolve deck
            : getCards(searchZone.id)
        ) : []}
        onExtractCard={handleExtractCard}
        onToggleFlip={handleFlipCard}
        viewerRole={role}
      />

      {/* Custom Global Overlays */}
      {coinMessage && (
        <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.85)', color: 'var(--vivid-green-cyan)', padding: '1.5rem 2.5rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--vivid-green-cyan)', fontSize: '1.25rem', fontWeight: 'bold', zIndex: 1000, boxShadow: 'var(--shadow-lg)' }}>
          {coinMessage}
        </div>
      )}

      {turnMessage && (
        <div style={{ 
          position: 'fixed', 
          top: '40%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          background: 'rgba(0,0,0,0.9)', 
          color: '#f59e0b', 
          padding: '2rem 4rem', 
          borderRadius: 'var(--radius-lg)', 
          border: '4px double #f59e0b', 
          fontSize: '3rem', 
          fontWeight: '900', 
          zIndex: 2000, 
          boxShadow: '0 0 30px rgba(245,158,11,0.4)', 
          textShadow: '0 0 10px rgba(0,0,0,0.5)', 
          pointerEvents: 'none', 
          letterSpacing: '8px' 
        }}>
          {turnMessage}
        </div>
      )}

      {showResetConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '2rem', borderRadius: 'var(--radius-md)', maxWidth: '400px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#fca5a5' }}>Reset Game</h3>
            <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)' }}>Are you sure you want to reset the game to its initial state? All cards will return to their starting decks.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setShowResetConfirm(false)} style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', color: 'white', cursor: 'pointer', borderRadius: '4px' }}>Cancel</button>
              <button onClick={confirmResetGame} style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>Yes, Reset</button>
            </div>
          </div>
        </div>
      )}

      {isRollingDice && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.4)', 
          backdropFilter: 'blur(4px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 3000,
          pointerEvents: 'none'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            background: 'white',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '4rem',
            fontWeight: '900',
            color: '#1f2937',
            boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)',
            border: '4px solid #8b5cf6',
            animation: 'diceRoll 0.1s infinite alternate'
          }}>
            {diceValue}
          </div>
          <style>{`
            @keyframes diceRoll {
              from { transform: rotate(-10deg) scale(0.9); }
              to { transform: rotate(10deg) scale(1.1); }
            }
          `}</style>
        </div>
      )}
    </DndContext>
  );
};

export default GameBoard;
