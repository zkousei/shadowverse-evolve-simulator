import React from 'react';
import GameBoardTouchActionSheet from './GameBoardTouchActionSheet';
import GameBoardZoneSearchButton from './GameBoardZoneSearchButton';
import Zone from './Zone';

const STACK_SEARCH_ACTION_Z_INDEX = 180;

type GameBoardSearchableStackSectionProps = {
  zoneProps: React.ComponentProps<typeof Zone>;
  searchLabel: string;
  onSearch: () => void;
  searchTitle?: string;
  isSearchInteractive?: boolean;
  useTapToOpenActions?: boolean;
  actionPlacement?: 'below' | 'overlay';
};

const GameBoardSearchableStackSection: React.FC<GameBoardSearchableStackSectionProps> = ({
  zoneProps,
  searchLabel,
  onSearch,
  searchTitle,
  isSearchInteractive,
  useTapToOpenActions = false,
  actionPlacement = 'below',
}) => {
  const [isTouchSheetOpen, setIsTouchSheetOpen] = React.useState(false);
  const [touchSheetAnchor, setTouchSheetAnchor] = React.useState<{ x: number; y: number } | null>(null);
  const shouldUseTapToOpenActions = useTapToOpenActions;
  const shouldOverlayActions = actionPlacement === 'overlay' && !shouldUseTapToOpenActions;
  const searchButton = (
    <GameBoardZoneSearchButton
      label={searchLabel}
      onClick={onSearch}
      title={searchTitle}
      isInteractive={isSearchInteractive}
    />
  );

  React.useEffect(() => {
    if (!shouldUseTapToOpenActions) {
      setIsTouchSheetOpen(false);
      setTouchSheetAnchor(null);
    }
  }, [shouldUseTapToOpenActions]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: shouldOverlayActions ? '0' : '4px',
        position: shouldOverlayActions ? 'relative' : undefined,
      }}
    >
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
      {shouldOverlayActions ? (
        <div
          style={{
            position: 'absolute',
            right: '6px',
            bottom: '6px',
            width: 'min(72px, calc(100% - 12px))',
            zIndex: STACK_SEARCH_ACTION_Z_INDEX,
          }}
        >
          {searchButton}
        </div>
      ) : !shouldUseTapToOpenActions ? searchButton : null}
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
