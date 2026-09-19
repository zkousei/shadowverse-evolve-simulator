import React from 'react';
import type { GameBoardInputProfile } from '../utils/gameBoard/gameBoardInputProfile';
import type { GameBoardBoardDensity } from '../utils/gameBoard/gameBoardBoardDensity';
import GameBoardInputProfileContext from './gameBoardInputProfileContext';

type GameBoardInputProfileProviderProps = {
  value: GameBoardInputProfile;
  boardDensity?: GameBoardBoardDensity;
  children: React.ReactNode;
};

const GameBoardInputProfileProvider: React.FC<GameBoardInputProfileProviderProps> = ({
  value,
  boardDensity = 'standard',
  children,
}) => (
  <GameBoardInputProfileContext.Provider value={{ inputProfile: value, boardDensity }}>
    {children}
  </GameBoardInputProfileContext.Provider>
);

export default GameBoardInputProfileProvider;
