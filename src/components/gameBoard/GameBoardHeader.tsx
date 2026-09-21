import React from 'react';
import { useTranslation } from 'react-i18next';
import GameBoardPlayingControls from './GameBoardPlayingControls';
import GameBoardPreparationControls from './GameBoardPreparationControls';
import GameBoardRecentEventsPanel from './GameBoardRecentEventsPanel';
import GameBoardRoomStatus from './GameBoardRoomStatus';
import GameBoardTurnPanel from './GameBoardTurnPanel';
import type { PlayerRole, SyncState } from '../../types/game';
import type { ConnectionBadgeTone, GameBoardConnectionState } from '../../utils/gameBoard/gameBoardPresentation';
import { useGameBoardBoardDensity, useGameBoardInputProfile } from '../../contexts/gameBoardInputProfileContext';

type GameBoardHeaderProps = {
  isTabletLayout: boolean;
  room: string;
  isSoloMode: boolean;
  isHost: boolean;
  isSpectator: boolean;
  role: PlayerRole;
  status: string;
  connectionState: GameBoardConnectionState;
  spectatorCount: number;
  maxSpectatorConnections: number;
  connectionBadgeTone: ConnectionBadgeTone;
  isRoomCopied: boolean;
  gameState: SyncState;
  topRole: PlayerRole;
  bottomRole: PlayerRole;
  currentTurnLabel: string;
  isBottomTurnActive: boolean;
  canShowUndoTurn: boolean;
  canResetGame?: boolean;
  onCopyRoomId: () => void;
  onReconnect: () => void;
  onSetInitialTurnOrder: (role?: PlayerRole) => void;
  onDrawInitialHand: (role: PlayerRole) => void;
  onToggleReady: (role: PlayerRole) => void;
  onStartGame: () => void;
  onTossCoin: () => void;
  onRollDice: () => void;
  onOpenUndo: () => void;
  onOpenReset?: () => void;
  onPhaseChange: (phase: SyncState['phase']) => void;
  eventHistory?: string[];
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
  spectatorCount,
  maxSpectatorConnections,
  connectionBadgeTone,
  isRoomCopied,
  gameState,
  topRole,
  bottomRole,
  currentTurnLabel,
  isBottomTurnActive,
  canShowUndoTurn,
  canResetGame,
  onCopyRoomId,
  onReconnect,
  onSetInitialTurnOrder,
  onDrawInitialHand,
  onToggleReady,
  onStartGame,
  onTossCoin,
  onRollDice,
  onOpenUndo,
  onOpenReset,
  onPhaseChange,
  eventHistory,
}) => {
  const { t } = useTranslation();
  const inputProfile = useGameBoardInputProfile();
  const boardDensity = useGameBoardBoardDensity();
  const [isEventsOpen, setIsEventsOpen] = React.useState(true);
  const isCompactControls = inputProfile === 'coarse';
  const keepInlineCompactHeader = isCompactControls && isTabletLayout;
  const compactHeaderColumnGap = keepInlineCompactHeader ? '0.42rem' : '0.5rem';
  const compactHeaderRowGap = keepInlineCompactHeader ? '0.28rem' : '0.4rem';
  const compactHeaderPadding = keepInlineCompactHeader ? '0.42rem 0.56rem' : '0.48rem 0.62rem';
  const compactLeftBlockGap = keepInlineCompactHeader ? '0.42rem' : '0.5rem';
  const isOverviewControls = inputProfile === 'fine' && boardDensity === 'overview';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: keepInlineCompactHeader ? 'center' : isCompactControls ? 'stretch' : 'center',
        flexWrap: keepInlineCompactHeader ? 'nowrap' : isCompactControls ? 'wrap' : 'nowrap',
        columnGap: isCompactControls ? compactHeaderColumnGap : isOverviewControls ? '0.8rem' : undefined,
        rowGap: isCompactControls ? compactHeaderRowGap : isOverviewControls ? '0.32rem' : undefined,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        padding: isCompactControls ? compactHeaderPadding : isOverviewControls ? '0.42rem 0.75rem' : '0.55rem 0.85rem',
        borderRadius: '12px',
        zIndex: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: isCompactControls ? compactLeftBlockGap : isOverviewControls ? '0.8rem' : '1rem',
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
        spectatorCount={spectatorCount}
        maxSpectatorConnections={maxSpectatorConnections}
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
          canResetGame={canResetGame}
          onTossCoin={onTossCoin}
          onRollDice={onRollDice}
          onOpenUndo={onOpenUndo}
          onOpenReset={onOpenReset}
        />
      ) : null}

      {gameState.gameStatus === 'playing' && eventHistory && eventHistory.length > 0 && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => setIsEventsOpen(prev => !prev)}
            title={t('gameBoard.alerts.recentEvents')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: isCompactControls ? '0.2rem 0.4rem' : '0.24rem 0.55rem',
              fontSize: isCompactControls ? '0.68rem' : '0.74rem',
              background: isEventsOpen ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: '1px solid',
              borderColor: isEventsOpen ? 'rgba(96, 165, 250, 0.5)' : 'rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#f8fafc',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '0.76rem' }}>📜</span>
            <span style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 700 }}>
              {eventHistory.length}
            </span>
            <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginLeft: '2px' }}>{isEventsOpen ? '▲' : '▼'}</span>
          </button>

          {isEventsOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                zIndex: 60,
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              }}
            >
              <GameBoardRecentEventsPanel eventHistory={eventHistory} />
            </div>
          )}
        </div>
      )}
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
