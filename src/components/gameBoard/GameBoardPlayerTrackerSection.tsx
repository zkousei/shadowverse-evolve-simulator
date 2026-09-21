import React from 'react';
import GameBoardPlayerTracker from './GameBoardPlayerTracker';
import type { SyncState } from '../../types/game';

type GameBoardPlayerTrackerSectionProps = {
  testId: string;
  label: string;
  playerState: SyncState['host'];
  compact?: boolean;
  onAdjustStat: (
    stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep',
    delta: number
  ) => void;
  readOnly?: boolean;
  containerStyle?: React.CSSProperties;
};

const GameBoardPlayerTrackerSection: React.FC<GameBoardPlayerTrackerSectionProps> = ({
  testId,
  label,
  playerState,
  compact = false,
  onAdjustStat,
  readOnly = false,
  containerStyle,
}) => (
  <GameBoardPlayerTracker
    testId={testId}
    label={label}
    hp={playerState.hp}
    ep={playerState.ep}
    sep={playerState.sep}
    pp={playerState.pp}
    maxPp={playerState.maxPp}
    compact={compact}
    onAdjustStat={onAdjustStat}
    readOnly={readOnly}
    containerStyle={containerStyle}
  />
);

export default GameBoardPlayerTrackerSection;
