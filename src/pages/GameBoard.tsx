import GameBoardMultiSelectionBar from '../components/gameBoard/GameBoardMultiSelectionBar';
import { getCanShowUndoMoveForRole } from '../utils/gameBoard/gameBoardUndoAvailability';
import { useGameBoardUndoShortcut } from '../hooks/gameBoard/useGameBoardUndoShortcut';
import { GameBoardMultiSelectionContext } from '../contexts/gameBoardMultiSelectionContext';
import { useGameBoardMultiSelection } from '../hooks/gameBoard/useGameBoardMultiSelection';
import React from 'react';
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import Zone from '../components/gameBoard/Zone';
import type { CardInstance } from '../components/Card';
import CardSearchModal from '../components/gameBoard/CardSearchModal';
import GameBoardBoardRow from '../components/gameBoard/GameBoardBoardRow';
import GameBoardBottomHandSection from '../components/gameBoard/GameBoardBottomHandSection';
import GameBoardCatalogStatus from '../components/gameBoard/GameBoardCatalogStatus';
import GameBoardCardInspectorSection from '../components/gameBoard/GameBoardCardInspectorSection';
import GameBoardCountDialog from '../components/gameBoard/GameBoardCountDialog';
import GameBoardDialogsHost from '../components/gameBoard/GameBoardDialogsHost';
import GameBoardEndTurnSection from '../components/gameBoard/GameBoardEndTurnSection';
import GameBoardGlobalOverlays from '../components/gameBoard/GameBoardGlobalOverlays';
import GameBoardHeader from '../components/gameBoard/GameBoardHeader';
import GameBoardHandRevealDialog from '../components/gameBoard/GameBoardHandRevealDialog';
import GameBoardLeaderZoneSection from '../components/gameBoard/GameBoardLeaderZoneSection';
import GameBoardMainDeckSection from '../components/gameBoard/GameBoardMainDeckSection';
import GameBoardMulliganDialog from '../components/gameBoard/GameBoardMulliganDialog';
import GameBoardPlayerControlsPanel from '../components/gameBoard/GameBoardPlayerControlsPanel';
import GameBoardPreparationPanel from '../components/gameBoard/GameBoardPreparationPanel';
import GameBoardReadOnlyStatusSection from '../components/gameBoard/GameBoardReadOnlyStatusSection';
import GameBoardReconnectAlert from '../components/gameBoard/GameBoardReconnectAlert';
import GameBoardResetDialog from '../components/gameBoard/GameBoardResetDialog';
import GameBoardSearchableStackSection from '../components/gameBoard/GameBoardSearchableStackSection';
import GameBoardSavedSessionPrompt from '../components/gameBoard/GameBoardSavedSessionPrompt';
import GameBoardTopHandSection from '../components/gameBoard/GameBoardTopHandSection';
import GameBoardTopNDialog from '../components/gameBoard/GameBoardTopNDialog';
import GameBoardTokenSpawnDialog from '../components/gameBoard/GameBoardTokenSpawnDialog';
import GameBoardUndoTurnDialog from '../components/gameBoard/GameBoardUndoTurnDialog';
import GameBoardInputProfileProvider from '../contexts/GameBoardInputProfileProvider';
import {
  buildMainDeckZoneActions,
  buildRandomDiscardHandZoneActions,
  buildRevealHandZoneActions,
} from '../components/gameBoard/gameBoardZoneActionViewModel';
import TopDeckModal from '../components/gameBoard/TopDeckModal';
import { useGameBoardAttackUi } from '../hooks/gameBoard/useGameBoardAttackUi';
import { useGameBoardLogic } from '../hooks/gameBoard/useGameBoardLogic';
import { buildGameBoardViewModel } from '../hooks/gameBoard/gameBoardViewModel';
import { useGameBoardDialogsUi } from '../hooks/gameBoard/useGameBoardDialogsUi';
import { useGameBoardInspectorUi } from '../hooks/gameBoard/useGameBoardInspectorUi';
import { useGameBoardSavedDeckPicker } from '../hooks/gameBoard/useGameBoardSavedDeckPicker';
import type { PlayerRole } from '../types/game';
import type { AttackTarget } from '../types/sync';
import {
  formatSavedSessionTimestamp,
} from '../utils/gameBoard/gameBoardPresentation';
import { resolveBoardEnvironment } from '../utils/gameBoard/gameBoardEnvironment';
import {
  shouldDismissAttackModeOnPointerDown,
  shouldDismissModalOnBackdropClick,
  shouldDismissOnEscapeKey,
} from '../utils/gameBoard/gameBoardDismissals';
import {
  activeBoardSectionStyle,
  resolveBoardDisplayScale,
  resolveBoardLayout,
  resolveBoardLayoutSpacing,
  soloMulliganButtonStyle,
} from '../utils/gameBoard/gameBoardLayout';
import {
  getAttackTargetFromCard as resolveAttackTargetFromCard,
} from '../utils/gameBoard/gameBoardCombat';
import { canEditSearchedEvolveDeck } from '../utils/gameBoard/gameBoardEvolveFaceSelection';

