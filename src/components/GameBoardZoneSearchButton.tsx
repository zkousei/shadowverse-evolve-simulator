import React from 'react';
import { useGameBoardBoardDensity, useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';

type GameBoardZoneSearchButtonProps = {
  label: string;
  onClick: () => void;
  title?: string;
  isInteractive?: boolean;
};

const GameBoardZoneSearchButton: React.FC<GameBoardZoneSearchButtonProps> = ({
  label,
  onClick,
  title,
  isInteractive = true,
}) => {
  const inputProfile = useGameBoardInputProfile();
  const boardDensity = useGameBoardBoardDensity();
  const isFineInput = inputProfile === 'fine';
  const isOverviewDesktop = isFineInput && boardDensity === 'overview';
  const buttonFontSize = isOverviewDesktop ? '0.66rem' : isFineInput ? '0.7rem' : '0.75rem';
  const buttonPadding = isOverviewDesktop ? '2px 4px' : isFineInput ? '3px 5px' : '4px';
  const buttonMinHeight = isOverviewDesktop ? '20px' : isFineInput ? '22px' : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        fontSize: buttonFontSize,
        padding: buttonPadding,
        minHeight: buttonMinHeight,
        lineHeight: 1.1,
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-light)',
        color: 'white',
        borderRadius: '4px',
        cursor: isInteractive ? 'pointer' : 'not-allowed',
      }}
    >
      {label}
    </button>
  );
};

export default GameBoardZoneSearchButton;
