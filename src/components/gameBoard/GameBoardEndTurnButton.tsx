import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardEndTurnButtonProps = {
  label: string;
  background: string;
  isEnabled: boolean;
  disabledTitle?: string;
  onClick: () => void;
};

const GameBoardEndTurnButton: React.FC<GameBoardEndTurnButtonProps> = ({
  label,
  background,
  isEnabled,
  disabledTitle,
  onClick,
}) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      disabled={!isEnabled}
      title={!isEnabled ? disabledTitle : undefined}
      className="glass-panel"
      style={{
        padding: '0.5rem',
        background,
        color: 'black',
        fontWeight: 'bold',
        opacity: isEnabled ? 1 : 0.5,
        cursor: isEnabled ? 'pointer' : 'not-allowed',
      }}
    >
      {t('gameBoard.board.endTurn', { label })}
    </button>
  );
};

export default GameBoardEndTurnButton;
