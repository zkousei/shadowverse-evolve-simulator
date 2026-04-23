import React from 'react';
import GameBoardTouchActionSheet from './GameBoardTouchActionSheet';
import GameBoardZoneSearchButton from './GameBoardZoneSearchButton';
import Zone from './Zone';

type GameBoardSearchableStackSectionProps = {
  zoneProps: React.ComponentProps<typeof Zone>;
  searchLabel: string;
  onSearch: () => void;
  searchTitle?: string;
  isSearchInteractive?: boolean;
  useTapToOpenActions?: boolean;
};

const GameBoardSearchableStackSection: React.FC<GameBoardSearchableStackSectionProps> = ({
  zoneProps,
  searchLabel,
  onSearch,
  searchTitle,
  isSearchInteractive,
  useTapToOpenActions = false,
}) => {
  const [isTouchSheetOpen, setIsTouchSheetOpen] = React.useState(false);
  const [touchSheetAnchor, setTouchSheetAnchor] = React.useState<{ x: number; y: number } | null>(null);
  const shouldUseTapToOpenActions = useTapToOpenActions;

  React.useEffect(() => {
    if (!shouldUseTapToOpenActions) {
      setIsTouchSheetOpen(false);
      setTouchSheetAnchor(null);
    }
  }, [shouldUseTapToOpenActions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <Zone
        {...zoneProps}
        onCardTapAction={(_, anchor) => {
          if (!shouldUseTapToOpenActions) return false;
          setTouchSheetAnchor(anchor);
          setIsTouchSheetOpen(true);
          return true;
        }}
        onZoneTapAction={(anchor) => {
          if (!shouldUseTapToOpenActions) return;
          setTouchSheetAnchor(anchor);
          setIsTouchSheetOpen(true);
        }}
      />
      {!shouldUseTapToOpenActions ? (
        <GameBoardZoneSearchButton
          label={searchLabel}
          onClick={onSearch}
          title={searchTitle}
          isInteractive={isSearchInteractive}
        />
      ) : null}
      <GameBoardTouchActionSheet
        isOpen={isTouchSheetOpen}
        actions={[{ label: searchLabel, onClick: onSearch, tone: 'accent' }]}
        anchor={touchSheetAnchor}
        onClose={() => {
          setIsTouchSheetOpen(false);
          setTouchSheetAnchor(null);
        }}
      />
    </div>
  );
};

export default GameBoardSearchableStackSection;
