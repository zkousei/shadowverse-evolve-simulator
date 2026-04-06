import React from 'react';
import GameBoardZoneActionsMenu from './GameBoardZoneActionsMenu';

type ZoneAction = {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'accent';
};

type GameBoardZoneActionsSectionProps = {
  menuId: string;
  activeMenuId: string | null;
  actionsLabel: string;
  actions: ZoneAction[];
  direction?: 'down' | 'up';
  onActiveMenuChange: (menuId: string | null) => void;
};

const GameBoardZoneActionsSection: React.FC<GameBoardZoneActionsSectionProps> = ({
  menuId,
  activeMenuId,
  actionsLabel,
  actions,
  direction = 'down',
  onActiveMenuChange,
}) => {
  const isOpen = activeMenuId === menuId;

  return (
    <GameBoardZoneActionsMenu
      actionsLabel={actionsLabel}
      isOpen={isOpen}
      actions={actions}
      direction={direction}
      onToggle={() => onActiveMenuChange(isOpen ? null : menuId)}
      onActionClick={(action) => {
        action();
        onActiveMenuChange(null);
      }}
    />
  );
};

export default GameBoardZoneActionsSection;
