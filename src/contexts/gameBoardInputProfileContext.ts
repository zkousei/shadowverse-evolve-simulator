import React from 'react';
import type { GameBoardInputProfile } from '../utils/gameBoardInputProfile';

const GameBoardInputProfileContext = React.createContext<GameBoardInputProfile>('fine');

export const useGameBoardInputProfile = () => React.useContext(GameBoardInputProfileContext);

export default GameBoardInputProfileContext;
