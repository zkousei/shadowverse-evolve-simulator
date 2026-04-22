import React from 'react';
import GameBoardPlayingControls from './GameBoardPlayingControls';
import GameBoardPreparationControls from './GameBoardPreparationControls';
import GameBoardRoomStatus from './GameBoardRoomStatus';
import GameBoardTurnPanel from './GameBoardTurnPanel';
import type { PlayerRole, SyncState } from '../types/game';
import type { ConnectionBadgeTone, GameBoardConnectionState } from '../utils/gameBoardPresentation';
import { useGameBoardBoardDensity, useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';

type GameBoardHeaderProps = {
  isTabletLayout: boolean;
  room: string;
  isSoloMode: boolean;
  isHost: boolean;
  isSpectator: boolean;
  role: PlayerRole;
  status: string;
  connectionState: GameBoardConnectionState;
  connectionBadgeTone: ConnectionBadgeTone;
  isRoomCopied: boolean;
  gameState: SyncState;
  topRole: PlayerRole;
  bottomRole: PlayerRole;
  currentTurnLabel: string;
  isBottomTurnActive: boolean;
  canShowUndoTurn: boolean;
  onCopyRoomId: () => void;
  onReconnect: () => void;
  onSetInitialTurnOrder: (role?: PlayerRole) => void;
  onDrawInitialHand: (role: PlayerRole) => void;
  onToggleReady: (role: PlayerRole) => void;
  onStartGame: () => void;
  onTossCoin: () => void;
  onRollDice: () => void;
  onOpenUndo: () => void;
  onPhaseChange: (phase: SyncState['phase']) => void;
};

const GameBoardHeader: React.FC<GameBoardHeaderProps> = ({
  isTabletLayout,
  room,
  isSoloMode,
  isHost,
  isSpectator,
  role,
  status,
  connectionState,
  connectionBadgeTone,
  isRoomCopied,
  gameState,
  topRole,
  bottomRole,
  currentTurnLabel,
  isBottomTurnActive,
  canShowUndoTurn,
  onCopyRoomId,
  onReconnect,
  onSetInitialTurnOrder,
  onDrawInitialHand,
  onToggleReady,
  onStartGame,
  onTossCoin,
  onRollDice,
  onOpenUndo,
  onPhaseChange,
}) => {
  const inputProfile = useGameBoardInputProfile();
  const boardDensity = useGameBoardBoardDensity();
  const isCompactControls = inputProfile === 'coarse';
  const keepInlineCompactHeader = isCompactControls && isTabletLayout;
  const isOverviewControls = inputProfile === 'fine' && boardDensity === 'overview';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: keepInlineCompactHeader ? 'center' : isCompactControls ? 'stretch' : 'center',
        flexWrap: keepInlineCompactHeader ? 'nowrap' : isCompactControls ? 'wrap' : 'nowrap',
        columnGap: isCompactControls ? '0.5rem' : isOverviewControls ? '0.8rem' : undefined,
        rowGap: isCompactControls ? '0.4rem' : isOverviewControls ? '0.32rem' : undefined,
        background: 'var(--bg-surface)',
        padding: isCompactControls ? '0.48rem 0.62rem' : isOverviewControls ? '0.6rem 0.8rem' : '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: isCompactControls ? '0.5rem' : isOverviewControls ? '0.8rem' : '1rem',
          alignItems: 'center',
          flexWrap: keepInlineCompactHeader ? 'nowrap' : isCompactControls ? 'wrap' : 'nowrap',
          minWidth: 0,
          flex: '1 1 auto',
        }}
      >
      <GameBoardRoomStatus
        room={room}
        isSoloMode={isSoloMode}
        isHost={isHost}
        status={status}
        connectionState={connectionState}
        connectionBadgeTone={connectionBadgeTone}
        isRoomCopied={isRoomCopied}
        onCopyRoomId={onCopyRoomId}
        onReconnect={onReconnect}
      />

      {!isSpectator && gameState.gameStatus === 'preparing' ? (
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
          onSetInitialTurnOrder={onSetInitialTurnOrder}
          onDrawInitialHand={onDrawInitialHand}
          onToggleReady={onToggleReady}
          onStartGame={onStartGame}
        />
      ) : !isSpectator ? (
        <GameBoardPlayingControls
          canShowUndoTurn={canShowUndoTurn}
          onTossCoin={onTossCoin}
          onRollDice={onRollDice}
          onOpenUndo={onOpenUndo}
        />
      ) : null}
      </div>

      {gameState.gameStatus === 'playing' && (
        <div
          style={{
            display: 'flex',
            flex: keepInlineCompactHeader ? undefined : isCompactControls ? '1 1 100%' : undefined,
            justifyContent: keepInlineCompactHeader ? 'flex-end' : isCompactControls ? 'flex-start' : 'flex-end',
            minWidth: 0,
          }}
        >
          <GameBoardTurnPanel
            isSoloMode={isSoloMode || isSpectator}
            isCurrentPlayerTurn={gameState.turnPlayer === role}
            currentTurnLabel={currentTurnLabel}
            turnCount={gameState.turnCount}
            phase={gameState.phase}
            isBottomTurnActive={isBottomTurnActive}
            canChangePhase={!isSpectator && (isSoloMode || gameState.turnPlayer === role)}
            onPhaseChange={onPhaseChange}
          />
        </div>
      )}
    </div>
  );
};

export default GameBoardHeader;
