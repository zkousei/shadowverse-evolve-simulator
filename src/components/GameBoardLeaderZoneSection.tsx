import React from 'react';
import type { CardInstance } from './Card';
import GameBoardLeaderZone from './GameBoardLeaderZone';
import type { CardDetailLookup } from '../utils/cardDetails';
import type { PlayerRole } from '../types/game';

type GameBoardLeaderZoneSectionProps = {
  playerRole: PlayerRole;
  label: string;
  zoneLabel: string;
  side: 'left' | 'right';
  extraOffset?: number;
  leaderCards: CardInstance[];
  sideZoneWidth: number;
  cardDetailLookup: CardDetailLookup;
  getHighlightTone?: (card: CardInstance) => 'attack-source' | 'attack-target' | undefined;
  onInspectCard?: (card: CardInstance, anchor: import('./Card').CardInspectAnchor) => void;
  viewerRole: PlayerRole | 'all';
  attackSourceOwner?: PlayerRole | null;
  isDebug?: boolean;
  searchLabel: string;
  onSearch: (leaderZoneId: string, zoneLabel: string) => void;
};

const GameBoardLeaderZoneSection: React.FC<GameBoardLeaderZoneSectionProps> = ({
  playerRole,
  label,
  zoneLabel,
  side,
  extraOffset = 0,
  leaderCards,
  sideZoneWidth,
  cardDetailLookup,
  getHighlightTone,
  onInspectCard,
  viewerRole,
  attackSourceOwner = null,
  isDebug = false,
  searchLabel,
  onSearch,
}) => {
  const leaderZoneId = `leader-${playerRole}`;
  const isAttackTargetLeader = attackSourceOwner ? attackSourceOwner !== playerRole : false;

  return (
    <GameBoardLeaderZone
      leaderZoneId={leaderZoneId}
      label={label}
      zoneLabel={zoneLabel}
      leaderCards={leaderCards}
      side={side}
      sideZoneWidth={sideZoneWidth}
      extraOffset={extraOffset}
      cardDetailLookup={cardDetailLookup}
      getHighlightTone={getHighlightTone}
      onInspectCard={onInspectCard}
      viewerRole={viewerRole}
      isAttackTargetLeader={isAttackTargetLeader}
      isDebug={isDebug}
      searchLabel={searchLabel}
      onSearch={() => onSearch(leaderZoneId, zoneLabel)}
    />
  );
};

export default GameBoardLeaderZoneSection;
