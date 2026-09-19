import React from 'react';

type GameBoardHandRowProps = {
  columns: string;
  width: number;
  centerWidth: number;
  justifyCenter?: boolean;
  minHeight?: string;
  rowGap?: string;
  children: React.ReactNode;
};

const GameBoardHandRow: React.FC<GameBoardHandRowProps> = ({
  columns,
  width,
  centerWidth,
  justifyCenter = false,
  minHeight,
  rowGap = '0.75rem',
  children,
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: columns,
      gap: rowGap,
      width: `${width}px`,
      alignItems: 'start',
    }}
  >
    <div />
    <div
      style={{
        width: `${centerWidth}px`,
        minHeight,
        position: 'relative',
        ...(justifyCenter
          ? {
              display: 'flex',
              justifyContent: 'center',
            }
          : null),
      }}
    >
      {children}
    </div>
    <div />
  </div>
);

export default GameBoardHandRow;
