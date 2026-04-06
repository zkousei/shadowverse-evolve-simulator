import React from 'react';
import { DndContext } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import Zone from '../components/Zone';
import type { CardInspectAnchor, CardInstance } from '../components/Card';
import CardSearchModal from '../components/CardSearchModal';
import GameBoardAttackModeBanner from '../components/GameBoardAttackModeBanner';
import GameBoardCardInspector from '../components/GameBoardCardInspector';
import GameBoardDialogsHost from '../components/GameBoardDialogsHost';
import GameBoardGlobalOverlays from '../components/GameBoardGlobalOverlays';
import GameBoardLeaderZone from '../components/GameBoardLeaderZone';
import GameBoardMulliganDialog from '../components/GameBoardMulliganDialog';
import GameBoardMulliganButton from '../components/GameBoardMulliganButton';
import GameBoardPreparationControls from '../components/GameBoardPreparationControls';
import GameBoardPreparationPanel from '../components/GameBoardPreparationPanel';
import GameBoardPlayingControls from '../components/GameBoardPlayingControls';
import GameBoardPlayerTracker from '../components/GameBoardPlayerTracker';
import GameBoardRecentEventsPanel from '../components/GameBoardRecentEventsPanel';
import GameBoardReadOnlyStatusPanel from '../components/GameBoardReadOnlyStatusPanel';
import GameBoardEndTurnButton from '../components/GameBoardEndTurnButton';
import GameBoardReconnectAlert from '../components/GameBoardReconnectAlert';
import GameBoardResetDialog from '../components/GameBoardResetDialog';
import GameBoardRoomStatus from '../components/GameBoardRoomStatus';
import GameBoardSearchableZoneStack from '../components/GameBoardSearchableZoneStack';
import GameBoardSavedSessionPrompt from '../components/GameBoardSavedSessionPrompt';
import GameBoardTopNDialog from '../components/GameBoardTopNDialog';
import GameBoardTokenSpawnDialog from '../components/GameBoardTokenSpawnDialog';
import GameBoardTurnPanel from '../components/GameBoardTurnPanel';
import GameBoardUndoTurnDialog from '../components/GameBoardUndoTurnDialog';
import GameBoardZoneActionsMenu from '../components/GameBoardZoneActionsMenu';
import TopDeckModal from '../components/TopDeckModal';
import { useGameBoardLogic } from '../hooks/useGameBoardLogic';
import { canImportDeck, canUndoLastTurn, isHandCardMovementLocked } from '../utils/gameRules';
import { getPlayerLabel, getZoneOwner } from '../utils/soloMode';
import type { PlayerRole } from '../types/game';
import type { AttackTarget } from '../types/sync';
import { buildCardDetailPresentation } from '../utils/cardDetails';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import {
  filterSavedDeckOptionsBySearch,
  formatSavedSessionTimestamp,
  getConnectionBadgeTone,
  getInspectorPopoverStyle,
  getInteractionBlockedTitle,
} from '../utils/gameBoardPresentation';
import {
  shouldDismissAttackModeOnPointerDown,
  shouldDismissInspectorOnPointerDown,
  shouldDismissModalOnBackdropClick,
  shouldDismissOnEscapeKey,
} from '../utils/gameBoardDismissals';
import { buildLegalSavedDeckOptions, type LegalSavedDeckOption } from '../utils/gameBoardSavedDecks';
import {
  buildTokenSpawnSelections,
  getTotalTokenSpawnCount,
  updateTokenSpawnCounts,
} from '../utils/gameBoardTokens';
import {
  canInspectCard,
  canStartAttack,
  getAttackHighlightTone as resolveAttackHighlightTone,
  getAttackTargetFromCard as resolveAttackTargetFromCard,
  shouldClearAttackSource,
  shouldClearInspectorSelection,
  shouldDisableQuickActionsForAttackTarget as shouldDisableQuickActionsForAttackTargetCard,
} from '../utils/gameBoardCombat';
import { listSavedDecks } from '../utils/deckStorage';
import { loadCardCatalog } from '../utils/cardCatalog';

