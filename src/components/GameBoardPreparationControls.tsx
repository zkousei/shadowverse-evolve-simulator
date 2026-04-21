import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerRole } from '../types/game';
import GameBoardPreparationReadyStatus from './GameBoardPreparationReadyStatus';
import { useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';

type GameBoardPreparationControlsProps = {
  isSoloMode: boolean;
  isHost: boolean;
  topRole: PlayerRole;
  bottomRole: PlayerRole;
  bottomInitialHandDrawn: boolean;
  bottomReady: boolean;
  topInitialHandDrawn: boolean;
  topReady: boolean;
  hostInitialHandDrawn: boolean;
  guestInitialHandDrawn: boolean;
  hostReady: boolean;
  guestReady: boolean;
  onSetInitialTurnOrder: (role?: PlayerRole) => void;
  onDrawInitialHand: (role: PlayerRole) => void;
  onToggleReady: (role: PlayerRole) => void;
  onStartGame: () => void;
};

const GameBoardPreparationControls: React.FC<GameBoardPreparationControlsProps> = ({
  isSoloMode,
  isHost,
  topRole,
  bottomRole,
  bottomInitialHandDrawn,
  bottomReady,
  topInitialHandDrawn,
  topReady,
  hostInitialHandDrawn,
  guestInitialHandDrawn,
  hostReady,
  guestReady,
  onSetInitialTurnOrder,
  onDrawInitialHand,
  onToggleReady,
  onStartGame,
}) => {
  const { t } = useTranslation();
  const inputProfile = useGameBoardInputProfile();
  const isCompactControls = inputProfile === 'coarse';
  const canConfigureTurnOrder = isHost || isSoloMode;
  const canStartGame = canConfigureTurnOrder && hostReady && guestReady;
  const compactButtonPadding = isCompactControls ? '0.2rem 0.36rem' : '0.3rem 0.5rem';
  const compactButtonFontSize = isCompactControls ? '0.66rem' : '0.75rem';

  return (
    <div data-testid="preparation-controls" style={{ display: 'flex', gap: isCompactControls ? '0.3rem' : '0.4rem', flexWrap: isCompactControls ? 'wrap' : 'nowrap' }}>
      <button
        onClick={() => onSetInitialTurnOrder()}
        disabled={!canConfigureTurnOrder}
        style={{ padding: compactButtonPadding, background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: compactButtonFontSize, opacity: canConfigureTurnOrder ? 1 : 0.5 }}
      >
        {t('gameBoard.controls.decideTurnOrder')}
      </button>
      <button
        onClick={() => onSetInitialTurnOrder(bottomRole)}
        disabled={!canConfigureTurnOrder}
        style={{ padding: compactButtonPadding, background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: compactButtonFontSize, opacity: canConfigureTurnOrder ? 1 : 0.5 }}
      >
        {isSoloMode ? t('gameBoard.controls.p1First') : t('gameBoard.controls.meFirst')}
      </button>
      <button
        onClick={() => onSetInitialTurnOrder(topRole)}
        disabled={!canConfigureTurnOrder}
        style={{ padding: compactButtonPadding, background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: compactButtonFontSize, opacity: canConfigureTurnOrder ? 1 : 0.5 }}
      >
        {isSoloMode ? t('gameBoard.controls.p2First') : t('gameBoard.controls.oppFirst')}
      </button>

      {!bottomInitialHandDrawn && (
        <button
          onClick={() => onDrawInitialHand(bottomRole)}
          style={{ padding: isCompactControls ? '0.24rem 0.5rem' : '0.3rem 0.6rem', background: '#3b82f6', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: compactButtonFontSize }}
        >
          {t('gameBoard.controls.drawHand')}
        </button>
      )}

      {bottomInitialHandDrawn && (
        <button
          onClick={() => onToggleReady(bottomRole)}
          style={{
            padding: isCompactControls ? '0.24rem 0.5rem' : '0.3rem 0.6rem',
            background: bottomReady ? '#ef4444' : 'var(--vivid-green-cyan)',
            color: bottomReady ? 'white' : 'black',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: compactButtonFontSize,
          }}
        >
          {bottomReady ? t('gameBoard.controls.cancelReady') : (isSoloMode ? t('gameBoard.controls.p1Ready') : t('gameBoard.controls.ready'))}
        </button>
      )}

      {isSoloMode && !topInitialHandDrawn && (
        <button
          onClick={() => onDrawInitialHand(topRole)}
          style={{ padding: isCompactControls ? '0.24rem 0.5rem' : '0.3rem 0.6rem', background: '#6366f1', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: compactButtonFontSize }}
        >
          {t('gameBoard.controls.drawP2Hand')}
        </button>
      )}

      {isSoloMode && topInitialHandDrawn && (
        <button
          onClick={() => onToggleReady(topRole)}
          style={{
            padding: isCompactControls ? '0.24rem 0.5rem' : '0.3rem 0.6rem',
            background: topReady ? '#ef4444' : '#6366f1',
            color: 'white',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: compactButtonFontSize,
          }}
        >
          {topReady ? t('gameBoard.controls.cancelP2Ready') : t('gameBoard.controls.p2Ready')}
        </button>
      )}

      <button
        onClick={onStartGame}
        disabled={!canStartGame}
        style={{
          padding: isCompactControls ? '0.24rem 0.5rem' : '0.3rem 0.6rem',
          background: 'var(--vivid-green-cyan)',
          color: 'black',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '4px',
          cursor: canStartGame ? 'pointer' : 'not-allowed',
          fontSize: compactButtonFontSize,
          opacity: canStartGame ? 1 : 0.5,
          boxShadow: canStartGame ? '0 0 10px rgba(0, 208, 132, 0.4)' : 'none',
          transition: 'all 0.2s',
        }}
        onMouseOver={(event) => {
          if (canStartGame) event.currentTarget.style.filter = 'brightness(1.1)';
        }}
        onMouseOut={(event) => {
          event.currentTarget.style.filter = 'none';
        }}
      >
        {t('gameBoard.controls.startGame')}
      </button>

      <GameBoardPreparationReadyStatus
        isSoloMode={isSoloMode}
        hostInitialHandDrawn={hostInitialHandDrawn}
        guestInitialHandDrawn={guestInitialHandDrawn}
        hostReady={hostReady}
        guestReady={guestReady}
      />
    </div>
  );
};

export default GameBoardPreparationControls;
