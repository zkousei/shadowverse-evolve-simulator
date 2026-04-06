import React from 'react';

type GameBoardMulliganButtonProps = {
  label: string;
  onClick: () => void;
  style: React.CSSProperties;
};

const GameBoardMulliganButton: React.FC<GameBoardMulliganButtonProps> = ({
  label,
  onClick,
  style,
}) => (
  <button type="button" onClick={onClick} style={style}>
    {label}
  </button>
);

export default GameBoardMulliganButton;
