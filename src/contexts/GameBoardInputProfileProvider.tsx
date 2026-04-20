import React from 'react';
import type { GameBoardInputProfile } from '../utils/gameBoardInputProfile';
import GameBoardInputProfileContext from './gameBoardInputProfileContext';

type GameBoardInputProfileProviderProps = {
  value: GameBoardInputProfile;
  children: React.ReactNode;
};

const GameBoardInputProfileProvider: React.FC<GameBoardInputProfileProviderProps> = ({
  value,
  children,
}) => (
  <GameBoardInputProfileContext.Provider value={value}>
    {children}
  </GameBoardInputProfileContext.Provider>
);

export default GameBoardInputProfileProvider;
