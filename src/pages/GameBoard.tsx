import React from 'react';
import { DndContext } from '@dnd-kit/core';
import Zone from '../components/Zone';
import type { CardInspectAnchor, CardInstance } from '../components/Card';
import CardSearchModal from '../components/CardSearchModal';
import TopDeckModal from '../components/TopDeckModal';
import { useGameBoardLogic } from '../hooks/useGameBoardLogic';
import { canImportDeck, canUndoLastTurn, isHandCardMovementLocked } from '../utils/gameRules';
import { getPlayerLabel, getZoneOwner } from '../utils/soloMode';
import type { PlayerRole, TokenOption } from '../types/game';
import type { AttackTarget } from '../types/sync';
import { buildCardStatLookup, type CardStatLookup } from '../utils/cardStats';
import { buildCardDetailLookup, formatAbilityText, type CardDetailLookup } from '../utils/cardDetails';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { listSavedDecks, restoreSavedDeckToSnapshot, type SavedDeckRecordV1 } from '../utils/deckStorage';
import { getDeckValidationMessages, sanitizeImportedDeckState } from '../utils/deckBuilderRules';
import CardArtwork from '../components/CardArtwork';

type LegalSavedDeckOption = {
  deck: SavedDeckRecordV1;
  deckData: {
    mainDeck: DeckBuilderCardData[];
    evolveDeck: DeckBuilderCardData[];
    leaderCards: DeckBuilderCardData[];
    tokenDeck: DeckBuilderCardData[];
  };
  summary: string;
  counts: string;
};

const formatSavedDeckRuleSummary = (deck: SavedDeckRecordV1): string => {
  if (deck.ruleConfig.format === 'constructed') {
    if (deck.ruleConfig.identityType === 'title' && deck.ruleConfig.selectedTitle) {
      return `Constructed / Title: ${deck.ruleConfig.selectedTitle}`;
    }

    return `Constructed / Class: ${deck.ruleConfig.selectedClass ?? 'Unselected'}`;
  }

  if (deck.ruleConfig.format === 'crossover') {
    const [firstClass, secondClass] = deck.ruleConfig.selectedClasses;
    return `Crossover / ${firstClass ?? '?'} + ${secondClass ?? '?'}`;
  }

  return 'Other';
};

const formatSavedDeckCounts = (deck: SavedDeckRecordV1): string => {
  const countSection = (section: SavedDeckRecordV1['sections'][keyof SavedDeckRecordV1['sections']]) => (
    section.reduce((total, ref) => total + ref.count, 0)
  );

  return [
    `Main ${countSection(deck.sections.main)}`,
    `Evolve ${countSection(deck.sections.evolve)}`,
    `Leader ${countSection(deck.sections.leader)}`,
    `Token ${countSection(deck.sections.token)}`,
  ].join(' / ');
};

