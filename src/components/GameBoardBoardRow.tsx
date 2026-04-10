import React from 'react';

type GameBoardBoardRowProps = {
  columns: string;
  width: number;
  children: React.ReactNode;
  overlay?: React.ReactNode;
};

const GameBoardBoardRow: React.FC<GameBoardBoardRowProps> = ({
  columns,
  width,
  children,
  overlay,
}) => {
  const grid = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: columns,
        gap: '0.75rem',
        width: `${width}px`,
        alignItems: 'start',
      }}
    >
      {children}
    </div>
  );

  if (!overlay) {
    return grid;
  }

  return (
    <div style={{ position: 'relative', width: `${width}px`, overflow: 'visible' }}>
      {grid}
      {overlay}
    </div>
  );
};

export default GameBoardBoardRow;
