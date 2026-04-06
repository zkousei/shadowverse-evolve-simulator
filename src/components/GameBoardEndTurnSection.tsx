import React from 'react';
import GameBoardEndTurnButton from './GameBoardEndTurnButton';
import type { PlayerRole } from '../types/game';
import type { SyncState } from '../types/game';

type GameBoardEndTurnSectionProps = {
  playerRole: PlayerRole;
  label: string;
  background: string;
  turnPlayer: SyncState['turnPlayer'];
  gameStatus: SyncState['gameStatus'];
  canInteract: boolean;
  disabledTitle: string;
  onEndTurn: (role: PlayerRole) => void;
};

const GameBoardEndTurnSection: React.FC<GameBoardEndTurnSectionProps> = ({
  playerRole,
  label,
  background,
  turnPlayer,
  gameStatus,
  canInteract,
  disabledTitle,
  onEndTurn,
}) => {
  const isCurrentTurn = turnPlayer === playerRole;
  const isEnabled = gameStatus === 'playing' && isCurrentTurn && canInteract;

  return (
    <GameBoardEndTurnButton
      label={label}
      background={background}
      isEnabled={isEnabled}
      disabledTitle={disabledTitle}
      onClick={() => onEndTurn(playerRole)}
    />
  );
};

export default GameBoardEndTurnSection;
