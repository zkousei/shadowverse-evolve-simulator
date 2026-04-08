import React from 'react';
import GameBoardPlayingControls from './GameBoardPlayingControls';
import GameBoardPreparationControls from './GameBoardPreparationControls';
import GameBoardRoomStatus from './GameBoardRoomStatus';
import GameBoardTurnPanel from './GameBoardTurnPanel';
import type { PlayerRole, SyncState } from '../types/game';
import type { ConnectionBadgeTone, GameBoardConnectionState } from '../utils/gameBoardPresentation';

type GameBoardHeaderProps = {
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
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'var(--bg-surface)',
      padding: '0.75rem 1rem',
      borderRadius: 'var(--radius-md)',
    }}
  >
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
    )}
  </div>
);

export default GameBoardHeader;
