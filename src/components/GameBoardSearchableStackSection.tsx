import React from 'react';
import GameBoardSearchableZoneStack from './GameBoardSearchableZoneStack';
import Zone from './Zone';

type GameBoardSearchableStackSectionProps = {
  zoneProps: React.ComponentProps<typeof Zone>;
  searchLabel: string;
  onSearch: () => void;
  searchTitle?: string;
  isSearchInteractive?: boolean;
};

const GameBoardSearchableStackSection: React.FC<GameBoardSearchableStackSectionProps> = ({
  zoneProps,
  searchLabel,
  onSearch,
  searchTitle,
  isSearchInteractive,
}) => (
  <GameBoardSearchableZoneStack
    zone={<Zone {...zoneProps} />}
    searchLabel={searchLabel}
    onSearch={onSearch}
    searchTitle={searchTitle}
    isSearchInteractive={isSearchInteractive}
  />
);

export default GameBoardSearchableStackSection;
