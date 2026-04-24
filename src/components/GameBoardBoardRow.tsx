import React from 'react';

type GameBoardBoardRowProps = {
  columns: string;
  width: number;
  children: React.ReactNode;
  overlay?: React.ReactNode;
  rowGap?: string;
};

const GameBoardBoardRow: React.FC<GameBoardBoardRowProps> = ({
  columns,
  width,
  children,
  overlay,
  rowGap = '0.75rem',
}) => {
  const grid = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: columns,
        gap: rowGap,
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
