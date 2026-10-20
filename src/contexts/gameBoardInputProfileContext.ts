import React from 'react';
import type { GameBoardInputProfile } from '../utils/gameBoard/gameBoardInputProfile';
import type { GameBoardBoardDensity } from '../utils/gameBoard/gameBoardBoardDensity';
import type { GameBoardLayoutProfile } from '../utils/gameBoard/gameBoardLayout';

export type GameBoardInputProfileContextValue = {
  inputProfile: GameBoardInputProfile;
  boardDensity: GameBoardBoardDensity;
  layoutProfile?: GameBoardLayoutProfile;
};

const GameBoardInputProfileContext = React.createContext<GameBoardInputProfileContextValue>({
  inputProfile: 'fine',
  boardDensity: 'standard',
  layoutProfile: 'desktop',
});

export const useGameBoardInputProfile = () => React.useContext(GameBoardInputProfileContext).inputProfile;

export const useGameBoardBoardDensity = () => React.useContext(GameBoardInputProfileContext).boardDensity;

export const useGameBoardLayoutProfile = () => React.useContext(GameBoardInputProfileContext).layoutProfile ?? 'desktop';

export default GameBoardInputProfileContext;
