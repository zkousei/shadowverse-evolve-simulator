import React from 'react';
import Zone from './Zone';
import type { CardInspectAnchor, CardInstance } from './Card';
import type { CardDetailLookup } from '../utils/cardDetails';
import type { PlayerRole } from '../types/game';

type GameBoardLeaderZoneProps = {
  leaderZoneId: string;
  label: string;
  zoneLabel: string;
  leaderCards: CardInstance[];
  side: 'left' | 'right';
  sideZoneWidth: number;
  extraOffset?: number;
  cardDetailLookup: CardDetailLookup;
  getHighlightTone?: (card: CardInstance) => 'attack-source' | 'attack-target' | undefined;
  onInspectCard?: (card: CardInstance, anchor: CardInspectAnchor) => void;
  viewerRole?: PlayerRole | 'all' | 'spectator';
  isAttackTargetLeader: boolean;
  isDebug?: boolean;
  searchLabel: string;
  onSearch: () => void;
};

const GameBoardLeaderZone: React.FC<GameBoardLeaderZoneProps> = ({
  leaderZoneId,
  label,
  zoneLabel,
  leaderCards,
  side,
  sideZoneWidth,
  extraOffset = 0,
  cardDetailLookup,
  getHighlightTone,
  onInspectCard,
  viewerRole,
  isAttackTargetLeader,
  isDebug = false,
  searchLabel,
  onSearch,
}) => (
  <div
    data-leader-zone={leaderZoneId}
    data-testid={`leader-zone-${leaderZoneId}`}
    style={{
      position: 'absolute',
      top: 0,
      ...(side === 'left'
        ? { right: `calc(100% + ${12 + extraOffset}px)` }
        : { left: `calc(100% + ${12 + extraOffset}px)` }),
      width: `${sideZoneWidth}px`,
    }}
  >
    <Zone
      id={leaderZoneId}
      label={zoneLabel}
      cards={leaderCards}
      cardDetailLookup={cardDetailLookup}
      layout="stack"
      getHighlightTone={getHighlightTone}
      onInspectCard={onInspectCard}
      viewerRole={viewerRole}
      containerStyle={{
        minWidth: `${sideZoneWidth}px`,
        minHeight: '150px',
        border: isAttackTargetLeader ? '2px solid rgba(250, 204, 21, 0.65)' : undefined,
        boxShadow: isAttackTargetLeader ? '0 0 18px rgba(250, 204, 21, 0.18)' : undefined,
      }}
      isDebug={isDebug}
    />
    {leaderCards.length >= 2 && (
      <button
        aria-label={`${label} leader search`}
        onClick={onSearch}
        style={{
          width: '100%',
          marginTop: '4px',
          fontSize: '0.75rem',
          padding: '4px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-light)',
          color: 'white',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {searchLabel}
      </button>
    )}
  </div>
);

export default GameBoardLeaderZone;
