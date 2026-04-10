import React from 'react';
import { DndContext } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import Zone from '../components/Zone';
import type { CardInstance } from '../components/Card';
import CardSearchModal from '../components/CardSearchModal';
import GameBoardAttackModeBanner from '../components/GameBoardAttackModeBanner';
import GameBoardBoardRow from '../components/GameBoardBoardRow';
import GameBoardBottomHandSection from '../components/GameBoardBottomHandSection';
import GameBoardCardInspectorSection from '../components/GameBoardCardInspectorSection';
import GameBoardCountDialog from '../components/GameBoardCountDialog';
import GameBoardDialogsHost from '../components/GameBoardDialogsHost';
import GameBoardEndTurnSection from '../components/GameBoardEndTurnSection';
import GameBoardGlobalOverlays from '../components/GameBoardGlobalOverlays';
import GameBoardHeader from '../components/GameBoardHeader';
import GameBoardLeaderZoneSection from '../components/GameBoardLeaderZoneSection';
import GameBoardMainDeckSection from '../components/GameBoardMainDeckSection';
import GameBoardMulliganDialog from '../components/GameBoardMulliganDialog';
import GameBoardPlayerControlsPanel from '../components/GameBoardPlayerControlsPanel';
import GameBoardPreparationPanel from '../components/GameBoardPreparationPanel';
import GameBoardRecentEventsPanel from '../components/GameBoardRecentEventsPanel';
import GameBoardReadOnlyStatusSection from '../components/GameBoardReadOnlyStatusSection';
import GameBoardReconnectAlert from '../components/GameBoardReconnectAlert';
import GameBoardResetDialog from '../components/GameBoardResetDialog';
import GameBoardSearchableStackSection from '../components/GameBoardSearchableStackSection';
import GameBoardSavedSessionPrompt from '../components/GameBoardSavedSessionPrompt';
import GameBoardTopHandSection from '../components/GameBoardTopHandSection';
import GameBoardTopNDialog from '../components/GameBoardTopNDialog';
import GameBoardTokenSpawnDialog from '../components/GameBoardTokenSpawnDialog';
import GameBoardUndoTurnDialog from '../components/GameBoardUndoTurnDialog';
import {
  buildMainDeckZoneActions,
  buildRandomDiscardHandZoneActions,
  buildRevealHandZoneActions,
} from '../components/gameBoardZoneActionViewModel';
import TopDeckModal from '../components/TopDeckModal';
import { useGameBoardAttackUi } from '../hooks/useGameBoardAttackUi';
import { useGameBoardLogic } from '../hooks/useGameBoardLogic';
import { buildGameBoardViewModel } from '../hooks/gameBoardViewModel';
import { useGameBoardDialogsUi } from '../hooks/useGameBoardDialogsUi';
import { useGameBoardInspectorUi } from '../hooks/useGameBoardInspectorUi';
import { useGameBoardSavedDeckPicker } from '../hooks/useGameBoardSavedDeckPicker';
import type { PlayerRole } from '../types/game';
import type { AttackTarget } from '../types/sync';
import {
  formatSavedSessionTimestamp,
} from '../utils/gameBoardPresentation';
import {
  shouldDismissModalOnBackdropClick,
} from '../utils/gameBoardDismissals';
import {
  activeBoardSectionStyle,
  boardColumns,
  boardContentWidth,
  boardShellColumns,
  centerZoneWidth,
  sidePanelWidth,
  sideZoneWidth,
  soloMulliganButtonStyle,
  topPanelWidth,
} from './gameBoardLayout';
import {
  getAttackTargetFromCard as resolveAttackTargetFromCard,
} from '../utils/gameBoardCombat';

