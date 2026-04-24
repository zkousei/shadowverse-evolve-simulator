import React from 'react';
import GameBoardTouchActionSheet from './GameBoardTouchActionSheet';
import Zone from './Zone';
import GameBoardZoneActionsSection from './GameBoardZoneActionsSection';

type ZoneAction = {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'accent';
};

type GameBoardMainDeckSectionProps = {
  zoneProps: React.ComponentProps<typeof Zone>;
  menuId: string;
  activeMenuId: string | null;
  actionsLabel: string;
  actions?: ZoneAction[];
  direction?: 'down' | 'up';
  onActiveMenuChange: (menuId: string | null) => void;
  useTapToOpenActions?: boolean;
  actionPlacement?: 'below' | 'overlay';
};

const GameBoardMainDeckSection: React.FC<GameBoardMainDeckSectionProps> = ({
  zoneProps,
  menuId,
  activeMenuId,
  actionsLabel,
  actions,
  direction,
  onActiveMenuChange,
  useTapToOpenActions = false,
  actionPlacement = 'below',
}) => {
  const [isTouchSheetOpen, setIsTouchSheetOpen] = React.useState(false);
  const [touchSheetAnchor, setTouchSheetAnchor] = React.useState<{ x: number; y: number } | null>(null);
  const hasActions = Boolean(actions && actions.length > 0);
  const shouldUseTapToOpenActions = useTapToOpenActions && hasActions;
  const shouldOverlayActions = actionPlacement === 'overlay' && !shouldUseTapToOpenActions && hasActions;
  const actionsSection = hasActions ? (
    <GameBoardZoneActionsSection
      menuId={menuId}
      activeMenuId={activeMenuId}
      actionsLabel={actionsLabel}
      actions={actions as ZoneAction[]}
      direction={direction}
      menuMinWidth={shouldOverlayActions ? '154px' : undefined}
      onActiveMenuChange={onActiveMenuChange}
    />
  ) : null;

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
          onActiveMenuChange(null);
          setTouchSheetAnchor(anchor);
          setIsTouchSheetOpen(true);
          return true;
        }}
        onZoneTapAction={(anchor) => {
          if (!shouldUseTapToOpenActions) return;
          onActiveMenuChange(null);
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
            zIndex: activeMenuId === menuId ? 70 : 30,
          }}
        >
          {actionsSection}
        </div>
      ) : !shouldUseTapToOpenActions ? actionsSection : null}
      <GameBoardTouchActionSheet
        isOpen={isTouchSheetOpen}
        actions={(actions ?? []).map((action) => ({
          label: action.label,
          onClick: action.onClick,
          tone: action.tone,
        }))}
        anchor={touchSheetAnchor}
        onClose={() => {
          setIsTouchSheetOpen(false);
          setTouchSheetAnchor(null);
        }}
      />
    </div>
  );
};

export default GameBoardMainDeckSection;
