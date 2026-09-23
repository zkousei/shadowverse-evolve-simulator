import React from 'react';
import { useTranslation } from 'react-i18next';
import GameBoardPlayingControls from './GameBoardPlayingControls';
import GameBoardPreparationControls from './GameBoardPreparationControls';
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
  const [isEventsOpen, setIsEventsOpen] = React.useState(false);
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
          canResetGame={canResetGame}
          onSetInitialTurnOrder={onSetInitialTurnOrder}
          onDrawInitialHand={onDrawInitialHand}
          onToggleReady={onToggleReady}
          onStartGame={onStartGame}
          onOpenReset={onOpenReset}
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
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            data-testid="gameboard-recent-events-trigger"
            onClick={() => setIsEventsOpen((prev) => !prev)}
            title={t('gameBoard.alerts.recentEvents')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: isCompactControls ? '0.2rem 0.45rem' : '0.24rem 0.55rem',
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
            <span style={{ fontSize: '0.8rem' }}>📜</span>
            <span style={{ fontWeight: 700, color: '#93c5fd', background: 'rgba(59, 130, 246, 0.25)', borderRadius: '999px', padding: '1px 6px', fontSize: '0.68rem' }}>
              {eventHistory.length}
            </span>
            <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginLeft: '1px' }}>
              {isEventsOpen ? '▲' : '▼'}
            </span>
          </button>

          <div
            data-testid="gameboard-recent-events"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 100,
              width: isCompactControls ? 'min(280px, 90vw)' : '380px',
              maxHeight: isEventsOpen ? '260px' : '0px',
              opacity: isEventsOpen ? 1 : 0,
              pointerEvents: isEventsOpen ? 'auto' : 'none',
              overflowY: 'auto',
              overflowX: 'hidden',
              background: 'rgba(15, 23, 42, 0.96)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: isEventsOpen ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
              boxShadow: isEventsOpen ? '0 12px 32px rgba(0, 0, 0, 0.6)' : 'none',
              borderRadius: '12px',
              padding: isEventsOpen ? '0.6rem 0.75rem' : '0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.35rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📜</span>
                <span>{t('gameBoard.alerts.recentEvents')}</span>
                <span style={{ fontSize: '0.68rem', color: '#93c5fd', fontWeight: 600 }}>({eventHistory.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEventsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', maxHeight: '200px' }}>
              {eventHistory.map((entry, index) => (
                <div
                  key={`${entry}-${index}`}
                  style={{
                    fontSize: '0.72rem',
                    color: index === 0 ? '#f8fafc' : '#cbd5e1',
                    lineHeight: 1.35,
                    padding: '0.25rem 0.4rem',
                    background: index === 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '6px',
                    borderLeft: index === 0 ? '3px solid #60a5fa' : '3px solid transparent',
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                  }}
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>
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
