import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameBoardBoardDensity, useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';

type GameBoardPlayingControlsProps = {
  canShowUndoTurn: boolean;
  onTossCoin: () => void;
  onRollDice: () => void;
  onOpenUndo: () => void;
};

const GameBoardPlayingControls: React.FC<GameBoardPlayingControlsProps> = ({
  canShowUndoTurn,
  onTossCoin,
  onRollDice,
  onOpenUndo,
}) => {
  const { t } = useTranslation();
  const inputProfile = useGameBoardInputProfile();
  const boardDensity = useGameBoardBoardDensity();
  const isCompactControls = inputProfile === 'coarse';
  const isOverviewControls = inputProfile === 'fine' && boardDensity === 'overview';
  const compactButtonStyle: React.CSSProperties = isCompactControls
    ? { padding: '0.23rem 0.4rem', fontSize: '0.68rem', minHeight: '30px', lineHeight: 1.15 }
    : isOverviewControls
      ? { padding: '0.24rem 0.48rem', fontSize: '0.7rem' }
      : { padding: '0.3rem 0.6rem', fontSize: '0.875rem' };

  return (
    <div
      data-testid="gameboard-playing-controls"
      style={{ display: 'flex', gap: isCompactControls ? '0.35rem' : isOverviewControls ? '0.32rem' : '0.4rem', flexWrap: isCompactControls ? 'wrap' : 'nowrap' }}
    >
      <button
        onClick={onTossCoin}
        style={{ ...compactButtonStyle, background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
      >
        {t('gameBoard.controls.tossCoin')}
      </button>
      <button
        onClick={onRollDice}
        style={{ ...compactButtonStyle, background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        {t('gameBoard.controls.rollDice')}
      </button>

      {canShowUndoTurn && (
        <button
          onClick={onOpenUndo}
          style={{
            ...compactButtonStyle,
            background: '#ec4899',
            color: 'white',
            fontWeight: 'bold',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {t('gameBoard.turn.undo')}
        </button>
      )}
    </div>
  );
};

export default GameBoardPlayingControls;
