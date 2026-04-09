import { canImportDeck, canUndoLastTurn, isHandCardMovementLocked } from '../utils/gameRules';
import { getPlayerLabel, getZoneOwner } from '../utils/soloMode';
import { getConnectionBadgeTone, getInteractionBlockedTitle } from '../utils/gameBoardPresentation';
import type { ConnectionBadgeTone, GameBoardConnectionState } from '../utils/gameBoardPresentation';
import type { PlayerRole, SyncState } from '../types/game';

type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

type BuildGameBoardViewModelArgs = {
  allCardsLength: number;
  role: PlayerRole;
  isSoloMode: boolean;
  isHost: boolean;
  isSpectator: boolean;
  canInteract: boolean;
  connectionState: GameBoardConnectionState;
  gameState: SyncState;
  canUndoTurn: SyncState['lastGameState'] | boolean;
  searchZoneId: string | null;
  t: TranslationFn;
};

type GameBoardViewerRole = PlayerRole | 'all' | 'spectator';

export type GameBoardViewModel = {
  canOpenSavedDeckPicker: boolean;
  viewerRole: GameBoardViewerRole;
  isPreparingHandMoveLocked: boolean;
  topRole: PlayerRole;
  bottomRole: PlayerRole;
  canImportTopDeck: boolean;
  canImportBottomDeck: boolean;
  savedDeckPickerUnavailableTitle: string;
  topLabel: string;
  bottomLabel: string;
  searchTargetRole: PlayerRole;
  currentTurnLabel: string;
  canShowUndoTurn: boolean;
  undoMoveActor: PlayerRole;
  shouldHideTopHand: boolean;
  isBottomTurnActive: boolean;
  isTopTurnActive: boolean;
  shouldHighlightTopBoard: boolean;
  canResetGame: boolean;
  isGuestConnectionBlocked: boolean;
  connectionBadgeTone: ConnectionBadgeTone;
  interactionBlockedTitle?: string;
  isOwnEndStopActive: boolean;
  isOpponentEndStopActive: boolean;
  canShowEndStopToggle: boolean;
  endTurnBlockedByEndStop: boolean;
  endTurnDisabledTitle: string;
};

export const buildGameBoardViewModel = ({
  allCardsLength,
  role,
  isSoloMode,
  isHost,
  isSpectator,
  canInteract,
  connectionState,
  gameState,
  canUndoTurn,
  searchZoneId,
  t,
}: BuildGameBoardViewModelArgs): GameBoardViewModel => {
  const canOpenSavedDeckPicker = allCardsLength > 0;
  const viewerRole = isSpectator ? 'spectator' : isSoloMode ? 'all' : role;
  const isPreparingHandMoveLocked = isHandCardMovementLocked(gameState);
  const topRole = (isSoloMode ? 'guest' : role === 'host' ? 'guest' : 'host') as PlayerRole;
  const bottomRole = (isSoloMode ? 'host' : role) as PlayerRole;
  const canImportTopDeck = canInteract && canImportDeck(gameState, topRole);
  const canImportBottomDeck = canInteract && canImportDeck(gameState, bottomRole);
  const savedDeckPickerUnavailableTitle = !canOpenSavedDeckPicker
    ? t('gameBoard.status.loadingCatalog')
    : t('gameBoard.status.availableBeforeStart');
  const topLabel = getPlayerLabel(
    topRole,
    isSoloMode || isSpectator,
    t('common.labels.self'),
    t('common.labels.opponent'),
    role,
    t('common.labels.player1'),
    t('common.labels.player2')
  );
  const bottomLabel = getPlayerLabel(
    bottomRole,
    isSoloMode || isSpectator,
    t('common.labels.self'),
    t('common.labels.opponent'),
    role,
    t('common.labels.player1'),
    t('common.labels.player2')
  );
  const searchTargetRole = searchZoneId ? getZoneOwner(searchZoneId) ?? role : role;
  const currentTurnLabel = gameState.turnPlayer === bottomRole ? bottomLabel : topLabel;
  const canShowUndoTurn = canUndoLastTurn(gameState, canUndoTurn, role, isSoloMode);
  const undoMoveActor = gameState.lastUndoableCardMoveActor ?? bottomRole;
  const shouldHideTopHand = !isSoloMode && !isSpectator && !gameState.revealHandsMode;
  const isBottomTurnActive = gameState.gameStatus === 'playing' && gameState.turnPlayer === bottomRole;
  const isTopTurnActive = gameState.gameStatus === 'playing' && gameState.turnPlayer === topRole;
  const shouldHighlightTopBoard = (isSoloMode || isSpectator) && isTopTurnActive;
  const canResetGame = isSoloMode || isHost;
  const isGuestConnectionBlocked = !isSoloMode && !isSpectator && !isHost && !canInteract;
  const connectionBadgeTone = getConnectionBadgeTone(connectionState, t);
  const interactionBlockedTitle = getInteractionBlockedTitle(isGuestConnectionBlocked, connectionState, t);
  const isOwnEndStopActive = !isSoloMode && !isSpectator && gameState.endStop[role];
  const isOpponentEndStopActive = !isSoloMode && !isSpectator && gameState.endStop[topRole];
  const canShowEndStopToggle = !isSoloMode && !isSpectator && gameState.gameStatus === 'playing' && gameState.turnPlayer !== role;
  const endTurnBlockedByEndStop = !isSoloMode && !isSpectator && gameState.gameStatus === 'playing' && gameState.turnPlayer === role && isOpponentEndStopActive;
  const endTurnDisabledTitle = endTurnBlockedByEndStop
    ? t('gameBoard.board.endStopBlocked', { label: topLabel })
    : interactionBlockedTitle ?? t('gameBoard.board.endTurnDisabled');

  return {
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
    isTopTurnActive,
    shouldHighlightTopBoard,
    canResetGame,
    isGuestConnectionBlocked,
    connectionBadgeTone,
    interactionBlockedTitle,
    isOwnEndStopActive,
    isOpponentEndStopActive,
    canShowEndStopToggle,
    endTurnBlockedByEndStop,
    endTurnDisabledTitle,
  };
};
