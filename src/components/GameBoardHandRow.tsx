import React from 'react';
import GameBoardBoardRow from './GameBoardBoardRow';

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
  <GameBoardBoardRow columns={columns} width={width}>
    <div />
    <div
      style={{
        width: `${centerWidth}px`,
        position: 'relative',
        minHeight,
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
  </GameBoardBoardRow>
);

export default GameBoardHandRow;