const GameBoard: React.FC = () => {
  const {
    room, isSoloMode, isHost, role, status, connectionState, canInteract, attemptReconnect, gameState, savedSessionCandidate, resumeSavedSession, discardSavedSession, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage, cardPlayMessage, attackMessage, eventHistory, attackVisual, revealedCardsOverlay,
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
  } = useGameBoardLogic();

  const [isTopNInputOpen, setIsTopNInputOpen] = React.useState(false);
  const [topNValue, setTopNValue] = React.useState(3);
  const [tokenSpawnTargetRole, setTokenSpawnTargetRole] = React.useState<PlayerRole | null>(null);
  const [showUndoConfirm, setShowUndoConfirm] = React.useState(false);
  const [topDeckTargetRole, setTopDeckTargetRole] = React.useState<PlayerRole>('host');
  const [mulliganTargetRole, setMulliganTargetRole] = React.useState<PlayerRole>('host');
  const [activeZoneActions, setActiveZoneActions] = React.useState<string | null>(null);
  const [cardStatLookup, setCardStatLookup] = React.useState<CardStatLookup>({});
  const [cardDetailLookup, setCardDetailLookup] = React.useState<CardDetailLookup>({});
  const [allCards, setAllCards] = React.useState<DeckBuilderCardData[]>([]);
  const [savedDeckOptions, setSavedDeckOptions] = React.useState<LegalSavedDeckOption[]>([]);
  const [savedDeckSearch, setSavedDeckSearch] = React.useState('');
  const [savedDeckImportTargetRole, setSavedDeckImportTargetRole] = React.useState<PlayerRole | null>(null);
  const [selectedInspectorCardId, setSelectedInspectorCardId] = React.useState<string | null>(null);
  const [selectedInspectorAnchor, setSelectedInspectorAnchor] = React.useState<CardInspectAnchor | null>(null);
  const [attackSourceCardId, setAttackSourceCardId] = React.useState<string | null>(null);
  const [isRoomCopied, setIsRoomCopied] = React.useState(false);
  const inspectorRef = React.useRef<HTMLDivElement | null>(null);
  const canOpenSavedDeckPicker = allCards.length > 0;
  const viewerRole = isSoloMode ? 'all' : role;
  const isPreparingHandMoveLocked = isHandCardMovementLocked(gameState);
  const topRole = (isSoloMode ? 'guest' : role === 'host' ? 'guest' : 'host') as PlayerRole;
  const bottomRole = (isSoloMode ? 'host' : role) as PlayerRole;
  const canImportTopDeck = canImportDeck(gameState, topRole);
  const canImportBottomDeck = canImportDeck(gameState, bottomRole);
  const savedDeckPickerUnavailableTitle = !canOpenSavedDeckPicker
    ? 'Loading card catalog... Please wait a moment.'
    : 'Available while preparing decks before the game starts.';
  const topLabel = getPlayerLabel(topRole, isSoloMode, 'My', 'Opponent', role);
  const bottomLabel = getPlayerLabel(bottomRole, isSoloMode, 'My', 'Opponent', role);
  const searchTargetRole = searchZone ? getZoneOwner(searchZone.id) ?? role : role;
  const currentTurnLabel = gameState.turnPlayer === bottomRole ? bottomLabel : topLabel;
  const canUndoTurn = canUndoLastTurn(gameState, lastGameState, role, isSoloMode);
  const isBottomTurnActive = gameState.gameStatus === 'playing' && gameState.turnPlayer === bottomRole;
  const isTopTurnActive = gameState.gameStatus === 'playing' && gameState.turnPlayer === topRole;
  const canResetGame = isSoloMode || isHost;
  const isGuestConnectionBlocked = !isSoloMode && !isHost && !canInteract;
  const connectionBadgeTone = connectionState === 'connected'
    ? { label: 'Connected', background: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.38)', color: '#d1fae5' }
    : connectionState === 'reconnecting' || connectionState === 'connecting'
      ? { label: 'Reconnecting', background: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.38)', color: '#fde68a' }
      : { label: 'Disconnected', background: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.38)', color: '#fecaca' };
  const interactionBlockedTitle = isGuestConnectionBlocked
    ? (connectionState === 'connecting' || connectionState === 'reconnecting'
      ? 'Reconnecting to host. Please wait.'
      : 'Connection to host is required.')
    : undefined;
  const savedSessionTimestamp = React.useMemo(() => {
    if (!savedSessionCandidate) return null;

    try {
      return new Date(savedSessionCandidate.savedAt).toLocaleString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        month: 'numeric',
        day: 'numeric',
      });
    } catch {
      return savedSessionCandidate.savedAt;
    }
  }, [savedSessionCandidate]);
  const sidePanelWidth = 220;
  const topPanelWidth = 188;
  const sideZoneWidth = 120;
  const centerZoneWidth = 800;
  const boardContentWidth = sideZoneWidth * 2 + centerZoneWidth;
  const boardColumns = `${sideZoneWidth}px ${centerZoneWidth}px ${sideZoneWidth}px`;
  const boardShellColumns = `${topPanelWidth}px ${boardContentWidth}px ${sidePanelWidth}px`;
  const attackSourceCard = attackSourceCardId
    ? gameState.cards.find(card => card.id === attackSourceCardId) ?? null
    : null;

  const handleCopyRoomId = React.useCallback(async () => {
    if (!room) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(room);
      } else if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.value = room;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      } else {
        return;
      }

      setIsRoomCopied(true);
      window.setTimeout(() => setIsRoomCopied(false), 1800);
    } catch {
      setIsRoomCopied(false);
    }
  }, [room]);

  React.useEffect(() => {
    if (isSoloMode || connectionState === 'connected') return;

    setIsTopNInputOpen(false);
    setTokenSpawnTargetRole(null);
    setShowUndoConfirm(false);
    setActiveZoneActions(null);
    setSelectedInspectorCardId(null);
    setSelectedInspectorAnchor(null);
    setAttackSourceCardId(null);
  }, [connectionState, isSoloMode]);

  const attackLine = React.useMemo(() => {
    if (!attackVisual || typeof document === 'undefined') return null;

    const sourceElement = document.querySelector<HTMLElement>(`[data-card-id="${attackVisual.attackerCardId}"]`);
    if (!sourceElement) return null;

    const sourceRect = sourceElement.getBoundingClientRect();
    const sourcePoint = {
      x: sourceRect.left + sourceRect.width / 2,
      y: sourceRect.top + sourceRect.height / 2,
    };

    const targetElement = attackVisual.target.type === 'card'
      ? document.querySelector<HTMLElement>(`[data-card-id="${attackVisual.target.cardId}"]`)
      : document.querySelector<HTMLElement>(`[data-leader-zone="leader-${attackVisual.target.player}"]`);

    if (!targetElement) return null;

    const targetRect = targetElement.getBoundingClientRect();
    const targetPoint = {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
    };

    return { sourcePoint, targetPoint };
  }, [attackVisual]);
  const soloMulliganButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-10px',
    right: '10px',
    padding: '0.5rem 1rem',
    background: '#eab308',
    color: 'black',
    fontWeight: 'bold',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    zIndex: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    border: '2px solid black'
  };
  const preparationStepStyle = (isDone: boolean): React.CSSProperties => ({
    padding: '0.35rem 0.7rem',
    borderRadius: '999px',
    border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255,255,255,0.12)'}`,
    background: isDone ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255,255,255,0.05)',
    color: isDone ? '#d1fae5' : '#cbd5e1',
    fontSize: '0.78rem',
    fontWeight: 'bold'
  });
  const preparationStatusCardStyle: React.CSSProperties = {
    flex: 1,
    minWidth: '220px',
    background: 'rgba(15, 23, 42, 0.55)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '0.7rem 0.8rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem'
  };
  const activeBoardSectionStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    width: '100%',
    alignItems: 'center',
    padding: '0.55rem 0.6rem',
    borderRadius: '16px',
    border: isActive ? '1px solid rgba(34, 211, 238, 0.38)' : '1px solid transparent',
    background: isActive ? 'linear-gradient(180deg, rgba(34, 211, 238, 0.08), rgba(15, 23, 42, 0.02))' : 'transparent',
    boxShadow: isActive ? '0 0 0 1px rgba(34, 211, 238, 0.12), 0 0 28px rgba(34, 211, 238, 0.14)' : 'none',
    transition: 'all 0.2s ease'
  });

  React.useEffect(() => {
    let isActive = true;

    fetch('/cards_detailed.json')
      .then(res => res.json())
      .then(data => {
        if (!isActive) return;
        setAllCards(data);
        setCardStatLookup(buildCardStatLookup(data));
        setCardDetailLookup(buildCardDetailLookup(data));
      })
      .catch(err => console.error('Could not load card stats', err));

    return () => {
      isActive = false;
    };
  }, []);

  const refreshSavedDeckOptions = React.useCallback(() => {
    if (allCards.length === 0) {
      setSavedDeckOptions([]);
      return;
    }

    const legalDecks = listSavedDecks()
      .map(deck => {
        const restored = restoreSavedDeckToSnapshot(deck, allCards);
        if (restored.missingCardIds.length > 0) return null;

        const sanitizedDeckState = sanitizeImportedDeckState(
          restored.snapshot.deckState,
          allCards,
          restored.snapshot.ruleConfig
        );
        const issues = getDeckValidationMessages(sanitizedDeckState, restored.snapshot.ruleConfig);
        if (issues.length > 0) return null;

        return {
          deck,
          deckData: {
            mainDeck: sanitizedDeckState.mainDeck,
            evolveDeck: sanitizedDeckState.evolveDeck,
            leaderCards: sanitizedDeckState.leaderCards,
            tokenDeck: sanitizedDeckState.tokenDeck,
          },
          summary: formatSavedDeckRuleSummary(deck),
          counts: formatSavedDeckCounts(deck),
        } satisfies LegalSavedDeckOption;
      })
      .filter((value): value is LegalSavedDeckOption => value !== null);

    setSavedDeckOptions(legalDecks);
  }, [allCards]);

  const openSavedDeckPicker = React.useCallback((targetRole: PlayerRole) => {
    if (allCards.length === 0) return;
    if (!canImportDeck(gameState, targetRole)) return;
    refreshSavedDeckOptions();
    setSavedDeckSearch('');
    setSavedDeckImportTargetRole(targetRole);
  }, [allCards.length, gameState, refreshSavedDeckOptions]);

  const closeSavedDeckPicker = React.useCallback(() => {
    setSavedDeckImportTargetRole(null);
    setSavedDeckSearch('');
  }, []);

  const handleSavedDeckImport = React.useCallback((option: LegalSavedDeckOption) => {
    if (!savedDeckImportTargetRole) return;
    if (!canImportDeck(gameState, savedDeckImportTargetRole)) return;

    importDeckData(option.deckData, savedDeckImportTargetRole);
    closeSavedDeckPicker();
  }, [closeSavedDeckPicker, gameState, importDeckData, savedDeckImportTargetRole]);

  const filteredSavedDeckOptions = React.useMemo(() => (
    savedDeckOptions.filter(option => option.deck.name.toLowerCase().includes(savedDeckSearch.trim().toLowerCase()))
  ), [savedDeckOptions, savedDeckSearch]);

  const isInspectableZone = React.useCallback((zone: string) => (
    zone.startsWith('hand-') ||
    zone.startsWith('field-') ||
    zone.startsWith('ex-') ||
    zone.startsWith('cemetery-') ||
    zone.startsWith('banish-') ||
    zone.startsWith('evolveDeck-') ||
    zone.startsWith('leader-')
  ), []);

  const getAttackTargetFromCard = React.useCallback((card: CardInstance): AttackTarget | null => {
    if (!attackSourceCard) return null;
    const opponentRole = attackSourceCard.owner === 'host' ? 'guest' : 'host';

    if (card.zone === `leader-${opponentRole}`) {
      return { type: 'leader', player: opponentRole };
    }

    if (card.zone.startsWith(`field-${opponentRole}`) && !card.isLeaderCard && cardStatLookup[card.cardId]) {
      return { type: 'card', cardId: card.id };
    }

    return null;
  }, [attackSourceCard, cardStatLookup]);

  const shouldDisableQuickActionsForAttackTarget = React.useCallback((card: CardInstance): boolean => {
    if (!attackSourceCard) return false;
    const opponentRole = attackSourceCard.owner === 'host' ? 'guest' : 'host';
    return card.zone.startsWith(`field-${opponentRole}`) && !card.isLeaderCard;
  }, [attackSourceCard]);

  const handleAttackTargetSelect = React.useCallback((target: AttackTarget) => {
    if (!attackSourceCard) return;
    handleDeclareAttack(attackSourceCard.id, target, attackSourceCard.owner);
    setAttackSourceCardId(null);
  }, [attackSourceCard, handleDeclareAttack]);

  const handleInspectCard = React.useCallback((card: CardInstance, anchor: CardInspectAnchor) => {
    const attackTarget = getAttackTargetFromCard(card);
    if (attackTarget) {
      handleAttackTargetSelect(attackTarget);
      return;
    }

    if (!isInspectableZone(card.zone) || card.isFlipped) return;

    if (selectedInspectorCardId === card.id) {
      setSelectedInspectorCardId(null);
      setSelectedInspectorAnchor(null);
      return;
    }

    setSelectedInspectorCardId(card.id);
    setSelectedInspectorAnchor(anchor);
  }, [getAttackTargetFromCard, handleAttackTargetSelect, isInspectableZone, selectedInspectorCardId]);

  React.useEffect(() => {
    if (!selectedInspectorCardId) return;

    const selectedCard = gameState.cards.find(card => card.id === selectedInspectorCardId);
    if (!selectedCard || !isInspectableZone(selectedCard.zone) || selectedCard.isFlipped) {
      setSelectedInspectorCardId(null);
      setSelectedInspectorAnchor(null);
    }
  }, [gameState.cards, isInspectableZone, selectedInspectorCardId]);

  React.useEffect(() => {
    if (!selectedInspectorCardId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedInspectorCardId(null);
        setSelectedInspectorAnchor(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedInspectorCardId]);

  React.useEffect(() => {
    if (!attackSourceCardId) return;

    const sourceCard = gameState.cards.find(card => card.id === attackSourceCardId);
    if (!sourceCard || sourceCard.isTapped || sourceCard.isFlipped || !sourceCard.zone.startsWith('field-') || gameState.gameStatus !== 'playing' || gameState.turnPlayer !== sourceCard.owner) {
      setAttackSourceCardId(null);
    }
  }, [attackSourceCardId, gameState.cards, gameState.gameStatus, gameState.turnPlayer]);

  React.useEffect(() => {
    if (!attackSourceCardId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAttackSourceCardId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [attackSourceCardId]);

  React.useEffect(() => {
    if (!attackSourceCardId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.game-card')) return;
      if (target.closest('button')) return;
      if (target.closest('[data-leader-zone]')) return;

      setAttackSourceCardId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [attackSourceCardId]);

  React.useEffect(() => {
    if (!selectedInspectorCardId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (inspectorRef.current?.contains(target)) return;
      if (target.closest('.game-card')) return;

      setSelectedInspectorCardId(null);
      setSelectedInspectorAnchor(null);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [selectedInspectorCardId]);

  const selectedInspectorCard = selectedInspectorCardId
    ? gameState.cards.find(card => card.id === selectedInspectorCardId) ?? null
    : null;
  const selectedInspectorDetail = selectedInspectorCard
    ? cardDetailLookup[selectedInspectorCard.cardId]
    : null;
  const inspectorPrimaryMeta = [
    selectedInspectorDetail?.className,
    selectedInspectorDetail?.title
  ].filter(Boolean).join(' / ');
  const inspectorSecondaryMeta = [
    selectedInspectorDetail?.type,
    selectedInspectorDetail?.subtype
  ].filter(Boolean).join(' / ');
  const inspectorStats = selectedInspectorDetail && selectedInspectorDetail.atk !== null && selectedInspectorDetail.hp !== null
    ? `${selectedInspectorDetail.atk} / ${selectedInspectorDetail.hp}`
    : null;
  const inspectorPopoverStyle = React.useMemo<React.CSSProperties | null>(() => {
    if (!selectedInspectorAnchor) return null;

    const width = 300;
    const height = 420;
    const gap = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = selectedInspectorAnchor.right + gap;
    if (left + width > viewportWidth - 16) {
      left = selectedInspectorAnchor.left - width - gap;
    }
    if (left < 16) {
      left = Math.max(16, viewportWidth - width - 16);
    }

    let top = selectedInspectorAnchor.top;
    if (top + height > viewportHeight - 16) {
      top = viewportHeight - height - 16;
    }
    if (top < 16) {
      top = 16;
    }

    return {
      position: 'fixed',
      top,
      left,
      width: `min(${width}px, calc(100vw - 32px))`,
      maxHeight: 'min(420px, calc(100vh - 32px))',
      overflowY: 'auto',
      zIndex: 900,
      background: 'rgba(3, 7, 18, 0.97)',
      border: '1px solid rgba(148, 163, 184, 0.28)',
      borderRadius: '16px',
      boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
      padding: '0.85rem'
    };
  }, [selectedInspectorAnchor]);

  const openTopDeckModal = (targetRole: PlayerRole) => {
    if (!canInteract) return;
    setTopDeckTargetRole(targetRole);
    setIsTopNInputOpen(true);
  };

  const openMulliganModal = (targetRole: PlayerRole) => {
    if (!canInteract) return;
    setMulliganTargetRole(targetRole);
    startMulligan();
  };

  const openTokenSpawnModal = (targetRole: PlayerRole) => {
    if (!canInteract) return;
    setTokenSpawnTargetRole(targetRole);
  };

  const handleTokenSpawn = (token: TokenOption) => {
    if (!tokenSpawnTargetRole) return;
    spawnToken(tokenSpawnTargetRole, token);
    setTokenSpawnTargetRole(null);
  };

  const handleStartAttack = React.useCallback((cardId: string) => {
    if (!canInteract) return;
    const card = gameState.cards.find(entry => entry.id === cardId);
    if (!card) return;
    if (card.isTapped || card.isFlipped || card.isLeaderCard) return;
    if (!cardStatLookup[card.cardId]) return;
    if (gameState.gameStatus !== 'playing') return;
    if (!card.zone.startsWith(`field-${card.owner}`)) return;
    if (gameState.turnPlayer !== card.owner) return;

    setSelectedInspectorCardId(null);
    setSelectedInspectorAnchor(null);
    setAttackSourceCardId(current => current === cardId ? null : cardId);
  }, [canInteract, cardStatLookup, gameState.cards, gameState.gameStatus, gameState.turnPlayer]);

  const openSearchZone = React.useCallback((id: string, title: string) => {
    if (!canInteract) return;
    setSearchZone({ id, title });
  }, [canInteract, setSearchZone]);

  const getAttackHighlightTone = React.useCallback((card: CardInstance): 'attack-source' | 'attack-target' | undefined => {
    if (!attackSourceCard) return undefined;
    if (card.id === attackSourceCard.id) return 'attack-source';

    const opponentRole = attackSourceCard.owner === 'host' ? 'guest' : 'host';
    if (card.zone === `leader-${opponentRole}`) return 'attack-target';
    if (card.zone.startsWith(`field-${opponentRole}`) && !card.isLeaderCard && cardStatLookup[card.cardId]) return 'attack-target';

    return undefined;
  }, [attackSourceCard, cardStatLookup]);

  const renderLeaderZone = (
    playerRole: PlayerRole,
    label: string,
    side: 'left' | 'right',
    extraOffset = 0
  ) => {
    const leaderZoneId = `leader-${playerRole}`;
    const leaderCards = getCards(leaderZoneId);
    const isAttackTargetLeader = attackSourceCard ? attackSourceCard.owner !== playerRole : false;

    return (
      <div
        data-leader-zone={leaderZoneId}
        style={{
          position: 'absolute',
          top: 0,
          ...(side === 'left'
            ? { right: `calc(100% + ${12 + extraOffset}px)` }
            : { left: `calc(100% + ${12 + extraOffset}px)` }),
          width: `${sideZoneWidth}px`,
        }}
      >
        <Zone
          id={leaderZoneId}
          label={`${label} Leader`}
          cards={leaderCards}
          cardDetailLookup={cardDetailLookup}
          layout="stack"
          getHighlightTone={getAttackHighlightTone}
          onInspectCard={handleInspectCard}
          viewerRole={viewerRole}
          containerStyle={{
            minWidth: `${sideZoneWidth}px`,
            minHeight: '150px',
            border: isAttackTargetLeader ? '2px solid rgba(250, 204, 21, 0.65)' : undefined,
            boxShadow: isAttackTargetLeader ? '0 0 18px rgba(250, 204, 21, 0.18)' : undefined
          }}
          isDebug={isDebug}
        />
        {leaderCards.length >= 2 && (
          <button
            onClick={() => openSearchZone(leaderZoneId, `${label} Leader`)}
            style={{
              width: '100%',
              marginTop: '4px',
              fontSize: '0.75rem',
              padding: '4px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-light)',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        )}
      </div>
    );
  };

  const renderZoneActions = (
    menuId: string,
    actions: Array<{ label: string; onClick: () => void; tone?: 'default' | 'accent' }>,
    direction: 'down' | 'up' = 'down'
  ) => (
    <div style={{ position: 'relative', zIndex: activeZoneActions === menuId ? 60 : 5 }}>
      <button
        onClick={() => setActiveZoneActions(current => current === menuId ? null : menuId)}
        style={{
          width: '100%',
          fontSize: '0.75rem',
          padding: '4px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-light)',
          color: 'white',
          borderRadius: '4px',
          cursor: 'pointer',
          position: 'relative',
          zIndex: 61
        }}
      >
        Actions
      </button>
      {activeZoneActions === menuId && (
        <div style={{
          position: 'absolute',
          top: direction === 'down' ? 'calc(100% + 4px)' : 'auto',
          bottom: direction === 'up' ? 'calc(100% + 4px)' : 'auto',
          left: 0,
          right: 0,
          zIndex: 62,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '6px',
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid var(--border-light)',
          borderRadius: '6px',
          boxShadow: '0 10px 20px rgba(0,0,0,0.35)'
        }}>
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                action.onClick();
                setActiveZoneActions(null);
              }}
              style={{
                fontSize: '0.75rem',
                padding: '5px 6px',
                background: action.tone === 'accent' ? '#3b82f6' : 'var(--bg-surface-elevated)',
                border: `1px solid ${action.tone === 'accent' ? '#2563eb' : 'var(--border-light)'}`,
                color: 'white',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderPlayerTracker = (playerRole: PlayerRole, label: string) => (
    (() => {
      const trackerAdjustButtonBaseStyle: React.CSSProperties = {
        minWidth: '28px',
        padding: '2px 8px',
        borderRadius: '4px',
        border: '1px solid',
        color: '#f8fafc',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.22)'
      };
      const trackerIncreaseButtonStyle: React.CSSProperties = {
        ...trackerAdjustButtonBaseStyle,
        background: '#1d4ed8',
        borderColor: '#60a5fa'
      };
      const trackerDecreaseButtonStyle: React.CSSProperties = {
        ...trackerAdjustButtonBaseStyle,
        background: '#7f1d1d',
        borderColor: '#fca5a5'
      };
      const trackerButtonRowStyle: React.CSSProperties = {
        display: 'flex',
        gap: '0.35rem'
      };

      return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem', padding: '0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>{label} Status</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>HP: {gameState[playerRole].hp}</span>
        <div style={trackerButtonRowStyle}>
          <button onClick={() => handleStatChange(playerRole, 'hp', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'hp', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>EP: {gameState[playerRole].ep}</span>
        <div style={trackerButtonRowStyle}>
          <button onClick={() => handleStatChange(playerRole, 'ep', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'ep', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#facc15', fontWeight: 'bold' }}>SEP: {gameState[playerRole].sep}</span>
        <div style={trackerButtonRowStyle}>
          <button onClick={() => handleStatChange(playerRole, 'sep', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'sep', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>Combo: {gameState[playerRole].combo}</span>
        <div style={trackerButtonRowStyle}>
          <button onClick={() => handleStatChange(playerRole, 'combo', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'combo', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.6rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <button onClick={() => handleStatChange(playerRole, 'maxPp', 1)} style={{ ...trackerIncreaseButtonStyle, width: '24px', height: '20px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '0.75rem' }}>+</button>
            <span style={{ fontSize: '0.6rem', color: '#93c5fd', fontWeight: 'bold' }}>MAX</span>
            <button onClick={() => handleStatChange(playerRole, 'maxPp', -1)} style={{ ...trackerDecreaseButtonStyle, width: '24px', height: '20px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '0.75rem' }}>-</button>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-2px' }}>Play Points</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px' }}>
              <span style={{ color: '#3b82f6', fontWeight: '900', fontSize: '1.75rem' }}>{gameState[playerRole].pp}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', fontWeight: 'bold' }}>/</span>
              <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold' }}>{gameState[playerRole].maxPp}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            <button onClick={() => handleStatChange(playerRole, 'pp', 1)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', color: '#3b82f6', fontWeight: 'bold' }}>∧</button>
            <button onClick={() => handleStatChange(playerRole, 'pp', -1)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', color: '#3b82f6', fontWeight: 'bold' }}>∨</button>
          </div>
        </div>
      </div>
    </div>
      );
    })()
  );

  const renderReadOnlyStatusPanel = (playerRole: PlayerRole, label: string) => (
    <div style={{
      width: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.55rem',
      padding: '0.9rem 1rem',
      background: 'rgba(0, 0, 0, 0.55)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid rgba(255,255,255,0.12)'
    }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>
        {label} Status
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>HP</span>
        <strong style={{ color: '#ef4444' }}>{gameState[playerRole].hp}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>PP</span>
        <strong><span style={{ color: '#3b82f6' }}>{gameState[playerRole].pp}</span> / {gameState[playerRole].maxPp}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>EP</span>
        <strong style={{ color: '#fbbf24' }}>{gameState[playerRole].ep}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>SEP</span>
        <strong style={{ color: '#facc15' }}>{gameState[playerRole].sep}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>Combo</span>
        <strong>{gameState[playerRole].combo}</strong>
      </div>
    </div>
  );

  const renderEndTurnButton = (playerRole: PlayerRole, label: string, background: string) => {
    const isCurrentTurn = gameState.turnPlayer === playerRole;
    const isEnabled = gameState.gameStatus === 'playing' && isCurrentTurn && canInteract;

    return (
      <button
        onClick={() => endTurn(playerRole)}
        disabled={!isEnabled}
        title={!isEnabled ? interactionBlockedTitle ?? 'Available during your turn only.' : undefined}
        className="glass-panel"
        style={{
          padding: '0.5rem',
          background,
          color: 'black',
          fontWeight: 'bold',
          opacity: isEnabled ? 1 : 0.5,
          cursor: isEnabled ? 'pointer' : 'not-allowed'
        }}
      >
        End {label} Turn
      </button>
    );
  };

  const renderCardInspector = () => {
    if (!selectedInspectorCard || !inspectorPopoverStyle) return null;

    const detail = selectedInspectorDetail;

    return (
      <div
        data-testid="card-inspector"
        ref={inspectorRef}
        style={inspectorPopoverStyle}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.35 }}>
              {detail?.name || selectedInspectorCard.name}
            </div>
            {inspectorPrimaryMeta && (
              <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: '0.18rem', lineHeight: 1.45 }}>
                {inspectorPrimaryMeta}
              </div>
            )}
            {inspectorSecondaryMeta && (
              <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.1rem', lineHeight: 1.45 }}>
                {inspectorSecondaryMeta}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setSelectedInspectorCardId(null);
              setSelectedInspectorAnchor(null);
            }}
            style={{
              border: '1px solid rgba(255,255,255,0.16)',
              background: 'rgba(15, 23, 42, 0.9)',
              color: 'white',
              borderRadius: '999px',
              cursor: 'pointer',
              padding: '0.18rem 0.55rem',
              fontSize: '0.74rem',
              fontWeight: 'bold'
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
          <CardArtwork
            image={detail?.image || selectedInspectorCard.image}
            alt={detail?.name || selectedInspectorCard.name}
            detail={detail ?? undefined}
            baseCardType={selectedInspectorCard.baseCardType}
            isLeaderCard={selectedInspectorCard.isLeaderCard}
            isTokenCard={selectedInspectorCard.isTokenCard}
            isEvolveCard={selectedInspectorCard.isEvolveCard}
            style={{
              width: '92px',
              height: '128px',
              objectFit: 'cover',
              borderRadius: '8px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.32)',
              flexShrink: 0
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '0.16rem 0.45rem', color: '#e2e8f0', fontSize: '0.76rem' }}>
              <span style={{ color: '#94a3b8' }}>ID</span>
              <span>{selectedInspectorCard.cardId}</span>
              <span style={{ color: '#94a3b8' }}>Cost</span>
              <span>{detail?.cost || '-'}</span>
              {inspectorStats && (
                <>
                  <span style={{ color: '#94a3b8' }}>Stats</span>
                  <span>{inspectorStats}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '0.75rem'
        }}>
          <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.45rem' }}>
            Ability Text
          </div>
          <div style={{
            whiteSpace: 'pre-wrap',
            color: '#e5e7eb',
            fontSize: '0.78rem',
            lineHeight: 1.65,
            background: 'rgba(15, 23, 42, 0.76)',
            borderRadius: '10px',
            padding: '0.75rem',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            {detail?.abilityText ? formatAbilityText(detail.abilityText) : 'このカードの詳細テキストは見つかりませんでした。'}
          </div>
        </div>
      </div>
    );
  };

  const renderSavedDeckPicker = () => {
    if (!savedDeckImportTargetRole) return null;

    const targetLabel = getPlayerLabel(savedDeckImportTargetRole, isSoloMode, 'My', 'Opponent', role);

    return (
      <div
        role="presentation"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeSavedDeckPicker();
          }
        }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.78)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 1000,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Load from My Decks"
          onClick={(event) => event.stopPropagation()}
          className="glass-panel"
          style={{
            width: 'min(720px, calc(100vw - 32px))',
            maxHeight: 'min(80vh, 760px)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>Load from My Decks</h3>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Legal saved decks for {targetLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={closeSavedDeckPicker}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={savedDeckSearch}
              onChange={(event) => setSavedDeckSearch(event.target.value)}
              placeholder="Search by deck name..."
              aria-label="Search saved decks"
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '0.65rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                outline: 'none',
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {filteredSavedDeckOptions.length} decks
            </span>
          </div>

          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {filteredSavedDeckOptions.length === 0 ? (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                No legal saved decks are available in this browser.
              </div>
            ) : (
              filteredSavedDeckOptions.map(option => (
                <div
                  key={option.deck.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.9rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{option.deck.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{option.summary}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>{option.counts}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSavedDeckImport(option)}
                    style={{
                      padding: '0.45rem 0.7rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Load
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DndContext onDragEnd={(event) => {
      if (!canInteract) return;
      handleDragEnd(event);
    }}>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflow: 'hidden' }}>

        {/* Header bar */}
        {/* Header bar tracking Phase / Turn */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>
              {isSoloMode ? 'Mode' : 'Room'}:{' '}
              <strong>{isSoloMode ? 'Solo Play Beta' : room}</strong>
            </span>
            {!isSoloMode && (
              <button
                type="button"
                onClick={handleCopyRoomId}
                style={{
                  padding: '0.28rem 0.55rem',
                  background: isRoomCopied ? 'rgba(16, 185, 129, 0.18)' : '#334155',
                  color: isRoomCopied ? '#d1fae5' : 'white',
                  border: `1px solid ${isRoomCopied ? 'rgba(16, 185, 129, 0.38)' : 'rgba(255,255,255,0.14)'}`,
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
                title="Copy room ID"
              >
                {isRoomCopied ? 'Copied' : 'Copy'}
              </button>
            )}
            {isSoloMode && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#111827',
                background: '#f59e0b',
                padding: '0.2rem 0.45rem',
                borderRadius: '999px'
              }}>
                BETA
              </span>
            )}
            {!isSoloMode && (
              <span
                style={{
                  padding: '0.22rem 0.55rem',
                  borderRadius: '999px',
                  border: `1px solid ${connectionBadgeTone.border}`,
                  background: connectionBadgeTone.background,
                  color: connectionBadgeTone.color,
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.02em'
                }}
              >
                {connectionBadgeTone.label}
              </span>
            )}
            <span style={{ color: status.includes('ready') ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}>{status}</span>
            {!isSoloMode && !isHost && connectionState !== 'connected' && (
              <button
                onClick={attemptReconnect}
                disabled={connectionState === 'connecting'}
                title={connectionState === 'connecting' ? 'Attempting to reconnect to host.' : 'Retry the connection now.'}
                style={{
                  padding: '0.3rem 0.6rem',
                  background: '#334155',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '4px',
                  cursor: connectionState === 'connecting' ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  opacity: connectionState === 'connecting' ? 0.6 : 1
                }}
              >
                {connectionState === 'reconnecting' ? 'Reconnect Now' : 'Reconnect'}
              </button>
            )}

            {gameState.gameStatus === 'preparing' ? (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => handleSetInitialTurnOrder()}
                  disabled={!isHost && !isSoloMode}
                  style={{ padding: '0.3rem 0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: (isHost || isSoloMode) ? 1 : 0.5 }}
                >
                  🪙 Decide Turn Order (Random)
                </button>
                <button
                  onClick={() => handleSetInitialTurnOrder(bottomRole)}
                  disabled={!isHost && !isSoloMode}
                  style={{ padding: '0.3rem 0.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: (isHost || isSoloMode) ? 1 : 0.5 }}
                >
                  {isSoloMode ? 'Player 1 1st' : 'Me 1st'}
                </button>
                <button
                  onClick={() => handleSetInitialTurnOrder(topRole)}
                  disabled={!isHost && !isSoloMode}
                  style={{ padding: '0.3rem 0.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: (isHost || isSoloMode) ? 1 : 0.5 }}
                >
                  {isSoloMode ? 'Player 2 1st' : 'Opp 1st'}
                </button>
                {!gameState[bottomRole].initialHandDrawn && (
                  <button
                    onClick={() => handleDrawInitialHand(bottomRole)}
                    style={{ padding: '0.3rem 0.6rem', background: '#3b82f6', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    🃏 Draw Hand (4)
                  </button>
                )}

                {gameState[bottomRole].initialHandDrawn && (
                  <button
                    onClick={() => handleToggleReady(bottomRole)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: gameState[bottomRole].isReady ? '#ef4444' : 'var(--vivid-green-cyan)',
                      color: gameState[bottomRole].isReady ? 'white' : 'black',
                      fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem'
                    }}
                  >
                    {gameState[bottomRole].isReady ? '✕ Cancel Ready' : `✅ ${isSoloMode ? 'Player 1 Ready' : 'Ready (準備完了)'}`}
                  </button>
                )}
                {isSoloMode && !gameState[topRole].initialHandDrawn && (
                  <button
                    onClick={() => handleDrawInitialHand(topRole)}
                    style={{ padding: '0.3rem 0.6rem', background: '#6366f1', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    🃏 Draw P2 Hand (4)
                  </button>
                )}
                {isSoloMode && gameState[topRole].initialHandDrawn && (
                  <button
                    onClick={() => handleToggleReady(topRole)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: gameState[topRole].isReady ? '#ef4444' : '#6366f1',
                      color: 'white',
                      fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem'
                    }}
                  >
                    {gameState[topRole].isReady ? '✕ Cancel P2 Ready' : '✅ Player 2 Ready'}
                  </button>
                )}
                <button
                  onClick={handleStartGame}
                  disabled={(!isHost && !isSoloMode) || !gameState.host.isReady || !gameState.guest.isReady}
                  style={{
                    padding: '0.3rem 0.6rem',
                    background: 'var(--vivid-green-cyan)',
                    color: 'black',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: ((isHost || isSoloMode) && gameState.host.isReady && gameState.guest.isReady) ? 'pointer' : 'not-allowed',
                    fontSize: '0.75rem',
                    opacity: ((isHost || isSoloMode) && gameState.host.isReady && gameState.guest.isReady) ? 1 : 0.5,
                    boxShadow: ((isHost || isSoloMode) && gameState.host.isReady && gameState.guest.isReady) ? '0 0 10px rgba(0, 208, 132, 0.4)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { if ((isHost || isSoloMode) && gameState.host.isReady && gameState.guest.isReady) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                  onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                >
                  ▶ START GAME
                </button>

                <div style={{ display: 'flex', gap: '0.8rem', marginLeft: '0.5rem', borderLeft: '1px solid var(--border-light)', paddingLeft: '0.8rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{isSoloMode ? 'PLAYER 1' : 'HOST'}</span>
                    <span style={{ color: gameState.host.isReady ? 'var(--vivid-green-cyan)' : '#ef4444', fontWeight: 'bold' }}>
                      {gameState.host.isReady ? 'READY' : (gameState.host.initialHandDrawn ? 'DECIDING' : 'WAITING')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{isSoloMode ? 'PLAYER 2' : 'GUEST'}</span>
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

            {canUndoTurn && (
              <button
                onClick={() => setShowUndoConfirm(true)}
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
            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              background: isBottomTurnActive
                ? 'linear-gradient(90deg, rgba(0, 208, 132, 0.18), rgba(17, 24, 39, 0.92))'
                : 'var(--bg-overlay)',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: isBottomTurnActive ? '1px solid rgba(0, 208, 132, 0.28)' : '1px solid transparent',
              boxShadow: isBottomTurnActive ? '0 0 18px rgba(0, 208, 132, 0.16)' : 'none',
              transition: 'all 0.2s ease'
            }}>
              <span style={{
                color: isSoloMode || gameState.turnPlayer === role ? 'var(--vivid-green-cyan)' : 'var(--vivid-red)',
                fontSize: isBottomTurnActive ? '1rem' : '0.92rem',
                fontWeight: 900,
                letterSpacing: '0.06em',
                textShadow: isBottomTurnActive ? '0 0 12px rgba(0, 208, 132, 0.35)' : 'none'
              }}>
                {isSoloMode
                  ? `${currentTurnLabel.toUpperCase()} TURN`
                  : gameState.turnPlayer === role ? "YOUR TURN" : "OPPONENT'S TURN"}
              </span>
              <span className="Garamond" style={{ fontSize: isBottomTurnActive ? '1.08rem' : undefined }}>
                TURN {gameState.turnCount}
              </span>
              <select
                value={gameState.phase}
                onChange={(e) => setPhase(e.target.value as 'Start' | 'Main' | 'End')}
                disabled={!isSoloMode && gameState.turnPlayer !== role}
                style={{
                  padding: '0.2rem',
                  borderRadius: '4px',
                  background: 'black',
                  color: 'white',
                  border: isBottomTurnActive ? '1px solid rgba(0, 208, 132, 0.35)' : undefined
                }}
              >
                <option value="Start">Start Phase</option>
                <option value="Main">Main Phase</option>
                <option value="End">End Phase</option>
              </select>
            </div>
          )}
        </div>

        {isGuestConnectionBlocked && (
          <div
            style={{
              marginTop: '-0.35rem',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.32)',
              color: '#fde68a',
              borderRadius: '10px',
              padding: '0.6rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            Reconnecting to host. Actions are temporarily locked until the latest state is synced.
          </div>
        )}

        {!isSoloMode && isHost && savedSessionCandidate && (
          <div
            style={{
              marginTop: '-0.35rem',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.32)',
              color: '#dbeafe',
              borderRadius: '10px',
              padding: '0.75rem 0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <strong style={{ fontSize: '0.88rem' }}>Previous host session found for this room.</strong>
              <span style={{ fontSize: '0.78rem', color: '#bfdbfe' }}>
                {savedSessionTimestamp ? `${savedSessionTimestamp} の状態から復帰できます。` : '直前の盤面を復帰できます。'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button
                onClick={discardSavedSession}
                style={{
                  padding: '0.45rem 0.9rem',
                  background: 'transparent',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Discard
              </button>
              <button
                onClick={resumeSavedSession}
                style={{
                  padding: '0.45rem 0.9rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: '1px solid #2563eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Resume Previous Session
              </button>
            </div>
          </div>
        )}

        {attackSourceCard && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              background: 'rgba(249, 115, 22, 0.14)',
              border: '1px solid rgba(249, 115, 22, 0.34)',
              borderRadius: '10px',
              padding: '0.7rem 0.9rem'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.18rem' }}>
              <div style={{ color: '#fdba74', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.04em' }}>
                ATTACK MODE
              </div>
              <div style={{ color: '#f8fafc', fontSize: '0.82rem' }}>
                Select an enemy follower or leader for <strong>{attackSourceCard.name}</strong>.
              </div>
            </div>
            <button
              onClick={() => setAttackSourceCardId(null)}
              style={{
                padding: '0.35rem 0.8rem',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255,255,255,0.16)',
                color: 'white',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {gameState.gameStatus === 'preparing' && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(59, 130, 246, 0.12))',
              border: '1px solid rgba(250, 204, 21, 0.22)',
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ color: '#fde68a', fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.03em' }}>
                Preparing Game
              </div>
              <div style={{ color: '#e5e7eb', fontSize: '0.84rem', lineHeight: 1.5 }}>
                Draw your opening four cards, finish mulligan and Ready, choose who goes first before starting, then press `START GAME`.
                Hand cards cannot be moved to other zones during preparation.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
              <span style={preparationStepStyle(gameState.host.initialHandDrawn && gameState.guest.initialHandDrawn)}>
                1. Draw Opening Hands
              </span>
              <span style={preparationStepStyle(gameState.host.isReady && gameState.guest.isReady)}>
                2. Mulligan and Ready
              </span>
              <span style={preparationStepStyle(gameState.host.isReady && gameState.guest.isReady)}>
                3. START GAME
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={preparationStatusCardStyle}>
                <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.82rem' }}>
                  {isSoloMode ? 'Player 1' : 'Host'}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.76rem' }}>
                  Opening Hand: {gameState.host.initialHandDrawn ? 'Done' : 'Pending'}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.76rem' }}>
                  Ready: {gameState.host.isReady ? 'Done' : 'Pending'}
                </div>
              </div>

              <div style={preparationStatusCardStyle}>
                <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.82rem' }}>
                  {isSoloMode ? 'Player 2' : 'Guest'}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.76rem' }}>
                  Opening Hand: {gameState.guest.initialHandDrawn ? 'Done' : 'Pending'}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.76rem' }}>
                  Ready: {gameState.guest.isReady ? 'Done' : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState.gameStatus === 'playing' && eventHistory.length > 0 && (
          <div
            style={{
              alignSelf: 'flex-end',
              width: 'min(320px, 100%)',
              background: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              borderRadius: '12px',
              padding: '0.75rem 0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem'
            }}
          >
            <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.03em' }}>
              Recent Events
            </div>
            {eventHistory.map((entry, index) => (
              <div
                key={`${entry}-${index}`}
                style={{
                  color: index === 0 ? '#f8fafc' : '#cbd5e1',
                  fontSize: '0.78rem',
                  opacity: index === 0 ? 1 : 0.8,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.35
                }}
              >
                {entry}
              </div>
            ))}
          </div>
        )}

        {/* Board Playmat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'url("https://shadowverse-evolve.com/wordpress/wp-content/themes/shadowverse-evolve-release_v0/assets/images/common/bg.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 'var(--radius-lg)', padding: '1rem', overflowY: 'auto', alignItems: 'center' }}>

          {/* OPPONENT BOARD */}
          <div style={{ ...activeBoardSectionStyle(isSoloMode && isTopTurnActive), opacity: 0.9 }}>
            {isSoloMode ? (
              <div style={{ display: 'grid', gridTemplateColumns: boardShellColumns, columnGap: '1rem', alignItems: 'flex-start', width: '100%', maxWidth: '1568px', justifyContent: 'center' }}>
                <div style={{ width: `${topPanelWidth}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.8)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{topLabel} Controls</div>
                  <label
                    className="glass-panel"
                    style={{
                      padding: '0.5rem',
                      background: 'var(--bg-surface-elevated)',
                      textAlign: 'center',
                      cursor: canImportTopDeck ? 'pointer' : 'not-allowed',
                      fontSize: '0.875rem',
                      opacity: canImportTopDeck ? 1 : 0.5
                    }}
                  >
                    Import {topLabel} Deck
                    <input
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={(event) => handleDeckUpload(event, topRole)}
                      disabled={!canImportTopDeck}
                    />
                  </label>
                  <button
                    type="button"
                    className="glass-panel"
                    onClick={() => openSavedDeckPicker(topRole)}
                    disabled={!canImportTopDeck || !canOpenSavedDeckPicker}
                    title={!canImportTopDeck || !canOpenSavedDeckPicker ? savedDeckPickerUnavailableTitle : undefined}
                    style={{
                      padding: '0.5rem',
                      background: canImportTopDeck && canOpenSavedDeckPicker
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))'
                        : 'rgba(34, 197, 94, 0.18)',
                      border: canImportTopDeck && canOpenSavedDeckPicker
                        ? '1px solid rgba(110, 231, 183, 0.45)'
                        : '1px solid var(--border-light)',
                      color: '#f8fafc',
                      fontWeight: 700,
                      textAlign: 'center',
                      cursor: canImportTopDeck && canOpenSavedDeckPicker ? 'pointer' : 'not-allowed',
                      fontSize: '0.875rem',
                      boxShadow: canImportTopDeck && canOpenSavedDeckPicker
                        ? '0 8px 18px rgba(5, 150, 105, 0.28)'
                        : 'none',
                      opacity: canImportTopDeck && canOpenSavedDeckPicker ? 1 : 0.5
                    }}
                  >
                    Load {topLabel} from My Decks
                  </button>
                  <button onClick={() => drawCard(topRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing' || !canInteract} title={gameState.gameStatus !== 'playing' || !canInteract ? interactionBlockedTitle ?? 'Available during the game only.' : undefined} style={{ padding: '0.5rem', background: '#6366f1', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' && canInteract ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' && canInteract ? 'pointer' : 'not-allowed' }}>
                    Draw {topLabel}
                  </button>
                  <button onClick={() => millCard(topRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing' || !canInteract} title={gameState.gameStatus !== 'playing' || !canInteract ? interactionBlockedTitle ?? 'Available during the game only.' : undefined} style={{ padding: '0.5rem', background: '#475569', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' && canInteract ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' && canInteract ? 'pointer' : 'not-allowed' }}>
                    Mill {topLabel}
                  </button>
                  {renderEndTurnButton(topRole, topLabel, '#fbbf24')}
                  <button onClick={() => openTokenSpawnModal(topRole)} className="glass-panel" style={{ padding: '0.5rem', background: '#7c3aed' }}>
                    Spawn {topLabel} Token
                  </button>
                  {renderPlayerTracker(topRole, topLabel)}
                </div>

                <div style={{ width: `${boardContentWidth}px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', alignItems: 'flex-start' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                    <div />
                    <div style={{ width: `${centerZoneWidth}px`, minHeight: '150px', position: 'relative' }}>
                      <Zone
                        id={`hand-${topRole}`}
                        label={`${topLabel} Hand`}
                        cards={getCards(`hand-${topRole}`)}
                        cardDetailLookup={cardDetailLookup}
                        hideCards={false}
                        layout="horizontal"
                        onInspectCard={handleInspectCard}
                        isProtected={true}
                        lockCards={isPreparingHandMoveLocked}
                        viewerRole={viewerRole}
                        onModifyCounter={handleModifyCounter}
                        onModifyGenericCounter={handleModifyGenericCounter}
                        onSendToBottom={handleSendToBottom}
                        onBanish={handleBanish}
                        onCemetery={handleSendToCemetery}
                        onPlayToField={(cardId) => handlePlayToField(cardId, topRole)}
                        containerStyle={{ minHeight: '150px' }}
                      />
                      {gameState.gameStatus === 'preparing' && gameState[topRole].initialHandDrawn && !gameState[topRole].mulliganUsed && (
                        <button onClick={() => openMulliganModal(topRole)} style={soloMulliganButtonStyle}>
                          🔄 Mulligan ({topLabel})
                        </button>
                      )}
                    </div>
                    <div />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`cemetery-${topRole}`} label={`${topLabel} Cemetery`} cards={getCards(`cemetery-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                      <button onClick={() => openSearchZone(`cemetery-${topRole}`, `${topLabel} Cemetery`)} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>Search</button>
                    </div>
                    <Zone
                      id={`ex-${topRole}`}
                      label={`${topLabel} EX Area`}
                      cards={getCards(`ex-${topRole}`)}
                      cardStatLookup={cardStatLookup}
                      cardDetailLookup={cardDetailLookup}
                      onInspectCard={handleInspectCard}
                      isProtected={false}
                      viewerRole={viewerRole}
                      onModifyCounter={handleModifyCounter}
                      onModifyGenericCounter={handleModifyGenericCounter}
                      onSendToBottom={handleSendToBottom}
                      onBanish={handleBanish}
                      onReturnEvolve={handleReturnEvolve}
                      onCemetery={handleSendToCemetery}
                      onPlayToField={(cardId) => handlePlayToField(cardId, topRole)}
                      containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '150px', flex: 'none', width: `${centerZoneWidth}px` }}
                      />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`banish-${topRole}`} label={`${topLabel} Banish`} cards={getCards(`banish-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                      <button onClick={() => openSearchZone(`banish-${topRole}`, `${topLabel} Banish`)} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>Search</button>
                    </div>
                  </div>

                  <div style={{ position: 'relative', width: `${boardContentWidth}px`, overflow: 'visible' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Zone id={`mainDeck-${topRole}`} label={`${topLabel} Main Deck`} cards={getCards(`mainDeck-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                        {renderZoneActions(`mainDeck-${topRole}`, [
                          { label: 'Search', onClick: () => openSearchZone(`mainDeck-${topRole}`, `${topLabel} Main Deck`) },
                          { label: 'Shuffle', onClick: () => handleShuffleDeck(topRole) },
                          { label: 'Look Top (N)', onClick: () => openTopDeckModal(topRole), tone: 'accent' }
                        ], 'up')}
                      </div>
                      <Zone
                        id={`field-${topRole}`}
                        label={`${topLabel} Field`}
                        cards={getCards(`field-${topRole}`)}
                        cardStatLookup={cardStatLookup}
                        cardDetailLookup={cardDetailLookup}
                        getHighlightTone={getAttackHighlightTone}
                        onInspectCard={handleInspectCard}
                        onAttack={isSoloMode && gameState.turnPlayer === topRole ? handleStartAttack : undefined}
                        onTap={toggleTap}
                        onModifyCounter={handleModifyCounter}
                        onModifyGenericCounter={handleModifyGenericCounter}
                        onSendToBottom={handleSendToBottom}
                        onBanish={handleBanish}
                        onReturnEvolve={handleReturnEvolve}
                        onCemetery={handleSendToCemetery}
                        onPlayToField={(cardId) => handlePlayToField(cardId, topRole)}
                        disableQuickActionsForCard={shouldDisableQuickActionsForAttackTarget}
                        viewerRole={viewerRole}
                        containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '160px', width: `${centerZoneWidth}px`, flex: 'none' }}
                        isDebug={isDebug}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Zone id={`evolveDeck-${topRole}`} label={`${topLabel} Evolve Deck`} cards={getCards(`evolveDeck-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                        <button onClick={() => openSearchZone(`evolveDeck-${topRole}`, `${topLabel} Evolve Deck`)} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>Search</button>
                      </div>
                    </div>
                    {renderLeaderZone(topRole, topLabel, 'right', 20)}
                  </div>
                </div>
                <div />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: boardShellColumns, columnGap: '1rem', alignItems: 'flex-start', width: '100%', maxWidth: '1568px', justifyContent: 'center' }}>
                <div style={{ width: `${topPanelWidth}px`, alignSelf: 'end' }}>
                  {renderReadOnlyStatusPanel(topRole, topLabel)}
                </div>

                <div style={{ width: `${boardContentWidth}px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', alignItems: 'flex-start' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                    <div />
                    <div style={{ width: `${centerZoneWidth}px`, display: 'flex', justifyContent: 'center' }}>
                      <Zone
                        id={`hand-${topRole}`}
                        label={`${topLabel} Hand`}
                        cards={getCards(`hand-${topRole}`)}
                        cardDetailLookup={cardDetailLookup}
                        hideCards={true}
                        layout="horizontal"
                        onInspectCard={handleInspectCard}
                        isProtected={true}
                        lockCards={isPreparingHandMoveLocked}
                        viewerRole={viewerRole}
                        containerStyle={{ minHeight: '150px' }}
                      />
                    </div>
                    <div />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`cemetery-${topRole}`} label={`${topLabel} Cemetery`} cards={getCards(`cemetery-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                      <button onClick={() => openSearchZone(`cemetery-${topRole}`, `${topLabel} Cemetery`)} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                    </div>
                    <Zone
                      id={`ex-${topRole}`}
                      label={`${topLabel} EX Area`}
                      cards={getCards(`ex-${topRole}`)}
                      cardStatLookup={cardStatLookup}
                      cardDetailLookup={cardDetailLookup}
                      onInspectCard={handleInspectCard}
                      isProtected={false}
                      viewerRole={viewerRole}
                      containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '150px', flex: 'none', width: `${centerZoneWidth}px` }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`banish-${topRole}`} label={`${topLabel} Banish`} cards={getCards(`banish-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                      <button onClick={() => openSearchZone(`banish-${topRole}`, `${topLabel} Banish`)} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                    </div>
                  </div>

                  <div style={{ position: 'relative', width: `${boardContentWidth}px`, overflow: 'visible' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Zone id={`mainDeck-${topRole}`} label={`${topLabel} Main Deck`} cards={getCards(`mainDeck-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                      </div>
                      <Zone
                        id={`field-${topRole}`}
                        label={`${topLabel} Field`}
                        cards={getCards(`field-${topRole}`)}
                        cardStatLookup={cardStatLookup}
                        cardDetailLookup={cardDetailLookup}
                        getHighlightTone={getAttackHighlightTone}
                        onInspectCard={handleInspectCard}
                        onTap={toggleTap}
                        onModifyCounter={handleModifyCounter}
                        onCemetery={handleSendToCemetery}
                        disableQuickActionsForCard={shouldDisableQuickActionsForAttackTarget}
                        viewerRole={viewerRole}
                        containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '160px', width: `${centerZoneWidth}px`, flex: 'none' }}
                        isDebug={isDebug}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Zone id={`evolveDeck-${topRole}`} label={`${topLabel} Evolve Deck`} cards={getCards(`evolveDeck-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                        <button onClick={() => openSearchZone(`evolveDeck-${topRole}`, `${topLabel} Evolve Deck`)} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                      </div>
                    </div>
                    {renderLeaderZone(topRole, topLabel, 'right', 20)}
                  </div>
                </div>
                <div />
              </div>
            )}
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />

          {/* MY BOARD */}
          <div style={activeBoardSectionStyle(isBottomTurnActive)}>
	            <div style={{ display: 'grid', gridTemplateColumns: boardShellColumns, columnGap: '1rem', alignItems: 'flex-start', width: '100%', maxWidth: '1568px', justifyContent: 'center' }}>
                <div />
	              <div style={{ width: `${boardContentWidth}px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', alignItems: 'flex-start' }}>
	                <div style={{ position: 'relative', width: `${boardContentWidth}px`, overflow: 'visible' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Zone id={`evolveDeck-${bottomRole}`} label={`${bottomLabel} Evolve Deck`} cards={getCards(`evolveDeck-${bottomRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                    <button onClick={() => openSearchZone(`evolveDeck-${bottomRole}`, `${bottomLabel} Evolve Deck`)} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>Search</button>
                  </div>
                  <Zone id={`field-${bottomRole}`} label={`${bottomLabel} Field`} cards={getCards(`field-${bottomRole}`)} cardStatLookup={cardStatLookup} cardDetailLookup={cardDetailLookup} getHighlightTone={getAttackHighlightTone} onInspectCard={handleInspectCard} onAttack={gameState.turnPlayer === bottomRole ? handleStartAttack : undefined} onTap={toggleTap} onModifyCounter={handleModifyCounter} onModifyGenericCounter={handleModifyGenericCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} disableQuickActionsForCard={shouldDisableQuickActionsForAttackTarget} viewerRole={viewerRole} containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '160px', width: `${centerZoneWidth}px`, flex: 'none' }} isDebug={isDebug} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Zone id={`mainDeck-${bottomRole}`} label={`${bottomLabel} Main Deck`} cards={getCards(`mainDeck-${bottomRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                    {renderZoneActions(`mainDeck-${bottomRole}`, [
                      { label: 'Search', onClick: () => openSearchZone(`mainDeck-${bottomRole}`, `${bottomLabel} Main Deck`) },
                      { label: 'Shuffle', onClick: () => handleShuffleDeck(bottomRole) },
                      { label: 'Look Top (N)', onClick: () => openTopDeckModal(bottomRole), tone: 'accent' }
                    ])}
                  </div>
                  </div>
                  {renderLeaderZone(bottomRole, bottomLabel, 'left')}
                </div>

	                <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Zone id={`banish-${bottomRole}`} label={`${bottomLabel} Banish`} cards={getCards(`banish-${bottomRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onCemetery={handleSendToCemetery} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                    <button onClick={() => openSearchZone(`banish-${bottomRole}`, `${bottomLabel} Banish`)} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>Search</button>
                  </div>
	                  <Zone id={`ex-${bottomRole}`} label={`${bottomLabel} EX Area`} cards={getCards(`ex-${bottomRole}`)} cardStatLookup={cardStatLookup} cardDetailLookup={cardDetailLookup} onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onModifyGenericCounter={handleModifyGenericCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} viewerRole={viewerRole} containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '150px', flex: 'none', width: `${centerZoneWidth}px` }} isDebug={isDebug} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Zone id={`cemetery-${bottomRole}`} label={`${bottomLabel} Cemetery`} cards={getCards(`cemetery-${bottomRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                    <button onClick={() => openSearchZone(`cemetery-${bottomRole}`, `${bottomLabel} Cemetery`)} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>Search</button>
                  </div>
	                </div>

	                <div style={{ width: `${boardContentWidth}px`, minHeight: '160px', position: 'relative' }}>
                    <Zone id={`hand-${bottomRole}`} label={`${bottomLabel} Hand`} cards={getCards(`hand-${bottomRole}`)} cardDetailLookup={cardDetailLookup} onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} isProtected={true} lockCards={isPreparingHandMoveLocked} viewerRole={viewerRole} containerStyle={{ minHeight: '160px' }} isDebug={isDebug} />

                    {gameState.gameStatus === 'preparing' && gameState[bottomRole].initialHandDrawn && !gameState[bottomRole].mulliganUsed && (
                      <button
                        onClick={() => openMulliganModal(bottomRole)}
                        style={isSoloMode ? soloMulliganButtonStyle : {
                          position: 'absolute', top: '-10px', right: '10px',
                          padding: '0.5rem 1rem', background: '#eab308', color: 'black',
                          fontWeight: 'bold', borderRadius: '4px',
                          cursor: 'pointer', fontSize: '0.875rem', zIndex: 10,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          border: '2px solid black'
                        }}
                      >
                        {isSoloMode ? `🔄 Mulligan (${bottomLabel})` : '🔄 Mulligan (マリガンする)'}
                      </button>
                    )}
                </div>
              </div>

              <div style={{ width: `${sidePanelWidth}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.8)', padding: '1rem', borderRadius: 'var(--radius-md)', marginLeft: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{bottomLabel} Controls</div>
                {isSoloMode ? (
                  <>
                    <label
                      className="glass-panel"
                      style={{
                        padding: '0.5rem',
                        background: 'var(--bg-surface-elevated)',
                        textAlign: 'center',
                        cursor: canImportBottomDeck ? 'pointer' : 'not-allowed',
                        fontSize: '0.875rem',
                        opacity: canImportBottomDeck ? 1 : 0.5
                      }}
                    >
                      Import {bottomLabel} Deck
                      <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={(event) => handleDeckUpload(event, bottomRole)}
                        disabled={!canImportBottomDeck}
                      />
                    </label>
                    <button
                      type="button"
                      className="glass-panel"
                      onClick={() => openSavedDeckPicker(bottomRole)}
                      disabled={!canImportBottomDeck || !canOpenSavedDeckPicker}
                      title={!canImportBottomDeck || !canOpenSavedDeckPicker ? savedDeckPickerUnavailableTitle : undefined}
                      style={{
                        padding: '0.5rem',
                        background: canImportBottomDeck && canOpenSavedDeckPicker
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))'
                          : 'rgba(34, 197, 94, 0.18)',
                        border: canImportBottomDeck && canOpenSavedDeckPicker
                          ? '1px solid rgba(110, 231, 183, 0.45)'
                          : '1px solid var(--border-light)',
                        color: '#f8fafc',
                        fontWeight: 700,
                        textAlign: 'center',
                        cursor: canImportBottomDeck && canOpenSavedDeckPicker ? 'pointer' : 'not-allowed',
                        fontSize: '0.875rem',
                        boxShadow: canImportBottomDeck && canOpenSavedDeckPicker
                          ? '0 8px 18px rgba(5, 150, 105, 0.28)'
                          : 'none',
                        opacity: canImportBottomDeck && canOpenSavedDeckPicker ? 1 : 0.5
                      }}
                    >
                      Load {bottomLabel} from My Decks
                    </button>
                  </>
                ) : (
                  <>
                    <label
                      className="glass-panel"
                      style={{
                        padding: '0.5rem',
                        background: 'var(--bg-surface-elevated)',
                        textAlign: 'center',
                        cursor: canImportBottomDeck ? 'pointer' : 'not-allowed',
                        fontSize: '0.875rem',
                        opacity: canImportBottomDeck ? 1 : 0.5
                      }}
                    >
                      Import Deck (.json)
                      <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={(event) => handleDeckUpload(event, bottomRole)}
                        disabled={!canImportBottomDeck}
                      />
                    </label>
                    <button
                      type="button"
                      className="glass-panel"
                      onClick={() => openSavedDeckPicker(bottomRole)}
                      disabled={!canImportBottomDeck || !canOpenSavedDeckPicker}
                      title={!canImportBottomDeck || !canOpenSavedDeckPicker ? savedDeckPickerUnavailableTitle : undefined}
                      style={{
                        padding: '0.5rem',
                        background: canImportBottomDeck && canOpenSavedDeckPicker
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))'
                          : 'rgba(34, 197, 94, 0.18)',
                        border: canImportBottomDeck && canOpenSavedDeckPicker
                          ? '1px solid rgba(110, 231, 183, 0.45)'
                          : '1px solid var(--border-light)',
                        color: '#f8fafc',
                        fontWeight: 700,
                        textAlign: 'center',
                        cursor: canImportBottomDeck && canOpenSavedDeckPicker ? 'pointer' : 'not-allowed',
                        fontSize: '0.875rem',
                        boxShadow: canImportBottomDeck && canOpenSavedDeckPicker
                          ? '0 8px 18px rgba(5, 150, 105, 0.28)'
                          : 'none',
                        opacity: canImportBottomDeck && canOpenSavedDeckPicker ? 1 : 0.5
                      }}
                    >
                      Load from My Decks
                    </button>
                  </>
                )}
                <button onClick={() => drawCard(bottomRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing' || !canInteract} title={gameState.gameStatus !== 'playing' || !canInteract ? interactionBlockedTitle ?? 'Available during the game only.' : undefined} style={{ padding: '0.5rem', background: 'var(--accent-primary)', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' && canInteract ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' && canInteract ? 'pointer' : 'not-allowed' }}>
                  Draw {bottomLabel}
                </button>
                <button onClick={() => millCard(bottomRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing' || !canInteract} title={gameState.gameStatus !== 'playing' || !canInteract ? interactionBlockedTitle ?? 'Available during the game only.' : undefined} style={{ padding: '0.5rem', background: '#475569', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' && canInteract ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' && canInteract ? 'pointer' : 'not-allowed' }}>
                  Mill {bottomLabel}
                </button>
                {isSoloMode ? (
                  renderEndTurnButton(bottomRole, bottomLabel, '#f59e0b')
                ) : (gameState.turnPlayer === role && gameState.gameStatus === 'playing') && (
                  <button onClick={() => endTurn()} className="glass-panel" style={{ padding: '0.5rem', background: '#f59e0b', color: 'black', fontWeight: 'bold' }}>
                    END TURN
                  </button>
                )}
                <button onClick={() => openTokenSpawnModal(bottomRole)} className="glass-panel" style={{ padding: '0.5rem', background: 'var(--accent-secondary)' }}>
                  Spawn {bottomLabel} Token
                </button>
                {canResetGame && (
                  <button onClick={() => setShowResetConfirm(true)} className="glass-panel" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontWeight: 'bold' }}>
                    Reset Game
                  </button>
                )}
                {renderPlayerTracker(bottomRole, bottomLabel)}
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
              Select cards in the order you want to put them on the <strong>bottom</strong> of your deck.<br />
              (The 4th selection will be at the absolute bottom.)
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {gameState.cards.filter(c => c.zone === `hand-${mulliganTargetRole}`).map(card => {
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
                    <CardArtwork
                      image={card.image}
                      alt={card.name}
                      detail={cardDetailLookup[card.cardId]}
                      baseCardType={card.baseCardType}
                      isLeaderCard={card.isLeaderCard}
                      isTokenCard={card.isTokenCard}
                      isEvolveCard={card.isEvolveCard}
                      style={{ width: '120px', height: '168px', borderRadius: '4px' }}
                      draggable={false}
                    />
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
                onClick={() => executeMulligan(mulliganTargetRole)}
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
        allowHandExtraction={gameState.gameStatus === 'playing'}
        readOnly={searchZone?.id.startsWith('leader-') ?? false}
        cardDetailLookup={cardDetailLookup}
        cards={searchZone ? (
          (searchZone.id.startsWith('evolveDeck-') && !isSoloMode && !searchZone.id.endsWith(role)
            ? getCards(searchZone.id).filter(c => !c.isFlipped)
            : getCards(searchZone.id)
          ).slice()
        ) : []}
        onExtractCard={(cardId, destination, revealToOpponent) => handleExtractCard(cardId, destination, searchTargetRole, revealToOpponent)}
        onToggleFlip={(cardId) => handleFlipCard(cardId, searchTargetRole)}
        viewerRole={searchTargetRole}
        targetRole={searchTargetRole}
      />

      <TopDeckModal
        isOpen={topDeckCards.length > 0}
        cards={topDeckCards}
        cardDetailLookup={cardDetailLookup}
        onConfirm={(results) => handleResolveTopDeck(results, topDeckTargetRole)}
        onCancel={() => setTopDeckCards([])}
      />

      {tokenSpawnTargetRole && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4500 }}>
          <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', width: 'min(920px, 92vw)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'white', textAlign: 'center' }}>Select Token</h3>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {getTokenOptions(tokenSpawnTargetRole).map((token) => (
                <button
                  key={`${token.cardId}-${token.name}`}
                  onClick={() => handleTokenSpawn(token)}
                  style={{
                    width: '140px',
                    background: 'transparent',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    padding: '0.6rem',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    alignItems: 'center'
                  }}
                >
                  <CardArtwork
                    image={token.image}
                    alt={token.name}
                    detail={cardDetailLookup[token.cardId]}
                    baseCardType={token.baseCardType}
                    isTokenCard={true}
                    style={{ width: '100px', height: '140px', borderRadius: '6px' }}
                    draggable={false}
                  />
                  <span style={{ fontSize: '0.78rem', lineHeight: 1.35, textAlign: 'center' }}>{token.name}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setTokenSpawnTargetRole(null)}
                style={{ padding: '0.5rem 1.5rem', background: '#333', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isTopNInputOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem', color: 'white' }}>How many cards to look at?</h3>
            <input 
              type="number" 
              value={topNValue} 
              onChange={(e) => setTopNValue(Number(e.target.value))} 
              min="1" max="50"
              style={{ padding: '0.5rem', borderRadius: '4px', background: 'black', color: 'white', border: '1px solid #444', fontSize: '1.25rem', textAlign: 'center', width: '80px', marginBottom: '1.5rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setIsTopNInputOpen(false)} style={{ padding: '0.5rem 1.5rem', background: '#333', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none' }}>Cancel</button>
              <button onClick={() => {
                handleLookAtTop(topNValue, topDeckTargetRole);
                setIsTopNInputOpen(false);
              }} style={{ padding: '0.5rem 1.5rem', background: 'var(--accent-primary)', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>Look</button>
            </div>
          </div>
        </div>
      )}

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

      {cardPlayMessage && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.96)',
          color: '#eff6ff',
          padding: '0.8rem 1.2rem',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.45)',
          fontSize: '0.98rem',
          fontWeight: 'bold',
          zIndex: 1975,
          boxShadow: '0 12px 28px rgba(0,0,0,0.32)',
          pointerEvents: 'none',
          textAlign: 'center',
          maxWidth: 'min(90vw, 560px)'
        }}>
          {cardPlayMessage}
        </div>
      )}

      {attackMessage && (
        <div style={{
          position: 'fixed',
          top: '27%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fdba74',
          padding: '1rem 1.7rem',
          borderRadius: '14px',
          border: '2px solid rgba(249, 115, 22, 0.55)',
          fontSize: '1rem',
          fontWeight: 'bold',
          zIndex: 1950,
          boxShadow: '0 0 24px rgba(249,115,22,0.24)',
          pointerEvents: 'none',
          textAlign: 'center'
        }}>
          {attackMessage}
        </div>
      )}

      {attackLine && (
        <svg
          width="100vw"
          height="100vh"
          viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1940,
            overflow: 'visible'
          }}
        >
          <defs>
            <marker
              id="attack-arrowhead"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
            >
              <path d="M0,0 L12,6 L0,12 z" fill="#fb923c" />
            </marker>
          </defs>
          <line
            x1={attackLine.sourcePoint.x}
            y1={attackLine.sourcePoint.y}
            x2={attackLine.targetPoint.x}
            y2={attackLine.targetPoint.y}
            stroke="#fdba74"
            strokeWidth="4"
            strokeLinecap="round"
            markerEnd="url(#attack-arrowhead)"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(249,115,22,0.55))'
            }}
          />
        </svg>
      )}

      {revealedCardsOverlay && (
        <div style={{
          position: 'fixed',
          top: '18%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(3, 7, 18, 0.96)',
          border: '2px solid #14b8a6',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          zIndex: 2100,
          boxShadow: '0 0 30px rgba(20,184,166,0.25)',
          minWidth: '320px',
          maxWidth: '90vw'
        }}>
          <div style={{ color: '#99f6e4', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.9rem', textAlign: 'center' }}>
            {revealedCardsOverlay.title}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {revealedCardsOverlay.cards.map((card) => (
              <div key={`${card.cardId}-${card.name}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', maxWidth: '120px' }}>
                <CardArtwork
                  image={card.image}
                  alt={card.name}
                  detail={cardDetailLookup[card.cardId]}
                  style={{ width: '90px', height: '126px', borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.45)' }}
                  draggable={false}
                />
                <div style={{ color: 'white', fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.3 }}>
                  {card.name}
                </div>
              </div>
            ))}
          </div>
          {revealedCardsOverlay.summaryLines && revealedCardsOverlay.summaryLines.length > 0 && (
            <div style={{
              marginTop: '1rem',
              paddingTop: '0.9rem',
              borderTop: '1px solid rgba(153, 246, 228, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              alignItems: 'center'
            }}>
              {revealedCardsOverlay.summaryLines.map((line) => (
                <div
                  key={line}
                  style={{
                    color: '#e2e8f0',
                    fontSize: '0.82rem',
                    lineHeight: 1.35,
                    textAlign: 'center',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showResetConfirm && canResetGame && (
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

      {showUndoConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '2rem', borderRadius: 'var(--radius-md)', maxWidth: '420px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#f9a8d4' }}>Undo Last End Turn</h3>
            <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              相手のターン開始後の操作も取り消します。続けますか？
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowUndoConfirm(false)}
                style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', color: 'white', cursor: 'pointer', borderRadius: '4px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowUndoConfirm(false);
                  handleUndoTurn();
                }}
                style={{ padding: '0.5rem 1rem', background: '#ec4899', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
              >
                Yes, Undo
              </button>
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

      {renderSavedDeckPicker()}
      {renderCardInspector()}
    </DndContext>
  );
};

export default GameBoard;
