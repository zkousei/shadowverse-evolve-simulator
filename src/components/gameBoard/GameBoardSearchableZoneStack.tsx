import React from 'react';
import GameBoardZoneSearchButton from './GameBoardZoneSearchButton';

type GameBoardSearchableZoneStackProps = {
  zone: React.ReactNode;
  searchLabel: string;
  onSearch: () => void;
  searchTitle?: string;
  isSearchInteractive?: boolean;
};

const GameBoardSearchableZoneStack: React.FC<GameBoardSearchableZoneStackProps> = ({
  zone,
  searchLabel,
  onSearch,
  searchTitle,
  isSearchInteractive = true,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    {zone}
    <GameBoardZoneSearchButton
      label={searchLabel}
      onClick={onSearch}
      title={searchTitle}
      isInteractive={isSearchInteractive}
    />
  </div>
);

export default GameBoardSearchableZoneStack;
