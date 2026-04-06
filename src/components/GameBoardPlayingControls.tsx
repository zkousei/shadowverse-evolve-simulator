import React from 'react';
import { useTranslation } from 'react-i18next';

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

  return (
    <>
      <button
        onClick={onTossCoin}
        style={{ padding: '0.3rem 0.6rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
      >
        {t('gameBoard.controls.tossCoin')}
      </button>
      <button
        onClick={onRollDice}
        style={{ padding: '0.3rem 0.6rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold' }}
      >
        {t('gameBoard.controls.rollDice')}
      </button>

      {canShowUndoTurn && (
        <button
          onClick={onOpenUndo}
          style={{
            padding: '0.3rem 0.6rem',
            background: '#ec4899',
            color: 'white',
            fontWeight: 'bold',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {t('gameBoard.turn.undo')}
        </button>
      )}
    </>
  );
};

export default GameBoardPlayingControls;
