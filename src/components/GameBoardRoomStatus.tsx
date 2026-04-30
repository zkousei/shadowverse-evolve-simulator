import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameBoardBoardDensity, useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';

type ConnectionBadgeTone = {
  background: string;
  border: string;
  color: string;
  label: string;
};

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type GameBoardRoomStatusProps = {
  room: string;
  isSoloMode: boolean;
  isHost: boolean;
  status: string;
  connectionState: ConnectionState;
  spectatorCount?: number;
  maxSpectatorConnections?: number;
  connectionBadgeTone: ConnectionBadgeTone;
  isRoomCopied: boolean;
  onCopyRoomId: () => void;
  onReconnect: () => void;
};

const GameBoardRoomStatus: React.FC<GameBoardRoomStatusProps> = ({
  room,
  isSoloMode,
  isHost,
  status,
  connectionState,
  spectatorCount = 0,
  maxSpectatorConnections = 0,
  connectionBadgeTone,
  isRoomCopied,
  onCopyRoomId,
  onReconnect,
}) => {
  const { t } = useTranslation();
  const inputProfile = useGameBoardInputProfile();
  const boardDensity = useGameBoardBoardDensity();
  const isCompactControls = inputProfile === 'coarse';
  const isOverviewControls = inputProfile === 'fine' && boardDensity === 'overview';
  const pillFontSize = isCompactControls ? '0.62rem' : isOverviewControls ? '0.58rem' : '0.72rem';
  const statusFontSize = isCompactControls ? '0.66rem' : isOverviewControls ? '0.8rem' : undefined;
  const buttonPadding = isCompactControls ? '0.2rem 0.4rem' : isOverviewControls ? '0.22rem 0.44rem' : '0.28rem 0.55rem';

  return (
    <div
      data-testid="gameboard-room-status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isCompactControls ? '0.4rem' : isOverviewControls ? '0.48rem' : '0.6rem',
        flexWrap: isCompactControls ? 'wrap' : 'nowrap',
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: isCompactControls ? '0.68rem' : isOverviewControls ? '0.8rem' : undefined, lineHeight: 1.2 }}>
        {isSoloMode ? t('gameBoard.header.mode') : t('gameBoard.header.room')}:{' '}
        <strong>{isSoloMode ? t('gameBoard.header.soloPlayBeta') : room}</strong>
      </span>
      {!isSoloMode && (
        <button
          type="button"
          onClick={onCopyRoomId}
          style={{
            padding: buttonPadding,
            background: isRoomCopied ? 'rgba(16, 185, 129, 0.18)' : '#334155',
            color: isRoomCopied ? '#d1fae5' : 'white',
            border: `1px solid ${isRoomCopied ? 'rgba(16, 185, 129, 0.38)' : 'rgba(255,255,255,0.14)'}`,
            borderRadius: '999px',
            cursor: 'pointer',
            fontSize: pillFontSize,
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
          }}
          title={t('gameBoard.room.copyAria')}
        >
          {isRoomCopied ? t('gameBoard.room.copied') : t('gameBoard.room.copy')}
        </button>
      )}
      {isSoloMode && (
        <span
          style={{
            fontSize: isCompactControls ? '0.68rem' : isOverviewControls ? '0.6rem' : '0.75rem',
            fontWeight: 'bold',
            color: '#111827',
            background: '#f59e0b',
            padding: isOverviewControls ? '0.16rem 0.36rem' : '0.2rem 0.45rem',
            borderRadius: '999px',
            whiteSpace: 'nowrap',
          }}
        >
          {t('home.cards.soloPlay.badge')}
        </span>
      )}
      {!isSoloMode && (
        <span
          style={{
            padding: isOverviewControls ? '0.18rem 0.44rem' : '0.22rem 0.55rem',
            borderRadius: '999px',
            border: `1px solid ${connectionBadgeTone.border}`,
            background: connectionBadgeTone.background,
            color: connectionBadgeTone.color,
            fontSize: pillFontSize,
            fontWeight: 'bold',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {connectionBadgeTone.label}
        </span>
      )}
      {!isSoloMode && isHost && maxSpectatorConnections > 0 && (
        <span
          data-testid="spectator-count-badge"
          style={{
            padding: isOverviewControls ? '0.18rem 0.44rem' : '0.22rem 0.55rem',
            borderRadius: '999px',
            border: '1px solid rgba(125, 211, 252, 0.36)',
            background: 'rgba(14, 165, 233, 0.12)',
            color: '#bae6fd',
            fontSize: pillFontSize,
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          {t('gameBoard.room.spectators', {
            count: spectatorCount,
            max: maxSpectatorConnections,
          })}
        </span>
      )}
      <span
        style={{
          color: isSoloMode ? 'var(--vivid-green-cyan)' : 'var(--text-muted)',
          fontSize: statusFontSize,
          lineHeight: 1.2,
          minWidth: 0,
          whiteSpace: isCompactControls ? 'normal' : undefined,
          overflowWrap: isCompactControls ? 'anywhere' : undefined,
        }}
      >
        {status}
      </span>
      {!isSoloMode && !isHost && connectionState !== 'connected' && (
        <button
          onClick={onReconnect}
          disabled={connectionState === 'connecting'}
          title={connectionState === 'connecting' ? t('gameBoard.header.reconnectMessageConnecting') : t('gameBoard.header.reconnectMessageRetry')}
          style={{
            padding: isCompactControls ? '0.25rem 0.5rem' : isOverviewControls ? '0.24rem 0.48rem' : '0.3rem 0.6rem',
            background: '#334155',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '4px',
            cursor: connectionState === 'connecting' ? 'not-allowed' : 'pointer',
            fontSize: isCompactControls ? '0.68rem' : isOverviewControls ? '0.6rem' : '0.75rem',
            opacity: connectionState === 'connecting' ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {connectionState === 'reconnecting' ? t('gameBoard.header.reconnectNow') : t('gameBoard.header.reconnect')}
        </button>
      )}
    </div>
  );
};

export default GameBoardRoomStatus;
