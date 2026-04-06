import React from 'react';

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
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      fontSize: '0.75rem',
      padding: '4px',
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

export default GameBoardZoneSearchButton;
