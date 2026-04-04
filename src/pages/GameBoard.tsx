import React from 'react';
import { DndContext } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import Zone from '../components/Zone';
import type { CardInspectAnchor, CardInstance } from '../components/Card';
import CardSearchModal from '../components/CardSearchModal';
import GameBoardAttackModeBanner from '../components/GameBoardAttackModeBanner';
import GameBoardPreparationPanel from '../components/GameBoardPreparationPanel';
import GameBoardRecentEventsPanel from '../components/GameBoardRecentEventsPanel';
import GameBoardRoomStatus from '../components/GameBoardRoomStatus';
import GameBoardSavedSessionPrompt from '../components/GameBoardSavedSessionPrompt';
import TopDeckModal from '../components/TopDeckModal';
import { useGameBoardLogic } from '../hooks/useGameBoardLogic';
import { canImportDeck, canUndoLastTurn, isHandCardMovementLocked } from '../utils/gameRules';
import { getPlayerLabel, getZoneOwner } from '../utils/soloMode';
import type { PlayerRole } from '../types/game';
import type { AttackTarget } from '../types/sync';
import { buildCardDetailPresentation, formatAbilityText } from '../utils/cardDetails';
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
import CardArtwork from '../components/CardArtwork';

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
          label={t('gameBoard.board.leaderLabel', { label })}
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
            onClick={() => openSearchZone(leaderZoneId, t('gameBoard.board.leaderLabel', { label }))}
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
            {t('gameBoard.board.search')}
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
        {t('gameBoard.board.actions')}
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
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>{t('gameBoard.board.statusLabel', { label })}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{t('gameBoard.board.stats.hp')}: {gameState[playerRole].hp}</span>
        <div style={trackerButtonRowStyle}>
          <button onClick={() => handleStatChange(playerRole, 'hp', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'hp', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{t('gameBoard.board.stats.ep')}: {gameState[playerRole].ep}</span>
        <div style={trackerButtonRowStyle}>
          <button onClick={() => handleStatChange(playerRole, 'ep', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'ep', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#facc15', fontWeight: 'bold' }}>{t('gameBoard.board.stats.sep')}: {gameState[playerRole].sep}</span>
        <div style={trackerButtonRowStyle}>
          <button onClick={() => handleStatChange(playerRole, 'sep', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'sep', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>{t('gameBoard.board.stats.combo')}: {gameState[playerRole].combo}</span>
        <div style={trackerButtonRowStyle}>
          <button onClick={() => handleStatChange(playerRole, 'combo', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'combo', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.6rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <button onClick={() => handleStatChange(playerRole, 'maxPp', 1)} style={{ ...trackerIncreaseButtonStyle, width: '24px', height: '20px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '0.75rem' }}>+</button>
            <span style={{ fontSize: '0.6rem', color: '#93c5fd', fontWeight: 'bold' }}>{t('gameBoard.board.stats.max')}</span>
            <button onClick={() => handleStatChange(playerRole, 'maxPp', -1)} style={{ ...trackerDecreaseButtonStyle, width: '24px', height: '20px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '0.75rem' }}>-</button>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-2px' }}>{t('gameBoard.board.stats.playPoints')}</div>
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
        {t('gameBoard.board.statusLabel', { label })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>{t('gameBoard.board.stats.hp')}</span>
        <strong style={{ color: '#ef4444' }}>{gameState[playerRole].hp}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>PP</span>
        <strong><span style={{ color: '#3b82f6' }}>{gameState[playerRole].pp}</span> / {gameState[playerRole].maxPp}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>{t('gameBoard.board.stats.ep')}</span>
        <strong style={{ color: '#fbbf24' }}>{gameState[playerRole].ep}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>{t('gameBoard.board.stats.sep')}</span>
        <strong style={{ color: '#facc15' }}>{gameState[playerRole].sep}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>{t('gameBoard.board.stats.combo')}</span>
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
        title={!isEnabled ? interactionBlockedTitle ?? t('gameBoard.board.endTurnDisabled') : undefined}
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
        {t('gameBoard.board.endTurn', { label })}
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
            {inspectorPresentation.primaryMeta && (
              <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: '0.18rem', lineHeight: 1.45 }}>
                {inspectorPresentation.primaryMeta}
              </div>
            )}
            {inspectorPresentation.secondaryMeta && (
              <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.1rem', lineHeight: 1.45 }}>
                {inspectorPresentation.secondaryMeta}
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
            {t('gameBoard.inspector.close')}
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
              <span style={{ color: '#94a3b8' }}>{t('gameBoard.inspector.id')}</span>
              <span>{selectedInspectorCard.cardId}</span>
              <span style={{ color: '#94a3b8' }}>{t('gameBoard.inspector.cost')}</span>
              <span>{detail?.cost || '-'}</span>
              {inspectorPresentation.stats && (
                <>
                  <span style={{ color: '#94a3b8' }}>{t('gameBoard.inspector.stats')}</span>
                  <span>{inspectorPresentation.stats}</span>
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
            {t('gameBoard.inspector.abilityText')}
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
            {detail?.abilityText ? formatAbilityText(detail.abilityText) : t('gameBoard.inspector.noAbilityText')}
          </div>
        </div>
      </div>
    );
  };

  const renderSavedDeckPicker = () => {
    if (!savedDeckImportTargetRole) return null;

    const targetLabel = getPlayerLabel(
      savedDeckImportTargetRole,
      isSoloMode,
      t('common.labels.self'),
      t('common.labels.opponent'),
      role,
      t('common.labels.player1'),
      t('common.labels.player2')
    );

    return (
      <div
        role="presentation"
        onClick={(event) => {
          if (!shouldDismissModalOnBackdropClick(event.target, event.currentTarget)) return;

          closeSavedDeckPicker();
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
          aria-label={t('gameBoard.deckPicker.title')}
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
              <h3 style={{ margin: 0 }}>{t('gameBoard.deckPicker.title')}</h3>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('gameBoard.deckPicker.subtitle', { label: targetLabel })}
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
              {t('gameBoard.deckPicker.close')}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={savedDeckSearch}
              onChange={(event) => setSavedDeckSearch(event.target.value)}
              placeholder={t('gameBoard.deckPicker.searchPlaceholder')}
              aria-label={t('gameBoard.deckPicker.searchAria')}
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
              {t('gameBoard.deckPicker.deckCount', { count: filteredSavedDeckOptions.length })}
            </span>
          </div>

          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {filteredSavedDeckOptions.length === 0 ? (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {t('gameBoard.deckPicker.noDecks')}
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
                    {t('gameBoard.deckPicker.load')}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEvolveAutoAttachModal = () => {
    if (!evolveAutoAttachSelection) return null;

    return (
      <div
        role="presentation"
        onClick={(event) => {
          if (!shouldDismissModalOnBackdropClick(event.target, event.currentTarget)) return;

          cancelEvolveAutoAttachSelection();
        }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.84)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 4600,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('gameBoard.modals.evolveAutoAttach.title')}
          onClick={(event) => event.stopPropagation()}
          className="glass-panel"
          style={{
            width: 'min(860px, calc(100vw - 32px))',
            maxHeight: 'min(82vh, 760px)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>{t('gameBoard.modals.evolveAutoAttach.title')}</h3>
              <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('gameBoard.modals.evolveAutoAttach.description', { card: evolveAutoAttachSelection.sourceCard.name })}
              </p>
            </div>
            <button
              type="button"
              onClick={cancelEvolveAutoAttachSelection}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              {t('common.buttons.cancel')}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{
              width: '160px',
              background: 'rgba(15, 23, 42, 0.48)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              flexShrink: 0,
            }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {t('gameBoard.modals.evolveAutoAttach.playingCard')}
              </div>
              <CardArtwork
                image={evolveAutoAttachSelection.sourceCard.image}
                alt={evolveAutoAttachSelection.sourceCard.name}
                detail={cardDetailLookup[evolveAutoAttachSelection.sourceCard.cardId]}
                baseCardType={evolveAutoAttachSelection.sourceCard.baseCardType}
                isEvolveCard={evolveAutoAttachSelection.sourceCard.isEvolveCard}
                style={{ width: '100%', aspectRatio: '5 / 7', borderRadius: '10px', objectFit: 'cover' }}
                draggable={false}
              />
              <div style={{ color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.4 }}>
                {evolveAutoAttachSelection.sourceCard.name}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {t('gameBoard.modals.evolveAutoAttach.selectTarget')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                {evolveAutoAttachSelection.candidateCards.map((candidateCard) => (
                  <button
                    key={candidateCard.id}
                    type="button"
                    onClick={() => confirmEvolveAutoAttachSelection(candidateCard.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '14px',
                      border: '1px solid rgba(103, 232, 249, 0.24)',
                      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.76), rgba(15, 23, 42, 0.58))',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <CardArtwork
                      image={candidateCard.image}
                      alt={candidateCard.name}
                      detail={cardDetailLookup[candidateCard.cardId]}
                      baseCardType={candidateCard.baseCardType}
                      style={{ width: '64px', height: '90px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                      draggable={false}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, lineHeight: 1.35 }}>
                        {candidateCard.name}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '0.3rem' }}>
                        {candidateCard.cardId}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
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
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => handleSetInitialTurnOrder()}
                  disabled={!isHost && !isSoloMode}
                  style={{ padding: '0.3rem 0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: (isHost || isSoloMode) ? 1 : 0.5 }}
                >
                  {t('gameBoard.controls.decideTurnOrder')}
                </button>
                <button
                  onClick={() => handleSetInitialTurnOrder(bottomRole)}
                  disabled={!isHost && !isSoloMode}
                  style={{ padding: '0.3rem 0.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: (isHost || isSoloMode) ? 1 : 0.5 }}
                >
                  {isSoloMode ? t('gameBoard.controls.p1First') : t('gameBoard.controls.meFirst')}
                </button>
                <button
                  onClick={() => handleSetInitialTurnOrder(topRole)}
                  disabled={!isHost && !isSoloMode}
                  style={{ padding: '0.3rem 0.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: (isHost || isSoloMode) ? 1 : 0.5 }}
                >
                  {isSoloMode ? t('gameBoard.controls.p2First') : t('gameBoard.controls.oppFirst')}
                </button>
                {!gameState[bottomRole].initialHandDrawn && (
                  <button
                    onClick={() => handleDrawInitialHand(bottomRole)}
                    style={{ padding: '0.3rem 0.6rem', background: '#3b82f6', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    {t('gameBoard.controls.drawHand')}
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
                    {gameState[bottomRole].isReady ? t('gameBoard.controls.cancelReady') : (isSoloMode ? t('gameBoard.controls.p1Ready') : t('gameBoard.controls.ready'))}
                  </button>
                )}
                {isSoloMode && !gameState[topRole].initialHandDrawn && (
                  <button
                    onClick={() => handleDrawInitialHand(topRole)}
                    style={{ padding: '0.3rem 0.6rem', background: '#6366f1', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    {t('gameBoard.controls.drawP2Hand')}
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
                    {gameState[topRole].isReady ? t('gameBoard.controls.cancelP2Ready') : t('gameBoard.controls.p2Ready')}
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
                  {t('gameBoard.controls.startGame')}
                </button>

                <div style={{ display: 'flex', gap: '0.8rem', marginLeft: '0.5rem', borderLeft: '1px solid var(--border-light)', paddingLeft: '0.8rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{isSoloMode ? t('gameBoard.controls.p1') : t('gameBoard.controls.host')}</span>
                    <span style={{ color: gameState.host.isReady ? 'var(--vivid-green-cyan)' : '#ef4444', fontWeight: 'bold' }}>
                      {gameState.host.isReady ? t('gameBoard.controls.statusReady') : (gameState.host.initialHandDrawn ? t('gameBoard.controls.statusDeciding') : t('gameBoard.controls.statusWaiting'))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{isSoloMode ? t('gameBoard.controls.p2') : t('gameBoard.controls.guest')}</span>
                    <span style={{ color: gameState.guest.isReady ? 'var(--vivid-green-cyan)' : '#ef4444', fontWeight: 'bold' }}>
                      {gameState.guest.isReady ? t('gameBoard.controls.statusReady') : (gameState.guest.initialHandDrawn ? t('gameBoard.controls.statusDeciding') : t('gameBoard.controls.statusWaiting'))}
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
                  {t('gameBoard.controls.tossCoin')}
                </button>
                <button
                  onClick={handleRollDice}
                  style={{ padding: '0.3rem 0.6rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold' }}
                >
                  {t('gameBoard.controls.rollDice')}
                </button>
              </>
            )}

            {canShowUndoTurn && (
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
                {t('gameBoard.turn.undo')}
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
                  ? t('gameBoard.turn.p1', { label: currentTurnLabel.toUpperCase() })
                  : gameState.turnPlayer === role ? t('gameBoard.turn.your') : t('gameBoard.turn.opponent')}
              </span>
              <span className="Garamond" style={{ fontSize: isBottomTurnActive ? '1.08rem' : undefined }}>
                {t('gameBoard.turn.count', { count: gameState.turnCount })}
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
                <option value="Start">{t('gameBoard.turn.phaseStart')}</option>
                <option value="Main">{t('gameBoard.turn.phaseMain')}</option>
                <option value="End">{t('gameBoard.turn.phaseEnd')}</option>
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
            {t('gameBoard.alerts.reconnectingLocked')}
          </div>
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
                        <button onClick={() => openMulliganModal(topRole)} style={soloMulliganButtonStyle}>
                          {t('gameBoard.preparation.mulliganButton', { label: topLabel })}
                        </button>
                      )}
                    </div>
                    <div />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: boardColumns, gap: '0.75rem', width: `${boardContentWidth}px`, alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`cemetery-${topRole}`} label={t('gameBoard.zones.cemetery', { label: topLabel })} cards={getCards(`cemetery-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                      <button onClick={() => openSearchZone(`cemetery-${topRole}`, t('gameBoard.zones.cemetery', { label: topLabel }))} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>{t('gameBoard.zones.search')}</button>
                    </div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`banish-${topRole}`} label={t('gameBoard.zones.banish', { label: topLabel })} cards={getCards(`banish-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                      <button onClick={() => openSearchZone(`banish-${topRole}`, t('gameBoard.zones.banish', { label: topLabel }))} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>{t('gameBoard.zones.search')}</button>
                    </div>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Zone id={`evolveDeck-${topRole}`} label={t('gameBoard.zones.evolveDeck', { label: topLabel })} cards={getCards(`evolveDeck-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                        <button onClick={() => openSearchZone(`evolveDeck-${topRole}`, t('gameBoard.zones.evolveDeck', { label: topLabel }))} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>{t('gameBoard.zones.search')}</button>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`cemetery-${topRole}`} label={t('gameBoard.zones.cemetery', { label: topLabel })} cards={getCards(`cemetery-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                      <button onClick={() => openSearchZone(`cemetery-${topRole}`, t('gameBoard.zones.cemetery', { label: topLabel }))} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>{t('gameBoard.zones.search')}</button>
                    </div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`banish-${topRole}`} label={t('gameBoard.zones.banish', { label: topLabel })} cards={getCards(`banish-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                      <button onClick={() => openSearchZone(`banish-${topRole}`, t('gameBoard.zones.banish', { label: topLabel }))} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>{t('gameBoard.zones.search')}</button>
                    </div>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Zone id={`evolveDeck-${topRole}`} label={t('gameBoard.zones.evolveDeck', { label: topLabel })} cards={getCards(`evolveDeck-${topRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                        <button onClick={() => openSearchZone(`evolveDeck-${topRole}`, t('gameBoard.zones.evolveDeck', { label: topLabel }))} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>{t('common.buttons.search')}</button>
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
                    <Zone id={`evolveDeck-${bottomRole}`} label={t('gameBoard.zones.evolveDeck', { label: bottomLabel })} cards={getCards(`evolveDeck-${bottomRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                    <button onClick={() => openSearchZone(`evolveDeck-${bottomRole}`, t('gameBoard.zones.evolveDeck', { label: bottomLabel }))} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>{t('common.buttons.search')}</button>
                  </div>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Zone id={`banish-${bottomRole}`} label={t('gameBoard.zones.banish', { label: bottomLabel })} cards={getCards(`banish-${bottomRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onCemetery={handleSendToCemetery} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                    <button onClick={() => openSearchZone(`banish-${bottomRole}`, t('gameBoard.zones.banish', { label: bottomLabel }))} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>{t('common.buttons.search')}</button>
                  </div>
	                  <Zone id={`ex-${bottomRole}`} label={t('gameBoard.zones.exArea', { label: bottomLabel })} cards={getCards(`ex-${bottomRole}`)} cardStatLookup={cardStatLookup} cardDetailLookup={cardDetailLookup} onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onModifyGenericCounter={handleModifyGenericCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} viewerRole={viewerRole} containerStyle={{ maxWidth: `${centerZoneWidth}px`, minHeight: '150px', flex: 'none', width: `${centerZoneWidth}px` }} isDebug={isDebug} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Zone id={`cemetery-${bottomRole}`} label={t('gameBoard.zones.cemetery', { label: bottomLabel })} cards={getCards(`cemetery-${bottomRole}`)} cardDetailLookup={cardDetailLookup} layout="stack" onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} viewerRole={viewerRole} containerStyle={{ minWidth: `${sideZoneWidth}px`, minHeight: '150px' }} isDebug={isDebug} />
                    <button onClick={() => openSearchZone(`cemetery-${bottomRole}`, t('gameBoard.zones.cemetery', { label: bottomLabel }))} title={interactionBlockedTitle} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: canInteract ? 'pointer' : 'not-allowed' }}>{t('common.buttons.search')}</button>
                  </div>
	                </div>

	                <div style={{ width: `${boardContentWidth}px`, minHeight: '160px', position: 'relative' }}>
                    <Zone id={`hand-${bottomRole}`} label={t('gameBoard.zones.hand', { label: bottomLabel })} cards={getCards(`hand-${bottomRole}`)} cardDetailLookup={cardDetailLookup} onInspectCard={handleInspectCard} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} isProtected={true} lockCards={isPreparingHandMoveLocked} viewerRole={viewerRole} containerStyle={{ minHeight: '160px' }} isDebug={isDebug} />

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
                        {t('game.mulligan_desc', { label: isSoloMode ? bottomLabel : t('game.mulligan_action') })}
                      </button>
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

      {/* Mulligan Modal */}
      {isMulliganModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '800px', width: '90%', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>{t('game.mulligan_title')}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {t('game.mulligan_instructions')}<br />
              {t('game.mulligan_disclaimer')}
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
                {t('common.buttons.cancel')}
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
                {t('game.mulligan_exchange')}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4500 }}>
          <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', width: 'min(980px, 94vw)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'white', textAlign: 'center' }}>{t('gameBoard.modals.tokenSpawn.title')}</h3>
            <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {t('gameBoard.modals.tokenSpawn.description')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', alignSelf: 'center' }}>
                {t('gameBoard.modals.tokenSpawn.destinationLabel')}
              </span>
              {(['ex', 'field'] as const).map((destination) => {
                const isSelected = tokenSpawnDestination === destination;
                return (
                  <button
                    key={destination}
                    type="button"
                    onClick={() => setTokenSpawnDestination(destination)}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '999px',
                      border: `1px solid ${isSelected ? 'rgba(103, 232, 249, 0.7)' : 'var(--border-light)'}`,
                      background: isSelected ? 'rgba(103, 232, 249, 0.16)' : 'var(--bg-overlay)',
                      color: isSelected ? '#67e8f9' : 'var(--text-main)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {destination === 'ex'
                      ? t('gameBoard.modals.tokenSpawn.destinations.ex')
                      : t('gameBoard.modals.tokenSpawn.destinations.field')}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {tokenSpawnOptions.map((token) => {
                const count = tokenSpawnCounts[token.cardId] ?? 0;
                return (
                <div
                  key={`${token.cardId}-${token.name}`}
                  style={{
                    width: '140px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    padding: '0.6rem',
                    color: 'white',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <button
                      type="button"
                      onClick={() => handleTokenSpawnCountChange(token.cardId, -1)}
                      disabled={count === 0}
                      aria-label={t('gameBoard.modals.tokenSpawn.decrease', { token: token.name })}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '999px',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-overlay)',
                        color: 'var(--text-main)',
                        cursor: count === 0 ? 'not-allowed' : 'pointer',
                        opacity: count === 0 ? 0.55 : 1,
                        fontWeight: 700,
                      }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: '1.8rem', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTokenSpawnCountChange(token.cardId, 1)}
                      disabled={count >= 5}
                      aria-label={t('gameBoard.modals.tokenSpawn.increase', { token: token.name })}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '999px',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-overlay)',
                        color: 'var(--text-main)',
                        cursor: count >= 5 ? 'not-allowed' : 'pointer',
                        opacity: count >= 5 ? 0.55 : 1,
                        fontWeight: 700,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              )})}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('gameBoard.modals.tokenSpawn.totalSelected', { count: totalTokenSpawnCount })}
              </span>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setTokenSpawnTargetRole(null)}
                style={{ padding: '0.5rem 1.5rem', background: '#333', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
              >
                {t('common.buttons.cancel')}
              </button>
              <button
                type="button"
                onClick={handleTokenSpawn}
                disabled={totalTokenSpawnCount === 0}
                style={{
                  padding: '0.5rem 1.5rem',
                  background: totalTokenSpawnCount === 0 ? 'rgba(56, 189, 248, 0.45)' : '#0ea5e9',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: totalTokenSpawnCount === 0 ? 'not-allowed' : 'pointer',
                  border: 'none',
                  fontWeight: 700,
                }}
              >
                {t('gameBoard.modals.tokenSpawn.confirm')}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderEvolveAutoAttachModal()}

      {isTopNInputOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem', color: 'white' }}>{t('gameBoard.modals.topN.title')}</h3>
            <input 
              type="number" 
              value={topNValue} 
              onChange={(e) => setTopNValue(Number(e.target.value))} 
              min="1" max="50"
              style={{ padding: '0.5rem', borderRadius: '4px', background: 'black', color: 'white', border: '1px solid #444', fontSize: '1.25rem', textAlign: 'center', width: '80px', marginBottom: '1.5rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setIsTopNInputOpen(false)} style={{ padding: '0.5rem 1.5rem', background: '#333', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none' }}>{t('common.buttons.cancel')}</button>
              <button onClick={() => {
                handleLookAtTop(topNValue, topDeckTargetRole);
                setIsTopNInputOpen(false);
              }} style={{ padding: '0.5rem 1.5rem', background: 'var(--accent-primary)', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>{t('gameBoard.modals.topN.confirm')}</button>
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
                  image={cardDetailLookup[card.cardId]?.image || card.image}
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
            <h3 style={{ margin: '0 0 1rem 0', color: '#fca5a5' }}>{t('gameBoard.modals.resetGame.title')}</h3>
            <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)' }}>{t('gameBoard.modals.resetGame.description')}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setShowResetConfirm(false)} style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', color: 'white', cursor: 'pointer', borderRadius: '4px' }}>{t('common.buttons.cancel')}</button>
              <button onClick={confirmResetGame} style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>{t('gameBoard.modals.resetGame.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {showUndoConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '2rem', borderRadius: 'var(--radius-md)', maxWidth: '420px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#f9a8d4' }}>{t('gameBoard.modals.undoTurn.title')}</h3>
            <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {t('gameBoard.modals.undoTurn.description')}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowUndoConfirm(false)}
                style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', color: 'white', cursor: 'pointer', borderRadius: '4px' }}
              >
                {t('common.buttons.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowUndoConfirm(false);
                  handleUndoTurn();
                }}
                style={{ padding: '0.5rem 1rem', background: '#ec4899', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
              >
                {t('gameBoard.modals.undoTurn.confirm')}
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