const GameBoard: React.FC = () => {
  const [viewportWidth, setViewportWidth] = React.useState(() => (
    typeof window === 'undefined' ? 1280 : window.innerWidth
  ));
  const [viewportHeight, setViewportHeight] = React.useState(() => (
    typeof window === 'undefined' ? 900 : window.innerHeight
  ));
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    inputProfile,
    layoutProfile,
    boardDensity,
  } = React.useMemo(
    () => resolveBoardEnvironment({
      viewportWidth,
      viewportHeight,
      matchMediaFn: typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia.bind(window)
        : undefined,
    }),
    [viewportWidth, viewportHeight]
  );
  const isCompactBoard = inputProfile === 'coarse';
  const isTabletLayout = layoutProfile === 'tablet';
  const isMobileLayout = layoutProfile === 'mobile';
  const isMobileCompactLandscape = isMobileLayout && viewportHeight <= 500;
  const isTabletCompactBoard = isCompactBoard && (isTabletLayout || isMobileLayout);
  const [mobileSoloViewpoint, setMobileSoloViewpoint] = React.useState<'all' | 'bottom' | 'top' | 'battle'>(
    isMobileCompactLandscape ? 'battle' : 'all'
  );
  const [isBattleBottomSecondaryCollapsed, setIsBattleBottomSecondaryCollapsed] = React.useState(false);
  React.useEffect(() => {
    if (isMobileCompactLandscape) {
      setMobileSoloViewpoint((prev) => (prev === 'all' ? 'battle' : prev));
    }
  }, [isMobileCompactLandscape]);
  const zoneActionPlacement = (inputProfile === 'fine' && boardDensity === 'overview') || isMobileLayout ? 'overlay' : 'below';
  const {
    boardShellPadding,
    boardShellGap,
    playmatPadding,
    playmatGap,
    boardSectionPadding,
    boardSectionGap,
    boardShellColumnGap,
    bottomPanelMarginLeft,
    boardColumnStackGap,
    bottomBoardRowSecondaryMarginTop,
    boardSectionDividerMargin,
    boardRowGap,
    stackZoneMinHeight,
    fieldZoneMinHeight,
    handZoneMinHeight,
    bottomHandZoneMinHeight,
    leaderZoneMinHeight,
  } = React.useMemo(
    () => resolveBoardLayoutSpacing(inputProfile, layoutProfile, boardDensity, viewportHeight),
    [inputProfile, layoutProfile, boardDensity, viewportHeight]
  );
  const {
    sidePanelWidth,
    topPanelWidth,
    sideZoneWidth,
    centerZoneWidth,
    boardContentWidth,
    boardColumns,
    boardShellColumns,
  } = React.useMemo(
    () => resolveBoardLayout(viewportWidth, inputProfile, boardDensity, viewportHeight),
    [viewportWidth, inputProfile, boardDensity, viewportHeight]
  );
  const boardDisplayScale = resolveBoardDisplayScale(viewportWidth, inputProfile);
  const isNarrowBoardPreview = boardDisplayScale < 1;
  const boardShellNaturalWidth = topPanelWidth + boardContentWidth + sidePanelWidth + 32;
  const boardGridPresentationStyle: React.CSSProperties = isNarrowBoardPreview
    ? {
        width: `${boardShellNaturalWidth}px`,
        maxWidth: 'none',
        zoom: boardDisplayScale,
      }
    : {
        width: '100%',
        maxWidth: '1568px',
      };
  const { t } = useTranslation();
  const {
    dispatchGameEvent,
    room, isSoloMode, isHost, isSpectator, role, status, connectionState, spectatorCount, maxSpectatorConnections, canInteract, canView, attemptReconnect, gameState, savedSessionCandidate, resumeSavedSession, discardSavedSession, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage, cardPlayMessage, attackMessage, eventHistory, attackVisual, revealedCardsOverlay,
    cardStatLookup, cardDetailLookup, generatedCatalog, catalogStatus, retryCatalog,
    displayCards, getDetailStatus, retryDetails, isRefreshingCatalog, catalogRefreshFailed,
    isRollingDice, diceValue, mulliganOrder, isMulliganModalOpen, setIsMulliganModalOpen,
    handleStatChange, setPhase, endTurn, handleUndoTurn, handleSetInitialTurnOrder,
    handlePureCoinFlip, handleRollDice, handleStartGame, handleToggleReady,
    handleDrawInitialHand, startMulligan, handleMulliganOrderSelect, executeMulligan,
    beginDeckImport, drawCard, handleExtractCard, handleExtractCards, confirmResetGame, handleDeckUpload, importDeckData, spawnTokens,
    handleModifyCounter, handleModifyGenericCounter, handleDragEnd, handleAttachToCard, toggleTap, handleFlipCard, handleSetCardFace, handleSendToBottom, handleSendToTop, handleSendCardsToBottom,
    handleBanish, handleBanishCards, handlePlayToField, handleSendToHand, handleSendToEx, handleSendToCemetery, handleSendCardsToCemetery, handleReturnEvolve, handleShuffleDeck, handleDeclareAttack,
    handleSetRevealHandsMode, handleSetEndStop,
    evolveAutoAttachSelection, confirmEvolveAutoAttachSelection, cancelEvolveAutoAttachSelection,
    getCards, getTokenOptions, millCard, moveTopCardToEx, moveTopCardToBanish, discardRandomHandCards, revealHand, revealSelectedHandCards,
    topDeckCards, topDeckTargetRole, setTopDeckTargetRole, handleLookAtTop, handleResolveTopDeck, setTopDeckCards,
    handleUndoCardMove, hasUndoableMove, canUndoTurn,
    isDebug
  } = useGameBoardLogic();

  const [mulliganTargetRole, setMulliganTargetRole] = React.useState<PlayerRole>('host');
  const [activeZoneActions, setActiveZoneActions] = React.useState<string | null>(null);
  const draggingRef = React.useRef(false);
  const dragSensors = useSensors(
    // A click/tap must not activate DnD or suppress the next button click.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [searchShuffleTargetRole, setSearchShuffleTargetRole] = React.useState<PlayerRole | null>(null);
  const [isRoomCopied, setIsRoomCopied] = React.useState(false);
  const [isHandRevealDialogOpen, setIsHandRevealDialogOpen] = React.useState(false);
  const [selectedHandRevealIds, setSelectedHandRevealIds] = React.useState<string[]>([]);
  const {
    isSavedDeckLoading, savedDeckLoadFailed,
    allCardsLength,    savedDeckSearch,
    setSavedDeckSearch,
    savedDeckImportTargetRole,
    filteredSavedDeckOptions,
    savedDeckPickerTargetLabel,
    openSavedDeckPicker,
    closeSavedDeckPicker,
    handleSavedDeckImport,
  } = useGameBoardSavedDeckPicker({
    beginDeckImport,
    generatedCatalog,
    gameState,
    importDeckData,
    isSoloMode,
    role,
    t,
  });
  const {
    isTopNInputOpen,
    setIsTopNInputOpen,
    topNValue,
    setTopNValue,
    randomDiscardValue,
    setRandomDiscardValue,
    randomDiscardTargetRole,
    randomDiscardActorRole,
    tokenSpawnTargetRole,
    tokenSpawnCounts,
    tokenSpawnDestination,
    setTokenSpawnDestination,
    showUndoConfirm,
    setShowUndoConfirm,
    tokenSpawnOptions,
    totalTokenSpawnCount,
    openTopDeckModal,
    openRandomDiscardDialog,
    closeRandomDiscardDialog,
    openTokenSpawnModal,
    closeTokenSpawnModal,
    handleTokenSpawn,
    handleTokenSpawnCountChange,
    handleQuickTokenSpawn,
    resetDialogsForConnectionChange,
  } = useGameBoardDialogsUi({
    canInteract,
    gameStatus: gameState.gameStatus,
    getCards,
    setTopDeckTargetRole,
    getTokenOptions,
    spawnTokens,
  });
  const {
    canOpenSavedDeckPicker,
    viewerRole,
    isPreparingHandMoveLocked,
    topRole,
    bottomRole,
    canImportTopDeck,
    canImportBottomDeck,
    savedDeckPickerUnavailableTitle,
    topLabel,
    bottomLabel,
    searchTargetRole,
    currentTurnLabel,
    canShowUndoTurn,
    undoMoveActor,
    shouldHideTopHand,
    isBottomTurnActive,
    shouldHighlightTopBoard,
    canResetGame,
    isGuestConnectionBlocked,
    connectionBadgeTone,
    interactionBlockedTitle,
    isOwnEndStopActive,
    canShowEndStopToggle,
    endTurnBlockedByEndStop,
    endTurnDisabledTitle,
  } = buildGameBoardViewModel({
    allCardsLength,
    role,
    isSoloMode,
    isHost,
    isSpectator,
    canInteract,
    connectionState,
    gameState,
    canUndoTurn,
    searchZoneId: searchZone?.id ?? null,
    t,
  });
  const hasTopExCards = getCards(`ex-${topRole}`).length > 0;
  const [battleTopSecondaryOverride, setBattleTopSecondaryOverride] = React.useState<'expanded' | 'collapsed' | null>(null);
  React.useEffect(() => {
    setBattleTopSecondaryOverride(null);
  }, [hasTopExCards]);
  const isBattleTopSecondaryCollapsed = battleTopSecondaryOverride
    ? battleTopSecondaryOverride === 'collapsed'
    : !hasTopExCards;
  const canShowUndoMoveForRole = (playerRole: PlayerRole) => getCanShowUndoMoveForRole({
    gameStatus: gameState.gameStatus, isSoloMode, isSpectator, canInteract,
    role, playerRole, hasUndoableMove, undoMoveActor,
  });
  const renderUndoMoveButton = (playerRole: PlayerRole) => {
    const canUndo = canShowUndoMoveForRole(playerRole);
    return (
      <button
        data-testid={`undo-move-${playerRole}`}
        onClick={performUndoMove}
        aria-keyshortcuts="Control+Z Meta+Z"
        aria-label={t('gameBoard.turn.undoMove')}
        title={t('gameBoard.turn.undoMove')}
        disabled={!canUndo}
        className="glass-panel"
        style={{
          padding: isMobileLayout ? '0.24rem 0.35rem' : '0.28rem 0.45rem',
          minHeight: isMobileLayout ? '25px' : '26px',
          fontSize: isMobileLayout ? '0.68rem' : '0.74rem',
          background: canUndo
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : 'rgba(148, 163, 184, 0.18)',
          color: canUndo ? '#0f172a' : 'rgba(148, 163, 184, 0.5)',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobileLayout ? '0.2rem' : '0.35rem',
          borderRadius: '8px',
          boxShadow: canUndo ? '0 2px 8px rgba(245, 158, 11, 0.35)' : 'none',
          cursor: canUndo ? 'pointer' : 'not-allowed',
          opacity: canUndo ? 1 : 0.4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {isMobileLayout ? t('gameBoard.turn.undoMoveShort') : t('gameBoard.turn.undoMove')}
      </button>
    );
  };
  const savedSessionTimestamp = React.useMemo(() => {
    if (!savedSessionCandidate) return null;

    return formatSavedSessionTimestamp(savedSessionCandidate.savedAt);
  }, [savedSessionCandidate]);
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

  const [attachSourceCardId, setAttachSourceCardId] = React.useState<string | null>(null);
  const clearAttachSource = React.useCallback(() => {
    setAttachSourceCardId(null);
  }, []);
  const attachSourceCard = React.useMemo(() => (
    attachSourceCardId ? gameState.cards.find((card) => card.id === attachSourceCardId) ?? null : null
  ), [attachSourceCardId, gameState.cards]);

  const {
    attackSourceCard,
    attackSourceController,
    handleStartAttack: startAttackMode,
    handleAttackTargetSelect,
    getAttackHighlightTone,
    shouldDisableQuickActionsForAttackTarget,
    clearAttackSource,
  } = useGameBoardAttackUi({
    canInteract,
    cards: gameState.cards,
    cardStatLookup,
    gameStatus: gameState.gameStatus,
    turnPlayer: gameState.turnPlayer,
    handleDeclareAttack,
    onAttackModeStarted: clearAttachSource,
  });
  const getAttackTargetFromCard = React.useCallback((card: CardInstance): AttackTarget | null => {
    return resolveAttackTargetFromCard(attackSourceCard, card, cardStatLookup);
  }, [attackSourceCard, cardStatLookup]);
  const {
    inspectorRef,
    selectedInspectorCard,
    selectedInspectorDetail,
    inspectorPresentation,
    inspectorPopoverStyle,
    handleInspectCard,
    closeInspector,
  } = useGameBoardInspectorUi({
    cards: displayCards,
    cardDetailLookup,
    getAttackTargetFromCard,
    handleAttackTargetSelect,
  });
  const multiSelection = useGameBoardMultiSelection({
    gameState, role, isSoloMode,
    available: canInteract && !isSpectator && (isSoloMode || connectionState === 'connected'),
    blocked: Boolean(searchZone || topDeckCards.length || randomDiscardTargetRole || savedDeckImportTargetRole || showResetConfirm || showUndoConfirm || isMulliganModalOpen ||
      isTopNInputOpen || isHandRevealDialogOpen || tokenSpawnTargetRole || evolveAutoAttachSelection || attackSourceCard || attachSourceCard),
    dispatch: dispatchGameEvent,
  });
  const startMultiSelection = () => {
    closeInspector();
    clearAttackSource();
    clearAttachSource();
    setActiveZoneActions(null);
    multiSelection.start();
  };
  const performUndoMove = () => { multiSelection.finish(); handleUndoCardMove(); };
  useGameBoardUndoShortcut({
    canUndo: canShowUndoMoveForRole(isSoloMode ? undoMoveActor : role),
    blocked: Boolean(searchZone || topDeckCards.length || randomDiscardTargetRole || savedDeckImportTargetRole ||
      savedSessionCandidate || showResetConfirm || showUndoConfirm || isMulliganModalOpen || isTopNInputOpen ||
      isHandRevealDialogOpen || tokenSpawnTargetRole || evolveAutoAttachSelection || searchShuffleTargetRole ||
      activeZoneActions || attackSourceCard || attachSourceCard || selectedInspectorCard),
    draggingRef,
    onUndo: performUndoMove,
  });
  const selectionContext = {
    active: multiSelection.active,
    select: (card: CardInstance, shortcut: boolean) => {
      const handled = multiSelection.select(card, shortcut);
      if (handled) { closeInspector(); clearAttackSource(); clearAttachSource(); setActiveZoneActions(null); }
      return handled;
    },
    tone: multiSelection.tone,
    selectAll: multiSelection.selectAll,
    canSelectZone: (zone: string) => {
      const side = zone.split('-')[1];
      return (zone.startsWith('field-') || zone.startsWith('ex-')) &&
        (side === 'host' || side === 'guest');
    },
  };
  const handleStartAttack = React.useCallback((cardId: string) => {
    closeInspector();
    clearAttachSource();
    startAttackMode(cardId);
  }, [clearAttachSource, closeInspector, startAttackMode]);
  const handleStartAttach = React.useCallback((cardId: string) => {
    if (!canInteract) return;
    closeInspector();
    clearAttackSource();
    setActiveZoneActions(null);
    setAttachSourceCardId((prev) => (prev === cardId ? null : cardId));
  }, [canInteract, clearAttackSource, closeInspector]);
  const handleCardTapForAttach = React.useCallback((targetCard: CardInstance) => {
    if (!attachSourceCard) return false;
    if (targetCard.id === attachSourceCard.id) {
      clearAttachSource();
      return true;
    }
    const isFieldTarget = targetCard.zone === `field-${targetCard.owner}` && !targetCard.attachedTo && !targetCard.linkedTo;
    if (!isFieldTarget) {
      clearAttachSource();
      return false;
    }
    handleAttachToCard(attachSourceCard.id, targetCard.id);
    clearAttachSource();
    return true;
  }, [attachSourceCard, clearAttachSource, handleAttachToCard]);
  React.useEffect(() => {
    if (!attachSourceCard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldDismissOnEscapeKey(event.key)) {
        setAttachSourceCardId(null);
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (shouldDismissAttackModeOnPointerDown(event.target instanceof HTMLElement ? event.target : null)) {
        setAttachSourceCardId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [attachSourceCard]);
  React.useEffect(() => {
    if (isSoloMode || connectionState === 'connected') return;

    resetDialogsForConnectionChange();
    setSearchShuffleTargetRole(null);
    setActiveZoneActions(null);
    closeInspector();
    clearAttackSource();
    clearAttachSource();
  }, [clearAttachSource, clearAttackSource, closeInspector, connectionState, isSoloMode, resetDialogsForConnectionChange]);

  const openMulliganModal = (targetRole: PlayerRole) => {
    if (!canInteract) return;
    setMulliganTargetRole(targetRole);
    startMulligan();
  };

  const openSearchZone = React.useCallback((id: string, title: string) => {
    if (!canView) return;
    setSearchZone({ id, title });
  }, [canView, setSearchZone]);
  const handleRequestMainDeckShuffleConfirm = React.useCallback((targetRole: PlayerRole) => {
    setSearchShuffleTargetRole(targetRole);
  }, []);
  const openSelectedHandRevealDialog = React.useCallback(() => {
    setSelectedHandRevealIds([]);
    setIsHandRevealDialogOpen(true);
  }, []);
  const closeSelectedHandRevealDialog = React.useCallback(() => {
    setIsHandRevealDialogOpen(false);
    setSelectedHandRevealIds([]);
  }, []);
  const toggleSelectedHandRevealCard = React.useCallback((cardId: string) => {
    setSelectedHandRevealIds((previous) => (
      previous.includes(cardId)
        ? previous.filter((selectedId) => selectedId !== cardId)
        : [...previous, cardId]
    ));
  }, []);
  const topHandRandomDiscardZoneActions = buildRandomDiscardHandZoneActions(
    topRole,
    () => openRandomDiscardDialog(topRole, bottomRole),
    t
  );
  const topMainDeckZoneActions = buildMainDeckZoneActions({
    playerRole: topRole,
    onSearch: () => openSearchZone(`mainDeck-${topRole}`, t('gameBoard.zones.mainDeck', { label: topLabel })),
    onShuffle: !isSpectator ? () => handleShuffleDeck(topRole) : undefined,
    onLookTop: !isSpectator ? () => openTopDeckModal(topRole) : undefined,
    t,
  });
  const topReadOnlyMainDeckZoneActions = buildMainDeckZoneActions({
    playerRole: topRole,
    onSearch: () => openSearchZone(`mainDeck-${topRole}`, t('gameBoard.zones.mainDeck', { label: topLabel })),
    t,
  });
  const bottomHandRandomDiscardZoneActions = buildRandomDiscardHandZoneActions(
    bottomRole,
    () => openRandomDiscardDialog(bottomRole, topRole),
    t
  );
  const bottomHandRevealZoneActions = buildRevealHandZoneActions(bottomRole, revealHand, openSelectedHandRevealDialog, t);
  const bottomMainDeckZoneActions = buildMainDeckZoneActions({
    playerRole: bottomRole,
    onSearch: () => openSearchZone(`mainDeck-${bottomRole}`, t('gameBoard.zones.mainDeck', { label: bottomLabel })),
    onShuffle: !isSpectator ? () => handleShuffleDeck(bottomRole) : undefined,
    onLookTop: !isSpectator ? () => openTopDeckModal(bottomRole) : undefined,
    t,
  });
  const bottomMulliganButtonStyle = isSoloMode
    ? soloMulliganButtonStyle
    : {
        position: 'absolute' as const,
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
        border: '2px solid black',
      };
  const topControlsPanelProps = {
    label: topLabel,
    panelWidth: topPanelWidth,
    gameStatus: gameState.gameStatus,
    importDeckLabel: t('gameBoard.zones.importDeck', { label: topLabel }),
    loadSavedDeckLabel: t('gameBoard.zones.loadFromMyDecks', { label: topLabel }),
    canImportDeck: canImportTopDeck,
    canOpenSavedDeckPicker,
    savedDeckPickerUnavailableTitle,
    onDeckUpload: (event: React.ChangeEvent<HTMLInputElement>) => handleDeckUpload(event, topRole),
    onOpenSavedDeckPicker: () => openSavedDeckPicker(topRole),
    canUsePlayingActions: gameState.gameStatus === 'playing' && canInteract,
    playingActionsDisabledTitle: interactionBlockedTitle ?? t('gameBoard.board.availableDuringGameOnly'),
    onDraw: () => drawCard(topRole),
    onMill: () => millCard(topRole),
    onMoveTopCardToEx: () => moveTopCardToEx(topRole),
    onMoveTopCardToBanish: () => moveTopCardToBanish(topRole),
    drawButtonBackground: '#6366f1',
    canOpenTokenSpawn: canInteract,
    onOpenTokenSpawn: () => openTokenSpawnModal(topRole),
    spawnButtonBackground: '#7c3aed',
    undoMoveButton: renderUndoMoveButton(topRole),
    trackerTestId: `player-tracker-${topRole}`,
    playerState: gameState[topRole],
    onAdjustStat: (stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo', delta: number) => handleStatChange(topRole, stat, delta),
    readOnlyTracker: isSpectator,
    forceExpandedTracker: false,
  };
  const topSoloHandSectionProps = {
    columns: boardColumns,
    width: boardContentWidth,
    centerWidth: centerZoneWidth,
    rowGap: boardRowGap,
    minHeight: handZoneMinHeight,
    zoneProps: {
      id: `hand-${topRole}`,
      label: t('gameBoard.zones.hand', { label: topLabel }),
      cards: getCards(`hand-${topRole}`),
      cardDetailLookup,
      hideCards: shouldHideTopHand,
      layout: 'horizontal' as const,
      onInspectCard: handleInspectCard,
      onCardTapAction: attachSourceCard ? handleCardTapForAttach : undefined,
      isProtected: true,
      lockCards: isPreparingHandMoveLocked,
      viewerRole,
      onModifyCounter: handleModifyCounter,
      onModifyGenericCounter: handleModifyGenericCounter,
      onSendToBottom: handleSendToBottom,
      onSendToTop: handleSendToTop,
      onBanish: handleBanish,
      onCemetery: handleSendToCemetery,
      onPlayToField: (cardId: string) => handlePlayToField(cardId, topRole),
      onSendToEx: handleSendToEx,
      onStartAttach: handleStartAttach,
      containerStyle: {
        minHeight: handZoneMinHeight,
        ...(isMobileLayout ? { flexWrap: 'nowrap' as const, overflowX: 'auto' as const, justifyContent: 'flex-start' } : {}),
      },
    },
    activeMenuId: activeZoneActions,
    onActiveMenuChange: setActiveZoneActions,
    showActionMenu: gameState.gameStatus === 'playing' && canInteract && getCards(`hand-${topRole}`).length > 0,
    actionMenu: topHandRandomDiscardZoneActions,
    showMulliganButton: gameState.gameStatus === 'preparing' && gameState[topRole].initialHandDrawn && !gameState[topRole].mulliganUsed,
    mulliganLabel: t('gameBoard.preparation.mulliganButton', { label: topLabel }),
    onOpenMulligan: () => openMulliganModal(topRole),
    mulliganButtonStyle: soloMulliganButtonStyle,
  };
  const topReadOnlyHandSectionProps = {
    columns: boardColumns,
    width: boardContentWidth,
    centerWidth: centerZoneWidth,
    rowGap: boardRowGap,
    justifyCenter: true,
    zoneProps: {
      id: `hand-${topRole}`,
      label: t('gameBoard.zones.hand', { label: topLabel }),
      cards: getCards(`hand-${topRole}`),
      cardDetailLookup,
      hideCards: shouldHideTopHand,
      layout: 'horizontal' as const,
      onInspectCard: handleInspectCard,
      isProtected: true,
      lockCards: isPreparingHandMoveLocked,
      viewerRole,
      containerStyle: {
        minHeight: handZoneMinHeight,
        ...(isMobileLayout ? { flexWrap: 'nowrap' as const, overflowX: 'auto' as const, justifyContent: 'flex-start' } : {}),
      },
    },
    activeMenuId: activeZoneActions,
    onActiveMenuChange: setActiveZoneActions,
    showActionMenu: gameState.gameStatus === 'playing' && canInteract && getCards(`hand-${topRole}`).length > 0,
    actionMenu: topHandRandomDiscardZoneActions,
  };
  const bottomHandSectionProps = {
    width: boardContentWidth,
    zoneProps: {
      id: `hand-${bottomRole}`,
      label: t('gameBoard.zones.hand', { label: bottomLabel }),
      cards: getCards(`hand-${bottomRole}`),
      cardDetailLookup,
      onInspectCard: handleInspectCard,
      onCardTapAction: attachSourceCard ? handleCardTapForAttach : undefined,
      onModifyCounter: handleModifyCounter,
      onSendToBottom: handleSendToBottom,
      onSendToTop: handleSendToTop,
      onBanish: handleBanish,
      onCemetery: handleSendToCemetery,
      onPlayToField: handlePlayToField,
      onSendToEx: handleSendToEx,
      onStartAttach: handleStartAttach,
      isProtected: true,
      lockCards: isPreparingHandMoveLocked,
      viewerRole,
      containerStyle: {
        minHeight: bottomHandZoneMinHeight,
        ...(isMobileLayout ? { flexWrap: 'nowrap' as const, overflowX: 'auto' as const, justifyContent: 'flex-start' } : {}),
      },
      isDebug,
    },
    activeMenuId: activeZoneActions,
    onActiveMenuChange: setActiveZoneActions,
    showRandomDiscardMenu: isSoloMode && gameState.gameStatus === 'playing' && canInteract && getCards(`hand-${bottomRole}`).length > 0,
    randomDiscardZoneActions: bottomHandRandomDiscardZoneActions,
    showRevealHandMenu: !isSoloMode && gameState.gameStatus === 'playing' && canInteract && getCards(`hand-${bottomRole}`).length > 0,
    revealHandZoneActions: bottomHandRevealZoneActions,
    showMulliganButton: gameState.gameStatus === 'preparing' && canInteract && gameState[bottomRole].initialHandDrawn && !gameState[bottomRole].mulliganUsed,
    mulliganLabel: t('game.mulligan_desc', { label: isSoloMode ? bottomLabel : t('game.mulligan_action') }),
    onOpenMulligan: () => openMulliganModal(bottomRole),
    mulliganButtonStyle: bottomMulliganButtonStyle,
  };
  const bottomControlsPanelProps = {
    label: bottomLabel,
    panelWidth: sidePanelWidth,
    gameStatus: gameState.gameStatus,
    importDeckLabel: isSoloMode
      ? t('gameBoard.zones.importDeck', { label: bottomLabel })
      : t('gameBoard.zones.importDeckJson'),
    loadSavedDeckLabel: isSoloMode
      ? t('gameBoard.zones.loadFromMyDecks', { label: bottomLabel })
      : t('gameBoard.zones.loadFromMyDecksGeneric'),
    canImportDeck: canImportBottomDeck,
    canOpenSavedDeckPicker,
    savedDeckPickerUnavailableTitle,
    onDeckUpload: (event: React.ChangeEvent<HTMLInputElement>) => handleDeckUpload(event, bottomRole),
    onOpenSavedDeckPicker: () => openSavedDeckPicker(bottomRole),
    canUsePlayingActions: gameState.gameStatus === 'playing' && canInteract,
    playingActionsDisabledTitle: interactionBlockedTitle ?? t('gameBoard.board.availableDuringGameOnly'),
    onDraw: () => drawCard(bottomRole),
    onMill: () => millCard(bottomRole),
    onMoveTopCardToEx: () => moveTopCardToEx(bottomRole),
    onMoveTopCardToBanish: () => moveTopCardToBanish(bottomRole),
    drawButtonBackground: 'var(--accent-primary)',
    canOpenTokenSpawn: canInteract,
    onOpenTokenSpawn: () => openTokenSpawnModal(bottomRole),
    spawnButtonBackground: 'var(--accent-secondary)',
    undoMoveButton: renderUndoMoveButton(bottomRole),
    trackerTestId: `player-tracker-${bottomRole}`,
    playerState: gameState[bottomRole],
    onAdjustStat: (stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo', delta: number) => handleStatChange(bottomRole, stat, delta),
    forceExpandedTracker: false,
    containerStyle: { marginLeft: bottomPanelMarginLeft },
  };
  const savedDeckPickerDialogProps = savedDeckImportTargetRole && savedDeckPickerTargetLabel
    ? {
        isLoading: isSavedDeckLoading, loadFailed: savedDeckLoadFailed,
        onRefreshCatalog: retryCatalog, isRefreshingCatalog,
        targetLabel: savedDeckPickerTargetLabel,
        savedDeckSearch,
        filteredSavedDeckOptions,
        onBackdropClick: (event: React.MouseEvent<HTMLElement>) => {
          if (!shouldDismissModalOnBackdropClick(event.target, event.currentTarget)) return;
          closeSavedDeckPicker();
        },
        onClose: closeSavedDeckPicker,
        onSearchChange: setSavedDeckSearch,
        onLoadDeck: handleSavedDeckImport,
      }
    : null;
  const evolveAutoAttachDialogProps = evolveAutoAttachSelection
    ? {
        selection: evolveAutoAttachSelection,
        cardDetailLookup,
        onBackdropClick: (event: React.MouseEvent<HTMLElement>) => {
          if (!shouldDismissModalOnBackdropClick(event.target, event.currentTarget)) return;
          cancelEvolveAutoAttachSelection();
        },
        onCancel: cancelEvolveAutoAttachSelection,
        onConfirm: confirmEvolveAutoAttachSelection,
      }
    : null;
  const searchShuffleConfirmDialogProps = searchShuffleTargetRole
    ? {
        targetLabel: searchShuffleTargetRole === topRole ? topLabel : bottomLabel,
        onCancel: () => setSearchShuffleTargetRole(null),
        onConfirm: () => {
          handleShuffleDeck(searchShuffleTargetRole);
          setSearchShuffleTargetRole(null);
        },
      }
    : null;
  const cardInspectorSectionProps = {
    catalogStatus,
    detailStatus: selectedInspectorCard ? getDetailStatus(selectedInspectorCard.cardId) : undefined,
    onRetryDetails: retryDetails, onRefreshCatalog: retryCatalog, isRefreshingCatalog, catalogRefreshFailed,
    ref: inspectorRef,
    selectedInspectorCard,
    selectedInspectorDetail,
    inspectorPresentation,
    inspectorPopoverStyle,
    onClose: closeInspector,
  };

  const renderTopLeaderZoneSection = () => (
    <GameBoardLeaderZoneSection
      playerRole={topRole}
      label={topLabel}
      zoneLabel={t('gameBoard.board.leaderLabel', { label: topLabel })}
      side="right"
      isInline={true}
      zoneMinHeight={leaderZoneMinHeight}
      leaderCards={getCards(`leader-${topRole}`)}
      sideZoneWidth={sideZoneWidth}
      cardDetailLookup={cardDetailLookup}
      getHighlightTone={getAttackHighlightTone}
      onInspectCard={handleInspectCard}
      viewerRole={viewerRole}
      attackSourceController={attackSourceController}
      isDebug={isDebug}
      searchLabel={t('gameBoard.board.search')}
      onSearch={openSearchZone}
    />
  );

  const renderBottomLeaderZoneSection = () => (
    <GameBoardLeaderZoneSection
      playerRole={bottomRole}
      label={bottomLabel}
      zoneLabel={t('gameBoard.board.leaderLabel', { label: bottomLabel })}
      side="left"
      isInline={true}
      zoneMinHeight={leaderZoneMinHeight}
      leaderCards={getCards(`leader-${bottomRole}`)}
      sideZoneWidth={sideZoneWidth}
      cardDetailLookup={cardDetailLookup}
      getHighlightTone={getAttackHighlightTone}
      onInspectCard={handleInspectCard}
      viewerRole={viewerRole}
      attackSourceController={attackSourceController}
      isDebug={isDebug}
      searchLabel={t('gameBoard.board.search')}
      onSearch={openSearchZone}
    />
  );

  return (
    <DndContext sensors={dragSensors} onDragStart={() => { draggingRef.current = true; }} onDragCancel={() => { draggingRef.current = false; }} onDragEnd={(event) => {
      draggingRef.current = false;
      if (!canInteract || multiSelection.active) return;
      handleDragEnd(event);
    }}>
      <GameBoardMultiSelectionContext.Provider value={selectionContext}>
      <GameBoardInputProfileProvider value={inputProfile} boardDensity={boardDensity} layoutProfile={layoutProfile}>
        <div
          data-layout-profile={layoutProfile}
          data-input-profile={inputProfile}
          data-board-density={boardDensity}
          style={{
            padding: boardShellPadding,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            gap: boardShellGap,
            overflow: 'hidden',
          }}
        >

        <GameBoardCatalogStatus status={catalogStatus} onRetry={retryCatalog} />
        <GameBoardHeader
          isTabletLayout={isTabletLayout}
          isMobileLayout={isMobileLayout}
          isMobileCompactLandscape={isMobileCompactLandscape}
          room={room}
          isSoloMode={isSoloMode}
          isHost={isHost}
          isSpectator={isSpectator}
          role={role}
          status={status}
          connectionState={connectionState}
          spectatorCount={spectatorCount}
          maxSpectatorConnections={maxSpectatorConnections}
          connectionBadgeTone={connectionBadgeTone}
          isRoomCopied={isRoomCopied}
          gameState={gameState}
          topRole={topRole}
          bottomRole={bottomRole}
          currentTurnLabel={currentTurnLabel}
          isBottomTurnActive={isBottomTurnActive}
          canShowUndoTurn={canShowUndoTurn}
          onCopyRoomId={handleCopyRoomId}
          onReconnect={attemptReconnect}
          onSetInitialTurnOrder={handleSetInitialTurnOrder}
          onDrawInitialHand={handleDrawInitialHand}
          onToggleReady={handleToggleReady}
          onStartGame={handleStartGame}
          onTossCoin={handlePureCoinFlip}
          onRollDice={handleRollDice}
          onOpenUndo={() => setShowUndoConfirm(true)}
          canResetGame={canResetGame}
          onOpenReset={() => setShowResetConfirm(true)}
          onPhaseChange={setPhase}
          eventHistory={eventHistory}
          selectionActive={multiSelection.active}
          selectionControls={
            <GameBoardMultiSelectionBar active={multiSelection.active} canStart={multiSelection.canStart}
              count={multiSelection.targets.length} onStart={startMultiSelection} onClear={multiSelection.clear}
              onFinish={multiSelection.finish} canRun={multiSelection.canRun} onRun={multiSelection.run} />
          }
        />

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

        {/* Board Playmat */}
        <div
          data-testid="board-playmat"
            data-attack-mode-active={String(Boolean(attackSourceCard))}
            data-attack-source-card-id={attackSourceCard?.id ?? ''}
            data-attach-mode-active={String(Boolean(attachSourceCard))}
            data-attach-source-card-id={attachSourceCard?.id ?? ''}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: playmatGap,
              background: 'url("https://shadowverse-evolve.com/wordpress/wp-content/themes/shadowverse-evolve-release_v0/assets/images/common/bg.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 'var(--radius-lg)',
              padding: playmatPadding,
              overflowY: 'auto',
              overflowX: 'hidden',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >

          {(attachSourceCard || attackSourceCard) && (
            <div
              data-testid="board-target-selection-banner"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                width: '100%',
                maxWidth: '640px',
                padding: '0.35rem 0.65rem',
                borderRadius: '999px',
                background: attachSourceCard
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(5, 150, 105, 0.92))'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.92), rgba(185, 28, 28, 0.92))',
                color: '#fff',
                fontSize: '0.76rem',
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                zIndex: 35,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachSourceCard
                  ? `${t('gameBoard.card.attachMode')} — ${attachSourceCard.name}`
                  : `${t('gameBoard.card.attacking')} — ${attackSourceCard?.name ?? ''}`}
              </span>
              <button
                type="button"
                data-testid="cancel-target-selection-button"
                onClick={() => {
                  clearAttachSource();
                  clearAttackSource();
                }}
                style={{
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {t('common.buttons.cancel')}
              </button>
            </div>
          )}

          {isMobileLayout && (
            <div
              data-testid="mobile-solo-viewpoint-tabs"
              style={{
                display: 'flex',
                gap: '0.35rem',
                width: '100%',
                justifyContent: 'center',
                padding: '0.2rem',
                background: 'rgba(15, 23, 42, 0.72)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
              }}
            >
              {(['all', 'bottom', 'top', 'battle'] as const).map((viewKey) => {
                const isSelected = mobileSoloViewpoint === viewKey;
                const label = viewKey === 'all'
                  ? 'ALL'
                  : viewKey === 'battle'
                    ? '⚔️ Battle'
                    : viewKey === 'bottom'
                      ? bottomLabel
                      : topLabel;
                return (
                  <button
                    key={viewKey}
                    type="button"
                    data-testid={`mobile-viewpoint-${viewKey}`}
                    onClick={() => setMobileSoloViewpoint(viewKey)}
                    aria-pressed={isSelected}
                    style={{
                      flex: 1,
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      background: isSelected ? 'rgba(59, 130, 246, 0.28)' : 'transparent',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {isMobileLayout && (mobileSoloViewpoint === 'bottom' || mobileSoloViewpoint === 'battle') && (
            <div
              data-testid="mobile-opponent-summary-bar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.4rem',
                width: '100%',
                padding: '0.35rem 0.6rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(15, 23, 42, 0.86)',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                color: '#f8fafc',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              <span style={{ color: '#93c5fd', fontWeight: 800 }}>{topLabel}</span>
              <span>HP {gameState[topRole].hp}</span>
              <span>PP {gameState[topRole].pp}/{gameState[topRole].maxPp}</span>
              <span>EP {gameState[topRole].ep} / SEP {gameState[topRole].sep}</span>
              <span>Hand {getCards(`hand-${topRole}`).length}</span>
              <button
                type="button"
                data-testid="mobile-opponent-summary-ex"
                disabled={!canView}
                onClick={() => openSearchZone(`ex-${topRole}`, t('gameBoard.zones.exArea', { label: topLabel }))}
                style={{
                  padding: '0.12rem 0.42rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#a7f3d0',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: canView ? 'pointer' : 'not-allowed',
                }}
              >
                EX {getCards(`ex-${topRole}`).length}
              </button>
              <button
                type="button"
                data-testid="mobile-opponent-summary-cemetery"
                disabled={!canView}
                onClick={() => openSearchZone(`cemetery-${topRole}`, t('gameBoard.zones.cemetery', { label: topLabel }))}
                style={{
                  padding: '0.12rem 0.42rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(96, 165, 250, 0.45)',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#bfdbfe',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: canView ? 'pointer' : 'not-allowed',
                }}
              >
                Cemetery {getCards(`cemetery-${topRole}`).length}
              </button>
              <button
                type="button"
                data-testid="mobile-opponent-summary-banish"
                disabled={!canView}
                onClick={() => openSearchZone(`banish-${topRole}`, t('gameBoard.zones.banish', { label: topLabel }))}
                style={{
                  padding: '0.12rem 0.42rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  background: 'rgba(148, 163, 184, 0.14)',
                  color: '#e2e8f0',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: canView ? 'pointer' : 'not-allowed',
                }}
              >
                Banish {getCards(`banish-${topRole}`).length}
              </button>
              {mobileSoloViewpoint === 'battle' && (
                <button
                  type="button"
                  data-testid="mobile-battle-top-secondary-toggle"
                  aria-expanded={!isBattleTopSecondaryCollapsed}
                  onClick={() => setBattleTopSecondaryOverride(isBattleTopSecondaryCollapsed ? 'expanded' : 'collapsed')}
                  style={{
                    padding: '0.12rem 0.42rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    background: 'rgba(14, 165, 233, 0.18)',
                    color: '#e0f2fe',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {isBattleTopSecondaryCollapsed ? '▼ EX Row' : '▲ Hide EX Row'}
                </button>
              )}
            </div>
          )}

          {/* OPPONENT BOARD */}
          <div
            data-testid="board-section-top"
            data-turn-active={String(shouldHighlightTopBoard)}
            style={{
              ...activeBoardSectionStyle(shouldHighlightTopBoard),
              padding: boardSectionPadding,
              gap: boardSectionGap,
              opacity: 0.9,
              display: isMobileLayout && mobileSoloViewpoint === 'bottom' ? 'none' : undefined,
            }}
          >
            {isSoloMode ? (
              <div style={{ display: 'grid', gridTemplateColumns: boardShellColumns, columnGap: boardShellColumnGap, alignItems: 'stretch', justifyContent: 'center', ...boardGridPresentationStyle }}>
                <GameBoardPlayerControlsPanel
                  {...topControlsPanelProps}
                  middleControls={
                    <GameBoardEndTurnSection
                      playerRole={topRole}
                      label={topLabel}
                      background="#fbbf24"
                      turnPlayer={gameState.turnPlayer}
                      gameStatus={gameState.gameStatus}
                      canInteract={canInteract}
                      disabledTitle={interactionBlockedTitle ?? t('gameBoard.board.endTurnDisabled')}
                      onEndTurn={endTurn}
                    />
                  }
                  undoMoveButton={renderUndoMoveButton(topRole)}
                  readOnlyTracker={isSpectator}
                />

                <div style={{ width: `${boardContentWidth}px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: boardColumnStackGap, alignItems: 'flex-start' }}>
                  <div
                    data-testid="top-board-hand-row"
                    style={{
                      display: isMobileLayout && mobileSoloViewpoint === 'battle' ? 'none' : 'flex',
                      width: '100%',
                    }}
                  >
                    <GameBoardTopHandSection {...topSoloHandSectionProps} />
                  </div>

                  <div
                    data-testid="top-board-upper-rows"
                    style={{
                      display: isMobileLayout && mobileSoloViewpoint === 'battle' && isBattleTopSecondaryCollapsed
                        ? 'none'
                        : 'flex',
                      flexDirection: 'column',
                      gap: boardColumnStackGap,
                      width: '100%',
                    }}
                  >
                    <GameBoardBoardRow columns={boardColumns} width={boardContentWidth} rowGap={boardRowGap}>
                      <GameBoardSearchableStackSection
                        zoneProps={{ id: `cemetery-${topRole}`, label: t('gameBoard.zones.cemetery', { label: topLabel }), cards: getCards(`cemetery-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                        searchLabel={t('gameBoard.zones.search')}
                        onSearch={() => openSearchZone(`cemetery-${topRole}`, t('gameBoard.zones.cemetery', { label: topLabel }))}
                        searchTitle={interactionBlockedTitle}
                        isSearchInteractive={canView}
                        useTapToOpenActions={isTabletCompactBoard}
                        actionPlacement={zoneActionPlacement}
                      />
                      <Zone
                        id={`ex-${topRole}`}
                        label={t('gameBoard.zones.exArea', { label: topLabel })}
                        cards={getCards(`ex-${topRole}`)}
                        cardStatLookup={cardStatLookup}
                        cardDetailLookup={cardDetailLookup}
                        onInspectCard={handleInspectCard}
                        onCardTapAction={attachSourceCard ? handleCardTapForAttach : undefined}
                        isProtected={false}
                        viewerRole={viewerRole}
                        onModifyCounter={handleModifyCounter}
                        onModifyGenericCounter={handleModifyGenericCounter}
                        onSendToBottom={handleSendToBottom}
                        onSendToTop={handleSendToTop}
                        onBanish={handleBanish}
                        onReturnEvolve={handleReturnEvolve}
                        onCemetery={handleSendToCemetery}
                        onPlayToField={(cardId) => handlePlayToField(cardId, topRole)}
                        onSendToHand={handleSendToHand}
                        onStartAttach={handleStartAttach}
                        containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: stackZoneMinHeight, flex: 'none', width: `${centerZoneWidth}px` }}
                        />
                      <GameBoardSearchableStackSection
                        zoneProps={{ id: `banish-${topRole}`, label: t('gameBoard.zones.banish', { label: topLabel }), cards: getCards(`banish-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                        searchLabel={t('gameBoard.zones.search')}
                        onSearch={() => openSearchZone(`banish-${topRole}`, t('gameBoard.zones.banish', { label: topLabel }))}
                        searchTitle={interactionBlockedTitle}
                        isSearchInteractive={canView}
                        useTapToOpenActions={isTabletCompactBoard}
                        actionPlacement={zoneActionPlacement}
                      />
                    </GameBoardBoardRow>
                  </div>

                  <GameBoardBoardRow
                    columns={boardColumns}
                    width={boardContentWidth}
                    rowGap={boardRowGap}
                  >
                      <GameBoardMainDeckSection
                        zoneProps={{ id: `mainDeck-${topRole}`, label: t('gameBoard.zones.mainDeck', { label: topLabel }), cards: getCards(`mainDeck-${topRole}`), cardDetailLookup, layout: 'stack', isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                        menuId={topMainDeckZoneActions.menuId}
                        activeMenuId={activeZoneActions}
                        actionsLabel={topMainDeckZoneActions.actionsLabel}
                        actions={topMainDeckZoneActions.actions}
                        direction="up"
                        onActiveMenuChange={setActiveZoneActions}
                        useTapToOpenActions={isTabletCompactBoard}
                        actionPlacement={zoneActionPlacement}
                      />
                      <Zone
                        id={`field-${topRole}`}
                        label={t('gameBoard.zones.field', { label: topLabel })}
                        cards={getCards(`field-${topRole}`)}
                        cardStatLookup={cardStatLookup}
                        cardDetailLookup={cardDetailLookup}
                        getHighlightTone={getAttackHighlightTone}
                        onInspectCard={handleInspectCard}
                        onCardTapAction={attachSourceCard ? handleCardTapForAttach : undefined}
                        onAttack={isSoloMode && gameState.turnPlayer === topRole ? handleStartAttack : undefined}
                        onTap={toggleTap}
                        onModifyCounter={handleModifyCounter}
                        onModifyGenericCounter={handleModifyGenericCounter}
                        onSendToBottom={handleSendToBottom}
                        onSendToTop={handleSendToTop}
                        onBanish={handleBanish}
                        onReturnEvolve={handleReturnEvolve}
                        onCemetery={handleSendToCemetery}
                        onPlayToField={(cardId) => handlePlayToField(cardId, topRole)}
                        onSendToHand={handleSendToHand}
                        onSendToEx={handleSendToEx}
                        onStartAttach={handleStartAttach}
                        disableQuickActionsForCard={shouldDisableQuickActionsForAttackTarget}
                        viewerRole={viewerRole}
                        containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: fieldZoneMinHeight, width: `${centerZoneWidth}px`, flex: 'none' }}
                        isDebug={isDebug}
                      />
                      <GameBoardSearchableStackSection
                        zoneProps={{ id: `evolveDeck-${topRole}`, label: t('gameBoard.zones.evolveDeck', { label: topLabel }), cards: getCards(`evolveDeck-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                        searchLabel={t('gameBoard.zones.search')}
                        onSearch={() => openSearchZone(`evolveDeck-${topRole}`, t('gameBoard.zones.evolveDeck', { label: topLabel }))}
                        searchTitle={interactionBlockedTitle}
                        isSearchInteractive={canView}
                        useTapToOpenActions={isTabletCompactBoard}
                        actionPlacement={zoneActionPlacement}
                      />
                  </GameBoardBoardRow>
                </div>
                <div style={{ width: `${sidePanelWidth}px`, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
                  {renderTopLeaderZoneSection()}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: boardShellColumns, columnGap: boardShellColumnGap, alignItems: 'stretch', justifyContent: 'center', ...boardGridPresentationStyle }}>
                <div style={{ width: `${topPanelWidth}px`, alignSelf: 'end' }}>
                  <GameBoardReadOnlyStatusSection
                    label={topLabel}
                    playerState={gameState[topRole]}
                  />
                </div>

                <div style={{ width: `${boardContentWidth}px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: boardColumnStackGap, alignItems: 'flex-start' }}>
                  <div
                    data-testid="top-board-hand-row"
                    style={{
                      display: isMobileLayout && mobileSoloViewpoint === 'battle' ? 'none' : 'flex',
                      width: '100%',
                    }}
                  >
                    <GameBoardTopHandSection {...topReadOnlyHandSectionProps} />
                  </div>

                  <div
                    data-testid="top-board-upper-rows"
                    style={{
                      display: isMobileLayout && mobileSoloViewpoint === 'battle' && isBattleTopSecondaryCollapsed
                        ? 'none'
                        : 'flex',
                      flexDirection: 'column',
                      gap: boardColumnStackGap,
                      width: '100%',
                    }}
                  >
                    <GameBoardBoardRow columns={boardColumns} width={boardContentWidth} rowGap={boardRowGap}>
                      <GameBoardSearchableStackSection
                        zoneProps={{ id: `cemetery-${topRole}`, label: t('gameBoard.zones.cemetery', { label: topLabel }), cards: getCards(`cemetery-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                        searchLabel={t('gameBoard.zones.search')}
                        onSearch={() => openSearchZone(`cemetery-${topRole}`, t('gameBoard.zones.cemetery', { label: topLabel }))}
                        useTapToOpenActions={isTabletCompactBoard}
                        actionPlacement={zoneActionPlacement}
                      />
                      <Zone
                        id={`ex-${topRole}`}
                        label={t('gameBoard.zones.exArea', { label: topLabel })}
                        cards={getCards(`ex-${topRole}`)}
                        cardStatLookup={cardStatLookup}
                        cardDetailLookup={cardDetailLookup}
                        onInspectCard={handleInspectCard}
                        onCardTapAction={attachSourceCard ? handleCardTapForAttach : undefined}
                        isProtected={false}
                        viewerRole={viewerRole}
                        containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: stackZoneMinHeight, flex: 'none', width: `${centerZoneWidth}px` }}
                      />
                      <GameBoardSearchableStackSection
                        zoneProps={{ id: `banish-${topRole}`, label: t('gameBoard.zones.banish', { label: topLabel }), cards: getCards(`banish-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                        searchLabel={t('gameBoard.zones.search')}
                        onSearch={() => openSearchZone(`banish-${topRole}`, t('gameBoard.zones.banish', { label: topLabel }))}
                        useTapToOpenActions={isTabletCompactBoard}
                        actionPlacement={zoneActionPlacement}
                      />
                    </GameBoardBoardRow>
                  </div>

                  <GameBoardBoardRow
                    columns={boardColumns}
                    width={boardContentWidth}
                    rowGap={boardRowGap}
                  >
                      <GameBoardMainDeckSection
                        zoneProps={{ id: `mainDeck-${topRole}`, label: t('gameBoard.zones.mainDeck', { label: topLabel }), cards: getCards(`mainDeck-${topRole}`), cardDetailLookup, layout: 'stack', isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                        menuId={topReadOnlyMainDeckZoneActions.menuId}
                        activeMenuId={activeZoneActions}
                        actionsLabel={topReadOnlyMainDeckZoneActions.actionsLabel}
                        actions={isSpectator ? topReadOnlyMainDeckZoneActions.actions : undefined}
                        direction="up"
                        onActiveMenuChange={setActiveZoneActions}
                        useTapToOpenActions={isTabletCompactBoard}
                        actionPlacement={zoneActionPlacement}
                      />
                      <Zone
                        id={`field-${topRole}`}
                        label={t('gameBoard.zones.field', { label: topLabel })}
                        cards={getCards(`field-${topRole}`)}
                        cardStatLookup={cardStatLookup}
                        cardDetailLookup={cardDetailLookup}
                        getHighlightTone={getAttackHighlightTone}
                        onInspectCard={handleInspectCard}
                        onCardTapAction={attachSourceCard ? handleCardTapForAttach : undefined}
                        onTap={toggleTap}
                        onModifyCounter={handleModifyCounter}
                        onCemetery={handleSendToCemetery}
                        disableQuickActionsForCard={shouldDisableQuickActionsForAttackTarget}
                        viewerRole={viewerRole}
                        containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: fieldZoneMinHeight, width: `${centerZoneWidth}px`, flex: 'none' }}
                        isDebug={isDebug}
                      />
                      <GameBoardSearchableStackSection
                        zoneProps={{ id: `evolveDeck-${topRole}`, label: t('gameBoard.zones.evolveDeck', { label: topLabel }), cards: getCards(`evolveDeck-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                        searchLabel={t('common.buttons.search')}
                        onSearch={() => openSearchZone(`evolveDeck-${topRole}`, t('gameBoard.zones.evolveDeck', { label: topLabel }))}
                        useTapToOpenActions={isTabletCompactBoard}
                        actionPlacement={zoneActionPlacement}
                      />
                  </GameBoardBoardRow>
                </div>
                <div style={{ width: `${sidePanelWidth}px`, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
                  {renderTopLeaderZoneSection()}
                </div>
              </div>
            )}
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: boardSectionDividerMargin }} />

          {/* MY BOARD */}
          <div
            data-testid="board-section-bottom"
            data-turn-active={String(isBottomTurnActive)}
            style={{
              ...activeBoardSectionStyle(isBottomTurnActive),
              padding: boardSectionPadding,
              gap: boardSectionGap,
              display: isMobileLayout && mobileSoloViewpoint === 'top' ? 'none' : undefined,
            }}
          >
		            <div style={{ display: 'grid', gridTemplateColumns: boardShellColumns, columnGap: boardShellColumnGap, alignItems: 'stretch', justifyContent: 'center', ...boardGridPresentationStyle }}>
                <div style={{ width: `${topPanelWidth}px`, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                  {renderBottomLeaderZoneSection()}
                </div>
		              <div style={{ width: `${boardContentWidth}px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: boardColumnStackGap, alignItems: 'flex-start' }}>
	                <GameBoardBoardRow
                    columns={boardColumns}
                    width={boardContentWidth}
                    rowGap={boardRowGap}
                  >
                  <GameBoardSearchableStackSection
                    zoneProps={{ id: `evolveDeck-${bottomRole}`, label: t('gameBoard.zones.evolveDeck', { label: bottomLabel }), cards: getCards(`evolveDeck-${bottomRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                    searchLabel={t('common.buttons.search')}
                    onSearch={() => openSearchZone(`evolveDeck-${bottomRole}`, t('gameBoard.zones.evolveDeck', { label: bottomLabel }))}
                    searchTitle={interactionBlockedTitle}
                    isSearchInteractive={canView}
                    useTapToOpenActions={isTabletCompactBoard}
                    actionPlacement={zoneActionPlacement}
                  />
                  <Zone id={`field-${bottomRole}`} label={t('gameBoard.zones.field', { label: bottomLabel })} cards={getCards(`field-${bottomRole}`)} cardStatLookup={cardStatLookup} cardDetailLookup={cardDetailLookup} getHighlightTone={getAttackHighlightTone} onInspectCard={handleInspectCard} onCardTapAction={attachSourceCard ? handleCardTapForAttach : undefined} onAttack={gameState.turnPlayer === bottomRole ? handleStartAttack : undefined} onTap={toggleTap} onModifyCounter={handleModifyCounter} onModifyGenericCounter={handleModifyGenericCounter} onSendToBottom={handleSendToBottom} onSendToTop={handleSendToTop} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} onSendToHand={handleSendToHand} onSendToEx={handleSendToEx} onStartAttach={handleStartAttach} disableQuickActionsForCard={shouldDisableQuickActionsForAttackTarget} viewerRole={viewerRole} containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: fieldZoneMinHeight, width: `${centerZoneWidth}px`, flex: 'none' }} isDebug={isDebug} />
                  <GameBoardMainDeckSection
                    zoneProps={{ id: `mainDeck-${bottomRole}`, label: t('gameBoard.zones.mainDeck', { label: bottomLabel }), cards: getCards(`mainDeck-${bottomRole}`), cardDetailLookup, layout: 'stack', isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                    menuId={bottomMainDeckZoneActions.menuId}
                    activeMenuId={activeZoneActions}
                    actionsLabel={bottomMainDeckZoneActions.actionsLabel}
                    actions={bottomMainDeckZoneActions.actions}
                    onActiveMenuChange={setActiveZoneActions}
                    useTapToOpenActions={isTabletCompactBoard}
                    actionPlacement={zoneActionPlacement}
                  />
                  </GameBoardBoardRow>

                  {isMobileLayout && mobileSoloViewpoint === 'battle' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.4rem',
                        width: '100%',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(15, 23, 42, 0.72)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        fontSize: '0.68rem',
                        color: '#cbd5e1',
                      }}
                    >
                      <button
                        type="button"
                        data-testid="mobile-battle-bottom-secondary-toggle"
                        aria-expanded={!isBattleBottomSecondaryCollapsed}
                        onClick={() => setIsBattleBottomSecondaryCollapsed((prev) => !prev)}
                        style={{
                          padding: '0.14rem 0.45rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          background: 'rgba(14, 165, 233, 0.18)',
                          color: '#e0f2fe',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {isBattleBottomSecondaryCollapsed
                          ? `▼ EX (${getCards(`ex-${bottomRole}`).length}) / Cemetery (${getCards(`cemetery-${bottomRole}`).length}) / Banish (${getCards(`banish-${bottomRole}`).length})`
                          : '▲ Hide EX / Cemetery / Banish'}
                      </button>
                      {isBattleBottomSecondaryCollapsed && (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            disabled={!canView}
                            onClick={() => openSearchZone(`cemetery-${bottomRole}`, t('gameBoard.zones.cemetery', { label: bottomLabel }))}
                            style={{
                              padding: '0.12rem 0.4rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(96, 165, 250, 0.4)',
                              background: 'rgba(59, 130, 246, 0.2)',
                              color: '#bfdbfe',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              cursor: canView ? 'pointer' : 'not-allowed',
                            }}
                          >
                            Cemetery {getCards(`cemetery-${bottomRole}`).length}
                          </button>
                          <button
                            type="button"
                            disabled={!canView}
                            onClick={() => openSearchZone(`banish-${bottomRole}`, t('gameBoard.zones.banish', { label: bottomLabel }))}
                            style={{
                              padding: '0.12rem 0.4rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(148, 163, 184, 0.35)',
                              background: 'rgba(148, 163, 184, 0.14)',
                              color: '#e2e8f0',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              cursor: canView ? 'pointer' : 'not-allowed',
                            }}
                          >
                            Banish {getCards(`banish-${bottomRole}`).length}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

	                <div
                    data-testid="bottom-board-row-secondary-wrap"
                    style={{
                      marginTop: bottomBoardRowSecondaryMarginTop,
                      display: isMobileLayout && mobileSoloViewpoint === 'battle' && isBattleBottomSecondaryCollapsed
                        ? 'none'
                        : undefined,
                    }}
                  >
                  <GameBoardBoardRow columns={boardColumns} width={boardContentWidth} rowGap={boardRowGap}>
                  <GameBoardSearchableStackSection
                    zoneProps={{ id: `banish-${bottomRole}`, label: t('gameBoard.zones.banish', { label: bottomLabel }), cards: getCards(`banish-${bottomRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, onModifyCounter: handleModifyCounter, onSendToBottom: handleSendToBottom, onSendToTop: handleSendToTop, onCemetery: handleSendToCemetery, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                    searchLabel={t('common.buttons.search')}
                    onSearch={() => openSearchZone(`banish-${bottomRole}`, t('gameBoard.zones.banish', { label: bottomLabel }))}
                    searchTitle={interactionBlockedTitle}
                    isSearchInteractive={canView}
                    useTapToOpenActions={isTabletCompactBoard}
                    actionPlacement={zoneActionPlacement}
                  />
		                  <Zone id={`ex-${bottomRole}`} label={t('gameBoard.zones.exArea', { label: bottomLabel })} cards={getCards(`ex-${bottomRole}`)} cardStatLookup={cardStatLookup} cardDetailLookup={cardDetailLookup} onInspectCard={handleInspectCard} onCardTapAction={attachSourceCard ? handleCardTapForAttach : undefined} onModifyCounter={handleModifyCounter} onModifyGenericCounter={handleModifyGenericCounter} onSendToBottom={handleSendToBottom} onSendToTop={handleSendToTop} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} onSendToHand={handleSendToHand} onStartAttach={handleStartAttach} viewerRole={viewerRole} containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: stackZoneMinHeight, flex: 'none', width: `${centerZoneWidth}px` }} isDebug={isDebug} />
                  <GameBoardSearchableStackSection
                    zoneProps={{ id: `cemetery-${bottomRole}`, label: t('gameBoard.zones.cemetery', { label: bottomLabel }), cards: getCards(`cemetery-${bottomRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, onModifyCounter: handleModifyCounter, onSendToBottom: handleSendToBottom, onSendToTop: handleSendToTop, onBanish: handleBanish, onCemetery: handleSendToCemetery, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: stackZoneMinHeight }, isDebug }}
                    searchLabel={t('common.buttons.search')}
                    onSearch={() => openSearchZone(`cemetery-${bottomRole}`, t('gameBoard.zones.cemetery', { label: bottomLabel }))}
                    searchTitle={interactionBlockedTitle}
                    isSearchInteractive={canView}
                    useTapToOpenActions={isTabletCompactBoard}
                    actionPlacement={zoneActionPlacement}
                  />
	                </GameBoardBoardRow>
                  </div>

	                <GameBoardBottomHandSection {...bottomHandSectionProps} />
              </div>

              {isSpectator ? (
                <div style={{ width: `${sidePanelWidth}px`, boxSizing: 'border-box', marginLeft: bottomPanelMarginLeft }}>
                  <GameBoardReadOnlyStatusSection
                    label={bottomLabel}
                    playerState={gameState[bottomRole]}
                  />
                </div>
              ) : (
                <GameBoardPlayerControlsPanel
                  {...bottomControlsPanelProps}
                  middleControls={
                    <>
                      {canShowEndStopToggle && (
                        <button
                          onClick={() => handleSetEndStop(!isOwnEndStopActive)}
                          className="glass-panel"
                          disabled={!canInteract}
                          title={!canInteract ? interactionBlockedTitle ?? t('gameBoard.board.availableDuringGameOnly') : undefined}
                          aria-pressed={isOwnEndStopActive}
                          style={{
                            padding: '0.28rem 0.45rem',
                            minHeight: '26px',
                            fontSize: '0.74rem',
                            background: isOwnEndStopActive ? '#ef4444' : '#1d4ed8',
                            fontWeight: 'bold',
                            borderRadius: '8px',
                            opacity: canInteract ? 1 : 0.5,
                            cursor: canInteract ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {isOwnEndStopActive
                            ? t('gameBoard.board.endStopOn')
                            : t('gameBoard.board.endStopOff')}
                        </button>
                      )}
                      {isSoloMode ? (
                        <GameBoardEndTurnSection
                          playerRole={bottomRole}
                          label={bottomLabel}
                          background="#f59e0b"
                          turnPlayer={gameState.turnPlayer}
                          gameStatus={gameState.gameStatus}
                          canInteract={canInteract}
                          disabledTitle={interactionBlockedTitle ?? t('gameBoard.board.endTurnDisabled')}
                          onEndTurn={endTurn}
                        />
                      ) : (gameState.turnPlayer === role && gameState.gameStatus === 'playing') && (
                        <button
                          onClick={() => endTurn()}
                          className="glass-panel"
                          disabled={!canInteract || endTurnBlockedByEndStop}
                          title={!canInteract || endTurnBlockedByEndStop ? endTurnDisabledTitle : undefined}
                          aria-label={t('gameBoard.board.endTurnSelf')}
                          style={{
                            padding: endTurnBlockedByEndStop ? '0.28rem 0.45rem' : '0.35rem 0.5rem',
                            minHeight: endTurnBlockedByEndStop ? '36px' : '28px',
                            fontSize: '0.76rem',
                            background: endTurnBlockedByEndStop
                              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(185, 28, 28, 0.55))'
                              : 'linear-gradient(135deg, #f59e0b, #d97706)',
                            border: endTurnBlockedByEndStop ? '1px solid rgba(248, 113, 113, 0.5)' : undefined,
                            color: endTurnBlockedByEndStop ? '#fecaca' : '#0f172a',
                            fontWeight: 800,
                            borderRadius: '8px',
                            boxShadow: endTurnBlockedByEndStop ? 'none' : '0 2px 8px rgba(245, 158, 11, 0.35)',
                            opacity: !canInteract ? 0.5 : 1,
                            cursor: !canInteract || endTurnBlockedByEndStop ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            lineHeight: 1.15,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <span>{t('gameBoard.board.endTurnSelf')}</span>
                          {endTurnBlockedByEndStop && (
                            <span style={{ fontSize: '0.64rem', color: '#fca5a5', fontWeight: 600 }}>
                              {t('gameBoard.board.endStopBlocked', { label: topLabel })}
                            </span>
                          )}
                        </button>
                      )}
                    </>
                  }
                  undoMoveButton={renderUndoMoveButton(bottomRole)}
                />
              )}
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

      {isHandRevealDialogOpen && (
        <GameBoardHandRevealDialog
          title={t('gameBoard.modals.handReveal.title')}
          instructions={t('gameBoard.modals.handReveal.instructions')}
          cards={getCards(`hand-${bottomRole}`)}
          selectedCardIds={selectedHandRevealIds}
          cardDetailLookup={cardDetailLookup}
          cancelLabel={t('common.buttons.cancel')}
          confirmLabel={t('gameBoard.modals.handReveal.confirm')}
          onToggleCard={toggleSelectedHandRevealCard}
          onCancel={closeSelectedHandRevealDialog}
          onConfirm={() => {
            revealSelectedHandCards(selectedHandRevealIds);
            closeSelectedHandRevealDialog();
          }}
        />
      )}

      <CardSearchModal
        isOpen={searchZone !== null}
        onClose={() => setSearchZone(null)}
        title={searchZone?.title || ''}
        zoneId={searchZone?.id}
        allowHandExtraction={gameState.gameStatus === 'playing'}
        readOnly={isSpectator || (searchZone?.id.startsWith('leader-') ?? false)}
        cardDetailLookup={cardDetailLookup}
        cards={searchZone ? (
          (searchZone.id.startsWith('evolveDeck-') && !isSoloMode && !isSpectator && !searchZone.id.endsWith(role)
            ? getCards(searchZone.id).filter(c => !c.isFlipped)
            : getCards(searchZone.id)
          ).slice()
        ) : []}
        onExtractCard={(cardId, destination, revealToOpponent) => handleExtractCard(cardId, destination, searchTargetRole, revealToOpponent)}
        onExtractCards={(cardIds, destination, revealToOpponent) => handleExtractCards(cardIds, destination, searchTargetRole, revealToOpponent)}
        onSendToBottom={handleSendToBottom}
        onSendCardsToBottom={handleSendCardsToBottom}
        onSendToCemetery={handleSendToCemetery}
        onSendCardsToCemetery={handleSendCardsToCemetery}
        onBanish={handleBanish}
        onBanishCards={handleBanishCards}
        onToggleFlip={(cardId) => handleFlipCard(cardId, searchTargetRole)}
        onSetCardFace={(cardId, faceSide) => handleSetCardFace(cardId, faceSide, searchTargetRole)}
        canEditSearchedEvolveDeck={canEditSearchedEvolveDeck({
          searchZoneId: searchZone?.id,
          isSoloMode,
          isSpectator,
          searchTargetRole,
          role,
        })}
        viewerRole={searchTargetRole}
        targetRole={searchTargetRole}
        onRequestMainDeckShuffleConfirm={handleRequestMainDeckShuffleConfirm}
      />

      <TopDeckModal
        isOpen={topDeckCards.length > 0}
        cards={topDeckCards}
        cardDetailLookup={cardDetailLookup}
        handCards={gameState.cards.filter(c => c.zone === `hand-${topDeckTargetRole}`)}
        onConfirm={(results) => handleResolveTopDeck(results, topDeckTargetRole)}
        onCancel={() => setTopDeckCards([])}
      />

      {randomDiscardTargetRole && randomDiscardActorRole && (
        <GameBoardCountDialog
          value={randomDiscardValue}
          title={t('gameBoard.modals.randomDiscard.title', {
            label: randomDiscardTargetRole === topRole ? topLabel : bottomLabel,
          })}
          customLabel={t('gameBoard.modals.randomDiscard.custom')}
          customInputLabel={t('gameBoard.modals.randomDiscard.customInput')}
          confirmLabel={t('gameBoard.modals.randomDiscard.confirm')}
          onValueChange={setRandomDiscardValue}
          onCancel={() => {
            closeRandomDiscardDialog();
          }}
          onConfirm={(selectedValue) => {
            setRandomDiscardValue(selectedValue);
            discardRandomHandCards(randomDiscardTargetRole, selectedValue, randomDiscardActorRole);
            closeRandomDiscardDialog();
          }}
        />
      )}

      {tokenSpawnTargetRole && (
        <GameBoardTokenSpawnDialog
          tokenSpawnOptions={tokenSpawnOptions}
          tokenSpawnCounts={tokenSpawnCounts}
          tokenSpawnDestination={tokenSpawnDestination}
          totalTokenSpawnCount={totalTokenSpawnCount}
          cardDetailLookup={cardDetailLookup}
          onDestinationChange={setTokenSpawnDestination}
          onCountChange={handleTokenSpawnCountChange}
          onQuickSpawnToken={handleQuickTokenSpawn}
          onCancel={closeTokenSpawnModal}
          onConfirm={handleTokenSpawn}
        />
      )}

      {isTopNInputOpen && (
        <GameBoardTopNDialog
          value={topNValue}
          onValueChange={setTopNValue}
          onCancel={() => setIsTopNInputOpen(false)}
          onConfirm={(selectedValue) => {
            setTopNValue(selectedValue);
            handleLookAtTop(selectedValue, topDeckTargetRole);
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
          savedDeckPicker={savedDeckPickerDialogProps}
          evolveAutoAttach={evolveAutoAttachDialogProps}
          searchShuffleConfirm={searchShuffleConfirmDialogProps}
        />
        <GameBoardCardInspectorSection {...cardInspectorSectionProps} />
      </GameBoardInputProfileProvider>
      </GameBoardMultiSelectionContext.Provider>
    </DndContext>
  );
};

export default GameBoard;
