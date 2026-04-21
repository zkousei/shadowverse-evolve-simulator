import React from 'react';
import GameBoardPlayerTracker from './GameBoardPlayerTracker';
import type { SyncState } from '../types/game';

type GameBoardPlayerTrackerSectionProps = {
  testId: string;
  label: string;
  playerState: SyncState['host'];
  compact?: boolean;
  onAdjustStat: (
    stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo',
    delta: number
  ) => void;
  readOnly?: boolean;
};

const GameBoardPlayerTrackerSection: React.FC<GameBoardPlayerTrackerSectionProps> = ({
  testId,
  label,
  playerState,
  compact = false,
  onAdjustStat,
  readOnly = false,
}) => (
  <GameBoardPlayerTracker
    testId={testId}
    label={label}
    hp={playerState.hp}
    ep={playerState.ep}
    sep={playerState.sep}
    combo={playerState.combo}
    pp={playerState.pp}
    maxPp={playerState.maxPp}
    compact={compact}
    onAdjustStat={onAdjustStat}
    readOnly={readOnly}
  />
);

export default GameBoardPlayerTrackerSection;
