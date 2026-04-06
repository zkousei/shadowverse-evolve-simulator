import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardPreparationReadyStatusProps = {
  isSoloMode: boolean;
  hostInitialHandDrawn: boolean;
  guestInitialHandDrawn: boolean;
  hostReady: boolean;
  guestReady: boolean;
};

const getReadinessLabel = (
  isReady: boolean,
  initialHandDrawn: boolean,
  readyLabel: string,
  decidingLabel: string,
  waitingLabel: string,
) => {
  if (isReady) return readyLabel;
  if (initialHandDrawn) return decidingLabel;
  return waitingLabel;
};

const GameBoardPreparationReadyStatus: React.FC<GameBoardPreparationReadyStatusProps> = ({
  isSoloMode,
  hostInitialHandDrawn,
  guestInitialHandDrawn,
  hostReady,
  guestReady,
}) => {
  const { t } = useTranslation();

  return (
    <div
      data-testid="preparation-ready-status"
      style={{ display: 'flex', gap: '0.8rem', marginLeft: '0.5rem', borderLeft: '1px solid var(--border-light)', paddingLeft: '0.8rem' }}
    >
      <div data-testid="preparation-ready-status-host" style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>{isSoloMode ? t('gameBoard.controls.p1') : t('gameBoard.controls.host')}</span>
        <span style={{ color: hostReady ? 'var(--vivid-green-cyan)' : '#ef4444', fontWeight: 'bold' }}>
          {getReadinessLabel(
            hostReady,
            hostInitialHandDrawn,
            t('gameBoard.controls.statusReady'),
            t('gameBoard.controls.statusDeciding'),
            t('gameBoard.controls.statusWaiting')
          )}
        </span>
      </div>
      <div data-testid="preparation-ready-status-guest" style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>{isSoloMode ? t('gameBoard.controls.p2') : t('gameBoard.controls.guest')}</span>
        <span style={{ color: guestReady ? 'var(--vivid-green-cyan)' : '#ef4444', fontWeight: 'bold' }}>
          {getReadinessLabel(
            guestReady,
            guestInitialHandDrawn,
            t('gameBoard.controls.statusReady'),
            t('gameBoard.controls.statusDeciding'),
            t('gameBoard.controls.statusWaiting')
          )}
        </span>
      </div>
    </div>
  );
};

export default GameBoardPreparationReadyStatus;
