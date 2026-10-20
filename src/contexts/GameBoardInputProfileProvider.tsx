import React from 'react';
import type { GameBoardInputProfile } from '../utils/gameBoard/gameBoardInputProfile';
import type { GameBoardBoardDensity } from '../utils/gameBoard/gameBoardBoardDensity';
import type { GameBoardLayoutProfile } from '../utils/gameBoard/gameBoardLayout';
import GameBoardInputProfileContext from './gameBoardInputProfileContext';

type GameBoardInputProfileProviderProps = {
  value: GameBoardInputProfile;
  boardDensity?: GameBoardBoardDensity;
  layoutProfile?: GameBoardLayoutProfile;
  children: React.ReactNode;
};

const GameBoardInputProfileProvider: React.FC<GameBoardInputProfileProviderProps> = ({
  value,
  boardDensity = 'standard',
  layoutProfile = 'desktop',
  children,
}) => (
  <GameBoardInputProfileContext.Provider value={{ inputProfile: value, boardDensity, layoutProfile }}>
    {children}
  </GameBoardInputProfileContext.Provider>
);

export default GameBoardInputProfileProvider;
