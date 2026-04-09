import React from 'react';
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
};

const GameBoardMainDeckSection: React.FC<GameBoardMainDeckSectionProps> = ({
  zoneProps,
  menuId,
  activeMenuId,
  actionsLabel,
  actions,
  direction,
  onActiveMenuChange,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <Zone {...zoneProps} />
    {actions && actions.length > 0 ? (
      <GameBoardZoneActionsSection
        menuId={menuId}
        activeMenuId={activeMenuId}
        actionsLabel={actionsLabel}
        actions={actions}
        direction={direction}
        onActiveMenuChange={onActiveMenuChange}
      />
    ) : null}
  </div>
);

export default GameBoardMainDeckSection;
