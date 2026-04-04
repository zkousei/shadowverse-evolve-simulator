import React from 'react';
import { useTranslation } from 'react-i18next';

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
  connectionBadgeTone,
  isRoomCopied,
  onCopyRoomId,
  onReconnect,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <span>
        {isSoloMode ? t('gameBoard.header.mode') : t('gameBoard.header.room')}:{' '}
        <strong>{isSoloMode ? t('gameBoard.header.soloPlayBeta') : room}</strong>
      </span>
      {!isSoloMode && (
        <button
          type="button"
          onClick={onCopyRoomId}
          style={{
            padding: '0.28rem 0.55rem',
            background: isRoomCopied ? 'rgba(16, 185, 129, 0.18)' : '#334155',
            color: isRoomCopied ? '#d1fae5' : 'white',
            border: `1px solid ${isRoomCopied ? 'rgba(16, 185, 129, 0.38)' : 'rgba(255,255,255,0.14)'}`,
            borderRadius: '999px',
            cursor: 'pointer',
            fontSize: '0.72rem',
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
            fontSize: '0.75rem',
            fontWeight: 'bold',
            color: '#111827',
            background: '#f59e0b',
            padding: '0.2rem 0.45rem',
            borderRadius: '999px',
          }}
        >
          {t('home.cards.soloPlay.badge')}
        </span>
      )}
      {!isSoloMode && (
        <span
          style={{
            padding: '0.22rem 0.55rem',
            borderRadius: '999px',
            border: `1px solid ${connectionBadgeTone.border}`,
            background: connectionBadgeTone.background,
            color: connectionBadgeTone.color,
            fontSize: '0.72rem',
            fontWeight: 'bold',
            letterSpacing: '0.02em',
          }}
        >
          {connectionBadgeTone.label}
        </span>
      )}
      <span style={{ color: isSoloMode ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}>{status}</span>
      {!isSoloMode && !isHost && connectionState !== 'connected' && (
        <button
          onClick={onReconnect}
          disabled={connectionState === 'connecting'}
          title={connectionState === 'connecting' ? t('gameBoard.header.reconnectMessageConnecting') : t('gameBoard.header.reconnectMessageRetry')}
          style={{
            padding: '0.3rem 0.6rem',
            background: '#334155',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '4px',
            cursor: connectionState === 'connecting' ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            opacity: connectionState === 'connecting' ? 0.6 : 1,
          }}
        >
          {connectionState === 'reconnecting' ? t('gameBoard.header.reconnectNow') : t('gameBoard.header.reconnect')}
        </button>
      )}
    </>
  );
};

export default GameBoardRoomStatus;
