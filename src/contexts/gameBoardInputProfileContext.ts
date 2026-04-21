import React from 'react';
import type { GameBoardInputProfile } from '../utils/gameBoardInputProfile';
import type { GameBoardBoardDensity } from '../utils/gameBoardBoardDensity';

export type GameBoardInputProfileContextValue = {
  inputProfile: GameBoardInputProfile;
  boardDensity: GameBoardBoardDensity;
};

const GameBoardInputProfileContext = React.createContext<GameBoardInputProfileContextValue>({
  inputProfile: 'fine',
  boardDensity: 'standard',
});

export const useGameBoardInputProfile = () => React.useContext(GameBoardInputProfileContext).inputProfile;

export const useGameBoardBoardDensity = () => React.useContext(GameBoardInputProfileContext).boardDensity;

export default GameBoardInputProfileContext;
