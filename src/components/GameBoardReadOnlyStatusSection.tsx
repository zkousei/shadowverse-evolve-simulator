import React from 'react';
import GameBoardReadOnlyStatusPanel from './GameBoardReadOnlyStatusPanel';
import type { SyncState } from '../types/game';

type GameBoardReadOnlyStatusSectionProps = {
  label: string;
  playerState: SyncState['host'];
};

const GameBoardReadOnlyStatusSection: React.FC<GameBoardReadOnlyStatusSectionProps> = ({
  label,
  playerState,
}) => (
  <GameBoardReadOnlyStatusPanel
    label={label}
    hp={playerState.hp}
    pp={playerState.pp}
    maxPp={playerState.maxPp}
    ep={playerState.ep}
    sep={playerState.sep}
    combo={playerState.combo}
  />
);

export default GameBoardReadOnlyStatusSection;