const GameBoard: React.FC = () => {
  const { t } = useTranslation();
  const {
    room, isSoloMode, isHost, isSpectator, role, status, connectionState, canInteract, canView, attemptReconnect, gameState, savedSessionCandidate, resumeSavedSession, discardSavedSession, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage, cardPlayMessage, attackMessage, eventHistory, attackVisual, revealedCardsOverlay,
    cardStatLookup, cardDetailLookup,
    isRollingDice, diceValue, mulliganOrder, isMulliganModalOpen, setIsMulliganModalOpen,
    handleStatChange, setPhase, endTurn, handleUndoTurn, handleSetInitialTurnOrder,
    handlePureCoinFlip, handleRollDice, handleStartGame, handleToggleReady,
    handleDrawInitialHand, startMulligan, handleMulliganOrderSelect, executeMulligan,
    drawCard, handleExtractCard, confirmResetGame, handleDeckUpload, importDeckData, spawnTokens,
    handleModifyCounter, handleModifyGenericCounter, handleDragEnd, toggleTap, handleFlipCard, handleSendToBottom,
    handleBanish, handlePlayToField, handleSendToCemetery, handleReturnEvolve, handleShuffleDeck, handleDeclareAttack,
    handleSetRevealHandsMode, handleSetEndStop,
    evolveAutoAttachSelection, confirmEvolveAutoAttachSelection, cancelEvolveAutoAttachSelection,
    getCards, getTokenOptions, millCard, moveTopCardToEx, discardRandomHandCards, revealHand,
    topDeckCards, topDeckTargetRole, setTopDeckTargetRole, handleLookAtTop, handleResolveTopDeck, setTopDeckCards,
    handleUndoCardMove, hasUndoableMove, canUndoTurn,
    isDebug
  } = useGameBoardLogic();

  const [mulliganTargetRole, setMulliganTargetRole] = React.useState<PlayerRole>('host');
  const [activeZoneActions, setActiveZoneActions] = React.useState<string | null>(null);
  const [isRoomCopied, setIsRoomCopied] = React.useState(false);
  const {
    allCardsLength,
    savedDeckSearch,
    setSavedDeckSearch,
    savedDeckImportTargetRole,
    filteredSavedDeckOptions,
    savedDeckPickerTargetLabel,
    openSavedDeckPicker,
    closeSavedDeckPicker,
    handleSavedDeckImport,
  } = useGameBoardSavedDeckPicker({
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
  const canShowUndoMoveForRole = (playerRole: PlayerRole) => gameState.gameStatus === 'playing' &&
    !isSpectator &&
    hasUndoableMove &&
    (isSoloMode ? undoMoveActor === playerRole : playerRole === role && gameState.turnPlayer === role);
  const renderUndoMoveButton = (playerRole: PlayerRole) => canShowUndoMoveForRole(playerRole) ? (
    <button
      data-testid={`undo-move-${playerRole}`}
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
  ) : null;
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
    onAttackModeStarted: undefined,
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
    cards: gameState.cards,
    cardDetailLookup,
    getAttackTargetFromCard,
    handleAttackTargetSelect,
  });
  const handleStartAttack = React.useCallback((cardId: string) => {
    closeInspector();
    startAttackMode(cardId);
  }, [closeInspector, startAttackMode]);
  React.useEffect(() => {
    if (isSoloMode || connectionState === 'connected') return;

    resetDialogsForConnectionChange();
    setActiveZoneActions(null);
    closeInspector();
    clearAttackSource();
  }, [clearAttackSource, closeInspector, connectionState, isSoloMode, resetDialogsForConnectionChange]);

  const openMulliganModal = (targetRole: PlayerRole) => {
    if (!canInteract) return;
    setMulliganTargetRole(targetRole);
    startMulligan();
  };

  const openSearchZone = React.useCallback((id: string, title: string) => {
    if (!canView) return;
    setSearchZone({ id, title });
  }, [canView, setSearchZone]);
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
  const bottomHandRevealZoneActions = buildRevealHandZoneActions(bottomRole, revealHand, t);
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
    drawButtonBackground: '#6366f1',
    canOpenTokenSpawn: canInteract,
    onOpenTokenSpawn: () => openTokenSpawnModal(topRole),
    spawnButtonBackground: '#7c3aed',
    undoMoveButton: renderUndoMoveButton(topRole),
    trackerTestId: `player-tracker-${topRole}`,
    playerState: gameState[topRole],
    onAdjustStat: (stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo', delta: number) => handleStatChange(topRole, stat, delta),
    readOnlyTracker: isSpectator,
  };
  const topSoloHandSectionProps = {
    columns: boardColumns,
    width: boardContentWidth,
    centerWidth: centerZoneWidth,
    minHeight: '150px',
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
      onModifyCounter: handleModifyCounter,
      onModifyGenericCounter: handleModifyGenericCounter,
      onSendToBottom: handleSendToBottom,
      onBanish: handleBanish,
      onCemetery: handleSendToCemetery,
      onPlayToField: (cardId: string) => handlePlayToField(cardId, topRole),
      containerStyle: { minHeight: '150px' },
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
      containerStyle: { minHeight: '150px' },
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
      onModifyCounter: handleModifyCounter,
      onSendToBottom: handleSendToBottom,
      onBanish: handleBanish,
      onCemetery: handleSendToCemetery,
      onPlayToField: handlePlayToField,
      isProtected: true,
      lockCards: isPreparingHandMoveLocked,
      viewerRole,
      containerStyle: { minHeight: '160px' },
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
    drawButtonBackground: 'var(--accent-primary)',
    canOpenTokenSpawn: canInteract,
    onOpenTokenSpawn: () => openTokenSpawnModal(bottomRole),
    spawnButtonBackground: 'var(--accent-secondary)',
    undoMoveButton: renderUndoMoveButton(bottomRole),
    trackerTestId: `player-tracker-${bottomRole}`,
    playerState: gameState[bottomRole],
    onAdjustStat: (stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo', delta: number) => handleStatChange(bottomRole, stat, delta),
    containerStyle: { marginLeft: '1.25rem' },
  };
  const savedDeckPickerDialogProps = savedDeckImportTargetRole && savedDeckPickerTargetLabel
    ? {
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
  const cardInspectorSectionProps = {
    ref: inspectorRef,
    selectedInspectorCard,
    selectedInspectorDetail,
    inspectorPresentation,
    inspectorPopoverStyle,
    onClose: closeInspector,
  };

  return (
    <DndContext onDragEnd={(event) => {
      if (!canInteract) return;
      handleDragEnd(event);
    }}>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflow: 'hidden' }}>

        <GameBoardHeader
          room={room}
          isSoloMode={isSoloMode}
          isHost={isHost}
          isSpectator={isSpectator}
          role={role}
          status={status}
          connectionState={connectionState}
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
          onPhaseChange={setPhase}
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

        {attackSourceCard && (
          <GameBoardAttackModeBanner
            attackerName={attackSourceCard.name}
            onCancel={clearAttackSource}
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
          <div
            data-testid="board-section-top"
            data-turn-active={String(shouldHighlightTopBoard)}
            style={{ ...activeBoardSectionStyle(shouldHighlightTopBoard), opacity: 0.9 }}
          >
            {isSoloMode ? (
              <div style={{ display: 'grid', gridTemplateColumns: boardShellColumns, columnGap: '1rem', alignItems: 'flex-start', width: '100%', maxWidth: '1568px', justifyContent: 'center' }}>
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

                <div style={{ width: `${boardContentWidth}px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', alignItems: 'flex-start' }}>
                  <GameBoardTopHandSection {...topSoloHandSectionProps} />

                  <GameBoardBoardRow columns={boardColumns} width={boardContentWidth}>
                    <GameBoardSearchableStackSection
                      zoneProps={{ id: `cemetery-${topRole}`, label: t('gameBoard.zones.cemetery', { label: topLabel }), cards: getCards(`cemetery-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
                      searchLabel={t('gameBoard.zones.search')}
                      onSearch={() => openSearchZone(`cemetery-${topRole}`, t('gameBoard.zones.cemetery', { label: topLabel }))}
                      searchTitle={interactionBlockedTitle}
                      isSearchInteractive={canView}
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
                    <GameBoardSearchableStackSection
                      zoneProps={{ id: `banish-${topRole}`, label: t('gameBoard.zones.banish', { label: topLabel }), cards: getCards(`banish-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
                      searchLabel={t('gameBoard.zones.search')}
                      onSearch={() => openSearchZone(`banish-${topRole}`, t('gameBoard.zones.banish', { label: topLabel }))}
                      searchTitle={interactionBlockedTitle}
                      isSearchInteractive={canView}
                    />
                  </GameBoardBoardRow>

                  <GameBoardBoardRow
                    columns={boardColumns}
                    width={boardContentWidth}
                    overlay={
                      <GameBoardLeaderZoneSection
                        playerRole={topRole}
                        label={topLabel}
                        zoneLabel={t('gameBoard.board.leaderLabel', { label: topLabel })}
                        side="right"
                        extraOffset={20}
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
                    }
                  >
                      <GameBoardMainDeckSection
                        zoneProps={{ id: `mainDeck-${topRole}`, label: t('gameBoard.zones.mainDeck', { label: topLabel }), cards: getCards(`mainDeck-${topRole}`), cardDetailLookup, layout: 'stack', isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
                        menuId={topMainDeckZoneActions.menuId}
                        activeMenuId={activeZoneActions}
                        actionsLabel={topMainDeckZoneActions.actionsLabel}
                        actions={topMainDeckZoneActions.actions}
                        direction="up"
                        onActiveMenuChange={setActiveZoneActions}
                      />
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
                      <GameBoardSearchableStackSection
                        zoneProps={{ id: `evolveDeck-${topRole}`, label: t('gameBoard.zones.evolveDeck', { label: topLabel }), cards: getCards(`evolveDeck-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
                        searchLabel={t('gameBoard.zones.search')}
                        onSearch={() => openSearchZone(`evolveDeck-${topRole}`, t('gameBoard.zones.evolveDeck', { label: topLabel }))}
                        searchTitle={interactionBlockedTitle}
                        isSearchInteractive={canView}
                      />
                  </GameBoardBoardRow>
                </div>
                <div />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: boardShellColumns, columnGap: '1rem', alignItems: 'flex-start', width: '100%', maxWidth: '1568px', justifyContent: 'center' }}>
                <div style={{ width: `${topPanelWidth}px`, alignSelf: 'end' }}>
                  <GameBoardReadOnlyStatusSection
                    label={topLabel}
                    playerState={gameState[topRole]}
                  />
                </div>

                <div style={{ width: `${boardContentWidth}px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', alignItems: 'flex-start' }}>
                  <GameBoardTopHandSection {...topReadOnlyHandSectionProps} />

                  <GameBoardBoardRow columns={boardColumns} width={boardContentWidth}>
                    <GameBoardSearchableStackSection
                      zoneProps={{ id: `cemetery-${topRole}`, label: t('gameBoard.zones.cemetery', { label: topLabel }), cards: getCards(`cemetery-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
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
                    <GameBoardSearchableStackSection
                      zoneProps={{ id: `banish-${topRole}`, label: t('gameBoard.zones.banish', { label: topLabel }), cards: getCards(`banish-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
                      searchLabel={t('gameBoard.zones.search')}
                      onSearch={() => openSearchZone(`banish-${topRole}`, t('gameBoard.zones.banish', { label: topLabel }))}
                    />
                  </GameBoardBoardRow>

                  <GameBoardBoardRow
                    columns={boardColumns}
                    width={boardContentWidth}
                    overlay={
                      <GameBoardLeaderZoneSection
                        playerRole={topRole}
                        label={topLabel}
                        zoneLabel={t('gameBoard.board.leaderLabel', { label: topLabel })}
                        side="right"
                        extraOffset={20}
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
                    }
                  >
                      <GameBoardMainDeckSection
                        zoneProps={{ id: `mainDeck-${topRole}`, label: t('gameBoard.zones.mainDeck', { label: topLabel }), cards: getCards(`mainDeck-${topRole}`), cardDetailLookup, layout: 'stack', isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
                        menuId={topReadOnlyMainDeckZoneActions.menuId}
                        activeMenuId={activeZoneActions}
                        actionsLabel={topReadOnlyMainDeckZoneActions.actionsLabel}
                        actions={isSpectator ? topReadOnlyMainDeckZoneActions.actions : undefined}
                        onActiveMenuChange={setActiveZoneActions}
                      />
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
                      <GameBoardSearchableStackSection
                        zoneProps={{ id: `evolveDeck-${topRole}`, label: t('gameBoard.zones.evolveDeck', { label: topLabel }), cards: getCards(`evolveDeck-${topRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
                        searchLabel={t('common.buttons.search')}
                        onSearch={() => openSearchZone(`evolveDeck-${topRole}`, t('gameBoard.zones.evolveDeck', { label: topLabel }))}
                      />
                  </GameBoardBoardRow>
                </div>
                <div />
              </div>
            )}
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />

          {/* MY BOARD */}
          <div
            data-testid="board-section-bottom"
            data-turn-active={String(isBottomTurnActive)}
            style={activeBoardSectionStyle(isBottomTurnActive)}
          >
	            <div style={{ display: 'grid', gridTemplateColumns: boardShellColumns, columnGap: '1rem', alignItems: 'flex-start', width: '100%', maxWidth: '1568px', justifyContent: 'center' }}>
                <div />
	              <div style={{ width: `${boardContentWidth}px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', alignItems: 'flex-start' }}>
	                <GameBoardBoardRow
                    columns={boardColumns}
                    width={boardContentWidth}
                    overlay={
                      <GameBoardLeaderZoneSection
                        playerRole={bottomRole}
                        label={bottomLabel}
                        zoneLabel={t('gameBoard.board.leaderLabel', { label: bottomLabel })}
                        side="left"
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
                    }
                  >
                  <GameBoardSearchableStackSection
                    zoneProps={{ id: `evolveDeck-${bottomRole}`, label: t('gameBoard.zones.evolveDeck', { label: bottomLabel }), cards: getCards(`evolveDeck-${bottomRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
                    searchLabel={t('common.buttons.search')}
                    onSearch={() => openSearchZone(`evolveDeck-${bottomRole}`, t('gameBoard.zones.evolveDeck', { label: bottomLabel }))}
                    searchTitle={interactionBlockedTitle}
                    isSearchInteractive={canView}
                  />
                  <Zone id={`field-${bottomRole}`} label={t('gameBoard.zones.field', { label: bottomLabel })} cards={getCards(`field-${bottomRole}`)} cardStatLookup={cardStatLookup} cardDetailLookup={cardDetailLookup} getHighlightTone={getAttackHighlightTone} onInspectCard={handleInspectCard} onAttack={gameState.turnPlayer === bottomRole ? handleStartAttack : undefined} onTap={toggleTap} onModifyCounter={handleModifyCounter} onModifyGenericCounter={handleModifyGenericCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} disableQuickActionsForCard={shouldDisableQuickActionsForAttackTarget} viewerRole={viewerRole} containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '160px', width: `${centerZoneWidth}px`, flex: 'none' }} isDebug={isDebug} />
                  <GameBoardMainDeckSection
                    zoneProps={{ id: `mainDeck-${bottomRole}`, label: t('gameBoard.zones.mainDeck', { label: bottomLabel }), cards: getCards(`mainDeck-${bottomRole}`), cardDetailLookup, layout: 'stack', isProtected: true, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
                    menuId={bottomMainDeckZoneActions.menuId}
                    activeMenuId={activeZoneActions}
                    actionsLabel={bottomMainDeckZoneActions.actionsLabel}
                    actions={bottomMainDeckZoneActions.actions}
                    onActiveMenuChange={setActiveZoneActions}
                  />
                  </GameBoardBoardRow>

	                <GameBoardBoardRow columns={boardColumns} width={boardContentWidth}>
                  <GameBoardSearchableStackSection
                    zoneProps={{ id: `banish-${bottomRole}`, label: t('gameBoard.zones.banish', { label: bottomLabel }), cards: getCards(`banish-${bottomRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, onModifyCounter: handleModifyCounter, onSendToBottom: handleSendToBottom, onCemetery: handleSendToCemetery, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
                    searchLabel={t('common.buttons.search')}
                    onSearch={() => openSearchZone(`banish-${bottomRole}`, t('gameBoard.zones.banish', { label: bottomLabel }))}
                    searchTitle={interactionBlockedTitle}
                    isSearchInteractive={canView}
                  />
	                  <Zone id={`ex-${bottomRole}`} label={t('gameBoard.zones.exArea', { label: bottomLabel })} cards={getCards(`ex-${bottomRole}`)} cardStatLookup={cardStatLookup} cardDetailLookup={cardDetailLookup} onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onModifyGenericCounter={handleModifyGenericCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} viewerRole={viewerRole} containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '150px', flex: 'none', width: `${centerZoneWidth}px` }} isDebug={isDebug} />
                  <GameBoardSearchableStackSection
                    zoneProps={{ id: `cemetery-${bottomRole}`, label: t('gameBoard.zones.cemetery', { label: bottomLabel }), cards: getCards(`cemetery-${bottomRole}`), cardDetailLookup, layout: 'stack', onInspectCard: handleInspectCard, onModifyCounter: handleModifyCounter, onSendToBottom: handleSendToBottom, onBanish: handleBanish, onCemetery: handleSendToCemetery, viewerRole, containerStyle: { minWidth: `${sideZoneWidth}px`, minHeight: '150px' }, isDebug }}
                    searchLabel={t('common.buttons.search')}
                    onSearch={() => openSearchZone(`cemetery-${bottomRole}`, t('gameBoard.zones.cemetery', { label: bottomLabel }))}
                    searchTitle={interactionBlockedTitle}
                    isSearchInteractive={canView}
                  />
	                </GameBoardBoardRow>

	                <GameBoardBottomHandSection {...bottomHandSectionProps} />
              </div>

              {isSpectator ? (
                <div style={{ width: `${sidePanelWidth}px`, boxSizing: 'border-box', marginLeft: '1.25rem' }}>
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
                            padding: '0.5rem',
                            background: isOwnEndStopActive ? '#ef4444' : '#1d4ed8',
                            fontWeight: 'bold',
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
                          style={{
                            padding: '0.5rem',
                            background: '#f59e0b',
                            color: 'black',
                            fontWeight: 'bold',
                            opacity: !canInteract || endTurnBlockedByEndStop ? 0.5 : 1,
                            cursor: !canInteract || endTurnBlockedByEndStop ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {t('gameBoard.board.endTurnSelf')}
                        </button>
                      )}
                      {endTurnBlockedByEndStop && (
                        <div
                          className="glass-panel"
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(239, 68, 68, 0.16)',
                            border: '1px solid rgba(248, 113, 113, 0.45)',
                            color: '#fecaca',
                            fontWeight: 600,
                          }}
                        >
                          {t('gameBoard.board.endStopBlocked', { label: topLabel })}
                        </div>
                      )}
                    </>
                  }
                  afterSpawnControls={canResetGame ? (
                    <button onClick={() => setShowResetConfirm(true)} className="glass-panel" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontWeight: 'bold' }}>
                      {t('gameBoard.controls.resetGame')}
                    </button>
                  ) : null}
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
        onSendToBottom={handleSendToBottom}
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
      />
      <GameBoardCardInspectorSection {...cardInspectorSectionProps} />
    </DndContext>
  );
};

export default GameBoard;
