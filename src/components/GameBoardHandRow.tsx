import React from 'react';

type GameBoardHandRowProps = {
  columns: string;
  width: number;
  centerWidth: number;
  justifyCenter?: boolean;
  minHeight?: string;
  children: React.ReactNode;
};

const GameBoardHandRow: React.FC<GameBoardHandRowProps> = ({
  columns,
  width,
  centerWidth,
  justifyCenter = false,
  minHeight,
  children,
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: columns,
      gap: '0.75rem',
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