const GameBoard: React.FC = () => {
  const { t } = useTranslation();
  const {
    room, isSoloMode, isHost, role, status, connectionState, canInteract, attemptReconnect, gameState, savedSessionCandidate, resumeSavedSession, discardSavedSession, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage, cardPlayMessage, attackMessage, eventHistory, attackVisual, revealedCardsOverlay,
    cardStatLookup, cardDetailLookup,
    isRollingDice, diceValue, mulliganOrder, isMulliganModalOpen, setIsMulliganModalOpen,
    handleStatChange, setPhase, endTurn, handleUndoTurn, handleSetInitialTurnOrder,
    handlePureCoinFlip, handleRollDice, handleStartGame, handleToggleReady,
    handleDrawInitialHand, startMulligan, handleMulliganOrderSelect, executeMulligan,
    drawCard, handleExtractCard, confirmResetGame, handleDeckUpload, importDeckData, spawnTokens,
    handleModifyCounter, handleModifyGenericCounter, handleDragEnd, toggleTap, handleFlipCard, handleSendToBottom,
    handleBanish, handlePlayToField, handleSendToCemetery, handleReturnEvolve, handleShuffleDeck, handleDeclareAttack,
    handleSetRevealHandsMode,
    evolveAutoAttachSelection, confirmEvolveAutoAttachSelection, cancelEvolveAutoAttachSelection,
    getCards, getTokenOptions, millCard, moveTopCardToEx,
    topDeckCards, handleLookAtTop, handleResolveTopDeck, setTopDeckCards,
    handleUndoCardMove, hasUndoableMove, canUndoTurn,
    isDebug
  } = useGameBoardLogic();

  const [isTopNInputOpen, setIsTopNInputOpen] = React.useState(false);
  const [topNValue, setTopNValue] = React.useState(3);
  const [tokenSpawnTargetRole, setTokenSpawnTargetRole] = React.useState<PlayerRole | null>(null);
  const [tokenSpawnCounts, setTokenSpawnCounts] = React.useState<Record<string, number>>({});
  const [tokenSpawnDestination, setTokenSpawnDestination] = React.useState<'ex' | 'field'>('ex');
  const [showUndoConfirm, setShowUndoConfirm] = React.useState(false);
  const [topDeckTargetRole, setTopDeckTargetRole] = React.useState<PlayerRole>('host');
  const [mulliganTargetRole, setMulliganTargetRole] = React.useState<PlayerRole>('host');
  const [activeZoneActions, setActiveZoneActions] = React.useState<string | null>(null);
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
  // Solo mode renders both players for a single viewer. The top board is the
  // "other side" of the same local match, not a protected remote opponent.
  const viewerRole = isSoloMode ? 'all' : role;
  const isPreparingHandMoveLocked = isHandCardMovementLocked(gameState);
  const topRole = (isSoloMode ? 'guest' : role === 'host' ? 'guest' : 'host') as PlayerRole;
  const bottomRole = (isSoloMode ? 'host' : role) as PlayerRole;
  const canImportTopDeck = canImportDeck(gameState, topRole);
  const canImportBottomDeck = canImportDeck(gameState, bottomRole);
  const savedDeckPickerUnavailableTitle = !canOpenSavedDeckPicker
    ? t('gameBoard.status.loadingCatalog')
    : t('gameBoard.status.availableBeforeStart');
  const topLabel = getPlayerLabel(
    topRole,
    isSoloMode,
    t('common.labels.self'),
    t('common.labels.opponent'),
    role,
    t('common.labels.player1'),
    t('common.labels.player2')
  );
  const bottomLabel = getPlayerLabel(
    bottomRole,
    isSoloMode,
    t('common.labels.self'),
    t('common.labels.opponent'),
    role,
    t('common.labels.player1'),
    t('common.labels.player2')
  );
  const searchTargetRole = searchZone ? getZoneOwner(searchZone.id) ?? role : role;
  const currentTurnLabel = gameState.turnPlayer === bottomRole ? bottomLabel : topLabel;
  const canShowUndoTurn = canUndoLastTurn(
    gameState,
    canUndoTurn,
    role,
    isSoloMode
  );
  // P2P can optionally hide the opponent hand, but solo always shows both
  // hands to the same player.
  const shouldHideTopHand = !isSoloMode && !gameState.revealHandsMode;
  const isBottomTurnActive = gameState.gameStatus === 'playing' && gameState.turnPlayer === bottomRole;
  const isTopTurnActive = gameState.gameStatus === 'playing' && gameState.turnPlayer === topRole;
  const canResetGame = isSoloMode || isHost;
  const isGuestConnectionBlocked = !isSoloMode && !isHost && !canInteract;
  const connectionBadgeTone = getConnectionBadgeTone(connectionState, t);
  const interactionBlockedTitle = getInteractionBlockedTitle(isGuestConnectionBlocked, connectionState, t);
  const savedSessionTimestamp = React.useMemo(() => {
    if (!savedSessionCandidate) return null;

    return formatSavedSessionTimestamp(savedSessionCandidate.savedAt);
  }, [savedSessionCandidate]);
  const tokenSpawnOptions = React.useMemo(
    () => (tokenSpawnTargetRole ? getTokenOptions(tokenSpawnTargetRole) : []),
    [getTokenOptions, tokenSpawnTargetRole]
  );
  const totalTokenSpawnCount = React.useMemo(
    () => getTotalTokenSpawnCount(tokenSpawnOptions, tokenSpawnCounts),
    [tokenSpawnCounts, tokenSpawnOptions]
  );
  const sidePanelWidth = 220;
  const topPanelWidth = 188;
  const sideZoneWidth = 140;
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
    loadCardCatalog()
      .then(data => {
        setAllCards(data);
      })
      .catch(err => console.error('Could not load card details', err));
  }, []);

  const refreshSavedDeckOptions = React.useCallback(() => {
    if (allCards.length === 0) {
      setSavedDeckOptions([]);
      return;
    }

    setSavedDeckOptions(buildLegalSavedDeckOptions(listSavedDecks(), allCards, t));
  }, [allCards, t]);

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

  const filteredSavedDeckOptions = React.useMemo(
    () => filterSavedDeckOptionsBySearch(savedDeckOptions, savedDeckSearch),
    [savedDeckOptions, savedDeckSearch]
  );

  const getAttackTargetFromCard = React.useCallback((card: CardInstance): AttackTarget | null => {
    return resolveAttackTargetFromCard(attackSourceCard, card, cardStatLookup);
  }, [attackSourceCard, cardStatLookup]);

  const shouldDisableQuickActionsForAttackTarget = React.useCallback((card: CardInstance): boolean => {
    return shouldDisableQuickActionsForAttackTargetCard(attackSourceCard, card);
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

    if (!canInspectCard(card)) return;

    if (selectedInspectorCardId === card.id) {
      setSelectedInspectorCardId(null);
      setSelectedInspectorAnchor(null);
      return;
    }

    setSelectedInspectorCardId(card.id);
    setSelectedInspectorAnchor(anchor);
  }, [getAttackTargetFromCard, handleAttackTargetSelect, selectedInspectorCardId]);

  React.useEffect(() => {
    if (!selectedInspectorCardId) return;

    const selectedCard = gameState.cards.find(card => card.id === selectedInspectorCardId);
    if (shouldClearInspectorSelection(selectedCard)) {
      setSelectedInspectorCardId(null);
      setSelectedInspectorAnchor(null);
    }
  }, [gameState.cards, selectedInspectorCardId]);

  React.useEffect(() => {
    if (!selectedInspectorCardId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldDismissOnEscapeKey(event.key)) return;

      setSelectedInspectorCardId(null);
      setSelectedInspectorAnchor(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedInspectorCardId]);

  React.useEffect(() => {
    if (!attackSourceCardId) return;

    const sourceCard = gameState.cards.find(card => card.id === attackSourceCardId);
    if (shouldClearAttackSource(sourceCard, gameState.gameStatus, gameState.turnPlayer)) {
      setAttackSourceCardId(null);
    }
  }, [attackSourceCardId, gameState.cards, gameState.gameStatus, gameState.turnPlayer]);

  React.useEffect(() => {
    if (!attackSourceCardId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldDismissOnEscapeKey(event.key)) return;

      setAttackSourceCardId(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [attackSourceCardId]);

  React.useEffect(() => {
    if (!attackSourceCardId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!shouldDismissAttackModeOnPointerDown(target)) return;

      setAttackSourceCardId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [attackSourceCardId]);

  React.useEffect(() => {
    if (!selectedInspectorCardId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!shouldDismissInspectorOnPointerDown(target, inspectorRef.current)) return;

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
  const inspectorPresentation = buildCardDetailPresentation(selectedInspectorDetail);
  const inspectorPopoverStyle = React.useMemo<React.CSSProperties | null>(() => {
    if (!selectedInspectorAnchor) return null;

    return getInspectorPopoverStyle(selectedInspectorAnchor, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
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
    setTokenSpawnCounts({});
    setTokenSpawnDestination('ex');
  };

  const handleTokenSpawn = () => {
    if (!tokenSpawnTargetRole) return;
    spawnTokens(
      tokenSpawnTargetRole,
      buildTokenSpawnSelections(tokenSpawnOptions, tokenSpawnCounts),
      tokenSpawnDestination
    );
    setTokenSpawnCounts({});
    setTokenSpawnTargetRole(null);
  };

  const handleTokenSpawnCountChange = React.useCallback((cardId: string, delta: number) => {
    setTokenSpawnCounts(current => updateTokenSpawnCounts(current, cardId, delta));
  }, []);

  const handleStartAttack = React.useCallback((cardId: string) => {
    if (!canInteract) return;
    const card = gameState.cards.find(entry => entry.id === cardId);
    if (!canStartAttack(card, cardStatLookup, gameState.gameStatus, gameState.turnPlayer)) return;

    setSelectedInspectorCardId(null);
    setSelectedInspectorAnchor(null);
    setAttackSourceCardId(current => current === cardId ? null : cardId);
  }, [canInteract, cardStatLookup, gameState.cards, gameState.gameStatus, gameState.turnPlayer]);

  const openSearchZone = React.useCallback((id: string, title: string) => {
    if (!canInteract) return;
    setSearchZone({ id, title });
  }, [canInteract, setSearchZone]);

  const getAttackHighlightTone = React.useCallback((card: CardInstance): 'attack-source' | 'attack-target' | undefined => {
    return resolveAttackHighlightTone(attackSourceCard, card, cardStatLookup);
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
    const zoneLabel = t('gameBoard.board.leaderLabel', { label });

    return (
      <GameBoardLeaderZone
        leaderZoneId={leaderZoneId}
        label={label}
        zoneLabel={zoneLabel}
        leaderCards={leaderCards}
        side={side}
        sideZoneWidth={sideZoneWidth}
        extraOffset={extraOffset}
        cardDetailLookup={cardDetailLookup}
        getHighlightTone={getAttackHighlightTone}
        onInspectCard={handleInspectCard}
        viewerRole={viewerRole}
        isAttackTargetLeader={isAttackTargetLeader}
        isDebug={isDebug}
        searchLabel={t('gameBoard.board.search')}
        onSearch={() => openSearchZone(leaderZoneId, zoneLabel)}
      />
    );
  };

  const renderZoneActions = (
    menuId: string,
    actions: Array<{ label: string; onClick: () => void; tone?: 'default' | 'accent' }>,
    direction: 'down' | 'up' = 'down'
  ) => (
    <GameBoardZoneActionsMenu
      actionsLabel={t('gameBoard.board.actions')}
      isOpen={activeZoneActions === menuId}
      actions={actions}
      direction={direction}
      onToggle={() => setActiveZoneActions(current => current === menuId ? null : menuId)}
      onActionClick={(action) => {
        action();
        setActiveZoneActions(null);
      }}
    />
  );

  const renderPlayerTracker = (playerRole: PlayerRole, label: string) => (
    <GameBoardPlayerTracker
      testId={`player-tracker-${playerRole}`}
      label={label}
      hp={gameState[playerRole].hp}
      ep={gameState[playerRole].ep}
      sep={gameState[playerRole].sep}
      combo={gameState[playerRole].combo}
      pp={gameState[playerRole].pp}
      maxPp={gameState[playerRole].maxPp}
      onAdjustStat={(stat, delta) => handleStatChange(playerRole, stat, delta)}
    />
  );

  const renderReadOnlyStatusPanel = (playerRole: PlayerRole, label: string) => (
    <GameBoardReadOnlyStatusPanel
      label={label}
      hp={gameState[playerRole].hp}
      pp={gameState[playerRole].pp}
      maxPp={gameState[playerRole].maxPp}
      ep={gameState[playerRole].ep}
      sep={gameState[playerRole].sep}
      combo={gameState[playerRole].combo}
    />
  );

  const renderEndTurnButton = (playerRole: PlayerRole, label: string, background: string) => {
    const isCurrentTurn = gameState.turnPlayer === playerRole;
    const isEnabled = gameState.gameStatus === 'playing' && isCurrentTurn && canInteract;

    return (
      <GameBoardEndTurnButton
        label={label}
        background={background}
        isEnabled={isEnabled}
        disabledTitle={interactionBlockedTitle ?? t('gameBoard.board.endTurnDisabled')}
        onClick={() => endTurn(playerRole)}
      />
    );
  };

  const renderCardInspector = () => {
    if (!selectedInspectorCard || !inspectorPopoverStyle) return null;

    return (
      <GameBoardCardInspector
        selectedInspectorCard={selectedInspectorCard}
        selectedInspectorDetail={selectedInspectorDetail}
        inspectorPresentation={inspectorPresentation}
        inspectorPopoverStyle={inspectorPopoverStyle}
        ref={inspectorRef}
        onClose={() => {
          setSelectedInspectorCardId(null);
          setSelectedInspectorAnchor(null);
        }}
      />
    );
  };

  const savedDeckPickerTargetLabel = React.useMemo(() => {
    if (!savedDeckImportTargetRole) return null;

    return getPlayerLabel(
      savedDeckImportTargetRole,
      isSoloMode,
      t('common.labels.self'),
      t('common.labels.opponent'),
      role,
      t('common.labels.player1'),
      t('common.labels.player2')
    );
  }, [savedDeckImportTargetRole, isSoloMode, role, t]);

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
            <GameBoardRoomStatus
              room={room}
              isSoloMode={isSoloMode}
              isHost={isHost}
              status={status}
              connectionState={connectionState}
              connectionBadgeTone={connectionBadgeTone}
              isRoomCopied={isRoomCopied}
              onCopyRoomId={handleCopyRoomId}
              onReconnect={attemptReconnect}
            />

            {gameState.gameStatus === 'preparing' ? (
              <GameBoardPreparationControls
                isSoloMode={isSoloMode}
                isHost={isHost}
                topRole={topRole}
                bottomRole={bottomRole}
                bottomInitialHandDrawn={gameState[bottomRole].initialHandDrawn}
                bottomReady={gameState[bottomRole].isReady}
                topInitialHandDrawn={gameState[topRole].initialHandDrawn}
                topReady={gameState[topRole].isReady}
                hostInitialHandDrawn={gameState.host.initialHandDrawn}
                guestInitialHandDrawn={gameState.guest.initialHandDrawn}
                hostReady={gameState.host.isReady}
                guestReady={gameState.guest.isReady}
                onSetInitialTurnOrder={handleSetInitialTurnOrder}
                onDrawInitialHand={handleDrawInitialHand}
                onToggleReady={handleToggleReady}
                onStartGame={handleStartGame}
              />
            ) : (
              <GameBoardPlayingControls
                canShowUndoTurn={canShowUndoTurn}
                onTossCoin={handlePureCoinFlip}
                onRollDice={handleRollDice}
                onOpenUndo={() => setShowUndoConfirm(true)}
              />
            )}
          </div>

          {/* Turn Management */}
          {gameState.gameStatus === 'playing' && (
            <GameBoardTurnPanel
              isSoloMode={isSoloMode}
              isCurrentPlayerTurn={gameState.turnPlayer === role}
              currentTurnLabel={currentTurnLabel}
              turnCount={gameState.turnCount}
              phase={gameState.phase}
              isBottomTurnActive={isBottomTurnActive}
              canChangePhase={isSoloMode || gameState.turnPlayer === role}
              onPhaseChange={setPhase}
            />
          )}
        </div>

        {isGuestConnectionBlocked && (
          <GameBoardReconnectAlert />
        )}

        {!isSoloMode && isHost && savedSessionCandidate && (
          <GameBoardSavedSessionPrompt
            savedSessionTimestamp={savedSessionTimestamp}
            onDiscard={discardSavedSession}
            onResume={resumeSavedSession}
          />
        )}

        {attackSourceCard && (
          <GameBoardAttackModeBanner
            attackerName={attackSourceCard.name}
            onCancel={() => setAttackSourceCardId(null)}
          />
        )}

        {gameState.gameStatus === 'preparing' && (
          <GameBoardPreparationPanel
            isSoloMode={isSoloMode}
            isHost={isHost}
            hostInitialHandDrawn={gameState.host.initialHandDrawn}
            guestInitialHandDrawn={gameState.guest.initialHandDrawn}
            hostReady={gameState.host.isReady}
            guestReady={gameState.guest.isReady}
            revealHandsMode={gameState.revealHandsMode}
            onToggleRevealHandsMode={() => handleSetRevealHandsMode(!gameState.revealHandsMode)}
          />
        )}

        {gameState.gameStatus === 'playing' && eventHistory.length > 0 && (
          <GameBoardRecentEventsPanel eventHistory={eventHistory} />
        )}

        {/* Board Playmat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'url("https://shadowverse-evolve.com/wordpress/wp-content/themes/shadowverse-evolve-release_v0/assets/images/common/bg.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 'var(--radius-lg)', padding: '1rem', overflowY: 'auto', alignItems: 'center' }}>

          {/* OPPONENT BOARD */}
          <div style={{ ...activeBoardSectionStyle(isSoloMode && isTopTurnActive), opacity: 0.9 }}>
            {isSoloMode ? (
              <div style={{ display: 'grid', gridTemplateColumns: boardShellColumns, columnGap: '1rem', alignItems: 'flex-start', width: '100%', maxWidth: '1568px', justifyContent: 'center' }}>
                <div style={{ width: `${topPanelWidth}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.8)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{t('gameBoard.zones.controls', { label: topLabel })}</div>
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
                    {t('gameBoard.zones.importDeck', { label: topLabel })}
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
                    {t('gameBoard.zones.loadFromMyDecks', { label: topLabel })}
                  </button>
                  <button onClick={() => drawCard(topRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing' || !canInteract} title={gameState.gameStatus !== 'playing' || !canInteract ? interactionBlockedTitle ?? t('gameBoard.board.availableDuringGameOnly') : undefined} style={{ padding: '0.5rem', background: '#6366f1', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' && canInteract ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' && canInteract ? 'pointer' : 'not-allowed' }}>
                    {t('gameBoard.zones.draw', { label: topLabel })}
                  </button>
                  <button onClick={() => millCard(topRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing' || !canInteract} title={gameState.gameStatus !== 'playing' || !canInteract ? interactionBlockedTitle ?? t('gameBoard.board.availableDuringGameOnly') : undefined} style={{ padding: '0.5rem', background: '#475569', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' && canInteract ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' && canInteract ? 'pointer' : 'not-allowed' }}>
                    {t('gameBoard.zones.mill', { label: topLabel })}
                  </button>
                  <button onClick={() => moveTopCardToEx(topRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing' || !canInteract} title={gameState.gameStatus !== 'playing' || !canInteract ? interactionBlockedTitle ?? t('gameBoard.board.availableDuringGameOnly') : undefined} style={{ padding: '0.5rem', background: '#334155', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' && canInteract ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' && canInteract ? 'pointer' : 'not-allowed' }}>
                    {t('gameBoard.zones.topToEx', { label: topLabel })}
                  </button>
                  {renderEndTurnButton(topRole, topLabel, '#fbbf24')}
                  <button onClick={() => openTokenSpawnModal(topRole)} className="glass-panel" style={{ padding: '0.5rem', background: '#7c3aed' }}>
                    {t('gameBoard.zones.spawnToken', { label: topLabel })}
                  </button>
                  {renderPlayerTracker(topRole, topLabel)}
                </div>

                <div style={{ width: `${boardContentWidth}px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', alignItems: 'flex-start' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                    <div />
                    <div style={{ width: `${centerZoneWidth}px`, minHeight: '150px', position: 'relative' }}>
                      <Zone
                        id={`hand-${topRole}`}
                        label={t('gameBoard.zones.hand', { label: topLabel })}
                        cards={getCards(`hand-${topRole}`)}
                        cardDetailLookup={cardDetailLookup}
                        hideCards={shouldHideTopHand}
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
                        <GameBoardMulliganButton
                          label={t('gameBoard.preparation.mulliganButton', { label: topLabel })}
                          onClick={() => openMulliganModal(topRole)}
                          style={soloMulliganButtonStyle}
                        />
                      )}
                    </div>
                    <div />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                    <GameBoardSearchableZoneStack
                      zone={<Zone id={`cemetery-${topRole}`} label={t('gameBoard.zones.cemetery', { label: topLabel })} cards={getCards(`cemetery-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />}
                      searchLabel={t('gameBoard.zones.search')}
                      onSearch={() => openSearchZone(`cemetery-${topRole}`, t('gameBoard.zones.cemetery', { label: topLabel }))}
                      searchTitle={interactionBlockedTitle}
                      isSearchInteractive={canInteract}
                    />
                    <Zone
                      id={`ex-${topRole}`}
                      label={t('gameBoard.zones.exArea', { label: topLabel })}
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
                    <GameBoardSearchableZoneStack
                      zone={<Zone id={`banish-${topRole}`} label={t('gameBoard.zones.banish', { label: topLabel })} cards={getCards(`banish-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />}
                      searchLabel={t('gameBoard.zones.search')}
                      onSearch={() => openSearchZone(`banish-${topRole}`, t('gameBoard.zones.banish', { label: topLabel }))}
                      searchTitle={interactionBlockedTitle}
                      isSearchInteractive={canInteract}
                    />
                  </div>

                  <div style={{ position: 'relative', width: `${boardContentWidth}px`, overflow: 'visible' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Zone id={`mainDeck-${topRole}`} label={t('gameBoard.zones.mainDeck', { label: topLabel })} cards={getCards(`mainDeck-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                        {renderZoneActions(`mainDeck-${topRole}`, [
                          { label: t('gameBoard.zones.search'), onClick: () => openSearchZone(`mainDeck-${topRole}`, t('gameBoard.zones.mainDeck', { label: topLabel })) },
                          { label: t('gameBoard.zones.shuffle'), onClick: () => handleShuffleDeck(topRole) },
                          { label: t('gameBoard.zones.lookTop'), onClick: () => openTopDeckModal(topRole), tone: 'accent' }
                        ], 'up')}
                      </div>
                      <Zone
                        id={`field-${topRole}`}
                        label={t('gameBoard.zones.field', { label: topLabel })}
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
                      <GameBoardSearchableZoneStack
                        zone={<Zone id={`evolveDeck-${topRole}`} label={t('gameBoard.zones.evolveDeck', { label: topLabel })} cards={getCards(`evolveDeck-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />}
                        searchLabel={t('gameBoard.zones.search')}
                        onSearch={() => openSearchZone(`evolveDeck-${topRole}`, t('gameBoard.zones.evolveDeck', { label: topLabel }))}
                        searchTitle={interactionBlockedTitle}
                        isSearchInteractive={canInteract}
                      />
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
                        label={t('gameBoard.zones.hand', { label: topLabel })}
                        cards={getCards(`hand-${topRole}`)}
                        cardDetailLookup={cardDetailLookup}
                        hideCards={shouldHideTopHand}
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
                    <GameBoardSearchableZoneStack
                      zone={<Zone id={`cemetery-${topRole}`} label={t('gameBoard.zones.cemetery', { label: topLabel })} cards={getCards(`cemetery-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />}
                      searchLabel={t('gameBoard.zones.search')}
                      onSearch={() => openSearchZone(`cemetery-${topRole}`, t('gameBoard.zones.cemetery', { label: topLabel }))}
                    />
                    <Zone
                      id={`ex-${topRole}`}
                      label={t('gameBoard.zones.exArea', { label: topLabel })}
                      cards={getCards(`ex-${topRole}`)}
                      cardStatLookup={cardStatLookup}
                      cardDetailLookup={cardDetailLookup}
                      onInspectCard={handleInspectCard}
                      isProtected={false}
                      viewerRole={viewerRole}
                      containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '150px', flex: 'none', width: `${centerZoneWidth}px` }}
                    />
                    <GameBoardSearchableZoneStack
                      zone={<Zone id={`banish-${topRole}`} label={t('gameBoard.zones.banish', { label: topLabel })} cards={getCards(`banish-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />}
                      searchLabel={t('gameBoard.zones.search')}
                      onSearch={() => openSearchZone(`banish-${topRole}`, t('gameBoard.zones.banish', { label: topLabel }))}
                    />
                  </div>

                  <div style={{ position: 'relative', width: `${boardContentWidth}px`, overflow: 'visible' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Zone id={`mainDeck-${topRole}`} label={t('gameBoard.zones.mainDeck', { label: topLabel })} cards={getCards(`mainDeck-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                      </div>
                      <Zone
                        id={`field-${topRole}`}
                        label={t('gameBoard.zones.field', { label: topLabel })}
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
                      <GameBoardSearchableZoneStack
                        zone={<Zone id={`evolveDeck-${topRole}`} label={t('gameBoard.zones.evolveDeck', { label: topLabel })} cards={getCards(`evolveDeck-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />}
                        searchLabel={t('common.buttons.search')}
                        onSearch={() => openSearchZone(`evolveDeck-${topRole}`, t('gameBoard.zones.evolveDeck', { label: topLabel }))}
                      />
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
                  <GameBoardSearchableZoneStack
                    zone={<Zone id={`evolveDeck-${bottomRole}`} label={t('gameBoard.zones.evolveDeck', { label: bottomLabel })} cards={getCards(`evolveDeck-${bottomRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />}
                    searchLabel={t('common.buttons.search')}
                    onSearch={() => openSearchZone(`evolveDeck-${bottomRole}`, t('gameBoard.zones.evolveDeck', { label: bottomLabel }))}
                    searchTitle={interactionBlockedTitle}
                    isSearchInteractive={canInteract}
                  />
                  <Zone id={`field-${bottomRole}`} label={t('gameBoard.zones.field', { label: bottomLabel })} cards={getCards(`field-${bottomRole}`)} cardStatLookup={cardStatLookup} cardDetailLookup={cardDetailLookup} getHighlightTone={getAttackHighlightTone} onInspectCard={handleInspectCard} onAttack={gameState.turnPlayer === bottomRole ? handleStartAttack : undefined} onTap={toggleTap} onModifyCounter={handleModifyCounter} onModifyGenericCounter={handleModifyGenericCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} disableQuickActionsForCard={shouldDisableQuickActionsForAttackTarget} viewerRole={viewerRole} containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '160px', width: `${centerZoneWidth}px`, flex: 'none' }} isDebug={isDebug} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Zone id={`mainDeck-${bottomRole}`} label={t('gameBoard.zones.mainDeck', { label: bottomLabel })} cards={getCards(`mainDeck-${bottomRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                    {renderZoneActions(`mainDeck-${bottomRole}`, [
                      { label: t('gameBoard.zones.search'), onClick: () => openSearchZone(`mainDeck-${bottomRole}`, t('gameBoard.zones.mainDeck', { label: bottomLabel })) },
                      { label: t('gameBoard.zones.shuffle'), onClick: () => handleShuffleDeck(bottomRole) },
                      { label: t('gameBoard.zones.lookTop'), onClick: () => openTopDeckModal(bottomRole), tone: 'accent' }
                    ])}
                  </div>
                  </div>
                  {renderLeaderZone(bottomRole, bottomLabel, 'left')}
                </div>

	                <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                  <GameBoardSearchableZoneStack
                    zone={<Zone id={`banish-${bottomRole}`} label={t('gameBoard.zones.banish', { label: bottomLabel })} cards={getCards(`banish-${bottomRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onCemetery={handleSendToCemetery} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />}
                    searchLabel={t('common.buttons.search')}
                    onSearch={() => openSearchZone(`banish-${bottomRole}`, t('gameBoard.zones.banish', { label: bottomLabel }))}
                    searchTitle={interactionBlockedTitle}
                    isSearchInteractive={canInteract}
                  />
	                  <Zone id={`ex-${bottomRole}`} label={t('gameBoard.zones.exArea', { label: bottomLabel })} cards={getCards(`ex-${bottomRole}`)} cardStatLookup={cardStatLookup} cardDetailLookup={cardDetailLookup} onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onModifyGenericCounter={handleModifyGenericCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} viewerRole={viewerRole} containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '150px', flex: 'none', width: `${centerZoneWidth}px` }} isDebug={isDebug} />
                  <GameBoardSearchableZoneStack
                    zone={<Zone id={`cemetery-${bottomRole}`} label={t('gameBoard.zones.cemetery', { label: bottomLabel })} cards={getCards(`cemetery-${bottomRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />}
                    searchLabel={t('common.buttons.search')}
                    onSearch={() => openSearchZone(`cemetery-${bottomRole}`, t('gameBoard.zones.cemetery', { label: bottomLabel }))}
                    searchTitle={interactionBlockedTitle}
                    isSearchInteractive={canInteract}
                  />
	                </div>

	                <div style={{ width: `${boardContentWidth}px`, minHeight: '160px', position: 'relative' }}>
                    <Zone id={`hand-${bottomRole}`} label={t('gameBoard.zones.hand', { label: bottomLabel })} cards={getCards(`hand-${bottomRole}`)} cardDetailLookup={cardDetailLookup} onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} isProtected={true} lockCards={isPreparingHandMoveLocked} viewerRole={viewerRole} containerStyle={{ minHeight: '160px' }} isDebug={isDebug} />

                    {gameState.gameStatus === 'preparing' && gameState[bottomRole].initialHandDrawn && !gameState[bottomRole].mulliganUsed && (
                      <GameBoardMulliganButton
                        label={t('game.mulligan_desc', { label: isSoloMode ? bottomLabel : t('game.mulligan_action') })}
                        onClick={() => openMulliganModal(bottomRole)}
                        style={isSoloMode ? soloMulliganButtonStyle : {
                          position: 'absolute', top: '-10px', right: '10px',
                          padding: '0.5rem 1rem', background: '#eab308', color: 'black',
                          fontWeight: 'bold', borderRadius: '4px',
                          cursor: 'pointer', fontSize: '0.875rem', zIndex: 10,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          border: '2px solid black'
                        }}
                      />
                    )}
                </div>
              </div>

              <div style={{ width: `${sidePanelWidth}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.8)', padding: '1rem', borderRadius: 'var(--radius-md)', marginLeft: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{t('gameBoard.zones.controls', { label: bottomLabel })}</div>
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
                      {t('gameBoard.zones.importDeck', { label: bottomLabel })}
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
                      {t('gameBoard.zones.loadFromMyDecks', { label: bottomLabel })}
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
                      {t('gameBoard.zones.importDeckJson')}
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
                      {t('gameBoard.zones.loadFromMyDecksGeneric')}
                    </button>
                  </>
                )}
                <button onClick={() => drawCard(bottomRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing' || !canInteract} title={gameState.gameStatus !== 'playing' || !canInteract ? interactionBlockedTitle ?? t('gameBoard.board.availableDuringGameOnly') : undefined} style={{ padding: '0.5rem', background: 'var(--accent-primary)', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' && canInteract ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' && canInteract ? 'pointer' : 'not-allowed' }}>
                  {t('gameBoard.zones.draw', { label: bottomLabel })}
                </button>
                <button onClick={() => millCard(bottomRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing' || !canInteract} title={gameState.gameStatus !== 'playing' || !canInteract ? interactionBlockedTitle ?? t('gameBoard.board.availableDuringGameOnly') : undefined} style={{ padding: '0.5rem', background: '#475569', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' && canInteract ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' && canInteract ? 'pointer' : 'not-allowed' }}>
                  {t('gameBoard.zones.mill', { label: bottomLabel })}
                </button>
                <button onClick={() => moveTopCardToEx(bottomRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing' || !canInteract} title={gameState.gameStatus !== 'playing' || !canInteract ? interactionBlockedTitle ?? t('gameBoard.board.availableDuringGameOnly') : undefined} style={{ padding: '0.5rem', background: '#334155', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' && canInteract ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' && canInteract ? 'pointer' : 'not-allowed' }}>
                  {t('gameBoard.zones.topToEx', { label: bottomLabel })}
                </button>
                {isSoloMode ? (
                  renderEndTurnButton(bottomRole, bottomLabel, '#f59e0b')
                ) : (gameState.turnPlayer === role && gameState.gameStatus === 'playing') && (
                  <button onClick={() => endTurn()} className="glass-panel" style={{ padding: '0.5rem', background: '#f59e0b', color: 'black', fontWeight: 'bold' }}>
                    {t('gameBoard.board.endTurnSelf')}
                  </button>
                )}
                <button onClick={() => openTokenSpawnModal(bottomRole)} className="glass-panel" style={{ padding: '0.5rem', background: 'var(--accent-secondary)' }}>
                  {t('gameBoard.zones.spawnToken', { label: bottomLabel })}
                </button>
                {canResetGame && (
                  <button onClick={() => setShowResetConfirm(true)} className="glass-panel" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontWeight: 'bold' }}>
                    {t('gameBoard.controls.resetGame')}
                  </button>
                )}
                 {gameState.gameStatus === 'playing' &&
                  (isSoloMode ? gameState.turnPlayer === 'host' : gameState.turnPlayer === role) &&
                  hasUndoableMove && (
                  <button
                    onClick={handleUndoCardMove}
                    className="glass-panel"
                    style={{
                      padding: '0.5rem',
                      background: '#f59e0b',
                      color: 'black',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {t('gameBoard.turn.undoMove')}
                  </button>
                )}
                {renderPlayerTracker(bottomRole, bottomLabel)}
              </div>
            </div>
          </div>

        </div>
      </div>

      <GameBoardMulliganDialog
        isOpen={isMulliganModalOpen}
        title={t('game.mulligan_title')}
        instructions={t('game.mulligan_instructions')}
        disclaimer={t('game.mulligan_disclaimer')}
        cards={gameState.cards.filter(c => c.zone === `hand-${mulliganTargetRole}`)}
        mulliganOrder={mulliganOrder}
        cardDetailLookup={cardDetailLookup}
        cancelLabel={t('common.buttons.cancel')}
        confirmLabel={t('game.mulligan_exchange')}
        onSelectCard={handleMulliganOrderSelect}
        onCancel={() => setIsMulliganModalOpen(false)}
        onConfirm={() => executeMulligan(mulliganTargetRole)}
      />

      <CardSearchModal
        isOpen={searchZone !== null}
        onClose={() => setSearchZone(null)}
        title={searchZone?.title || ''}
        zoneId={searchZone?.id}
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
        handCards={gameState.cards.filter(c => c.zone === `hand-${topDeckTargetRole}`)}
        onConfirm={(results) => handleResolveTopDeck(results, topDeckTargetRole)}
        onCancel={() => setTopDeckCards([])}
      />

      {tokenSpawnTargetRole && (
        <GameBoardTokenSpawnDialog
          tokenSpawnOptions={tokenSpawnOptions}
          tokenSpawnCounts={tokenSpawnCounts}
          tokenSpawnDestination={tokenSpawnDestination}
          totalTokenSpawnCount={totalTokenSpawnCount}
          cardDetailLookup={cardDetailLookup}
          onDestinationChange={setTokenSpawnDestination}
          onCountChange={handleTokenSpawnCountChange}
          onCancel={() => setTokenSpawnTargetRole(null)}
          onConfirm={handleTokenSpawn}
        />
      )}

      {isTopNInputOpen && (
        <GameBoardTopNDialog
          value={topNValue}
          onValueChange={setTopNValue}
          onCancel={() => setIsTopNInputOpen(false)}
          onConfirm={() => {
            handleLookAtTop(topNValue, topDeckTargetRole);
            setIsTopNInputOpen(false);
          }}
        />
      )}

      <GameBoardGlobalOverlays
        coinMessage={coinMessage}
        turnMessage={turnMessage}
        cardPlayMessage={cardPlayMessage}
        attackMessage={attackMessage}
        attackLine={attackLine}
        revealedCardsOverlay={revealedCardsOverlay}
        cardDetailLookup={cardDetailLookup}
        isRollingDice={isRollingDice}
        diceValue={diceValue}
      />

      {showResetConfirm && canResetGame && (
        <GameBoardResetDialog
          onCancel={() => setShowResetConfirm(false)}
          onConfirm={confirmResetGame}
        />
      )}

      {showUndoConfirm && (
        <GameBoardUndoTurnDialog
          onCancel={() => setShowUndoConfirm(false)}
          onConfirm={() => {
            setShowUndoConfirm(false);
            handleUndoTurn();
          }}
        />
      )}

      <GameBoardDialogsHost
        savedDeckPicker={
          savedDeckImportTargetRole && savedDeckPickerTargetLabel
            ? {
                targetLabel: savedDeckPickerTargetLabel,
                savedDeckSearch,
                filteredSavedDeckOptions,
                onBackdropClick: (event) => {
                  if (!shouldDismissModalOnBackdropClick(event.target, event.currentTarget)) return;
                  closeSavedDeckPicker();
                },
                onClose: closeSavedDeckPicker,
                onSearchChange: setSavedDeckSearch,
                onLoadDeck: handleSavedDeckImport,
              }
            : null
        }
        evolveAutoAttach={
          evolveAutoAttachSelection
            ? {
                selection: evolveAutoAttachSelection,
                cardDetailLookup,
                onBackdropClick: (event) => {
                  if (!shouldDismissModalOnBackdropClick(event.target, event.currentTarget)) return;
                  cancelEvolveAutoAttachSelection();
                },
                onCancel: cancelEvolveAutoAttachSelection,
                onConfirm: confirmEvolveAutoAttachSelection,
              }
            : null
        }
      />
      {renderCardInspector()}
    </DndContext>
  );
};

export default GameBoard;
