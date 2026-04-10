import React from 'react';
import Zone from './Zone';
import GameBoardMulliganButton from './GameBoardMulliganButton';
import GameBoardZoneActionsSection from './GameBoardZoneActionsSection';

type ZoneAction = {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'accent';
};

type GameBoardBottomHandSectionProps = {
  width: number;
  zoneProps: React.ComponentProps<typeof Zone>;
  activeMenuId: string | null;
  onActiveMenuChange: (menuId: string | null) => void;
  showRandomDiscardMenu: boolean;
  randomDiscardZoneActions: {
    menuId: string;
    actionsLabel: string;
    actions: ZoneAction[];
  };
  showRevealHandMenu: boolean;
  revealHandZoneActions: {
    menuId: string;
    actionsLabel: string;
    actions: ZoneAction[];
  };
  showMulliganButton: boolean;
  mulliganLabel: string;
  onOpenMulligan: () => void;
  mulliganButtonStyle: React.CSSProperties;
};

const actionMenuWrapperStyle: React.CSSProperties = {
  position: 'absolute',
  right: '10px',
  bottom: '-32px',
  width: '180px',
  zIndex: 30,
};

const GameBoardBottomHandSection: React.FC<GameBoardBottomHandSectionProps> = ({
  width,
  zoneProps,
  activeMenuId,
  onActiveMenuChange,
  showRandomDiscardMenu,
  randomDiscardZoneActions,
  showRevealHandMenu,
  revealHandZoneActions,
  showMulliganButton,
  mulliganLabel,
  onOpenMulligan,
  mulliganButtonStyle,
}) => (
  <div style={{ width: `${width}px`, minHeight: '160px', position: 'relative' }}>
    <Zone {...zoneProps} />

    {showRandomDiscardMenu && (
      <div style={actionMenuWrapperStyle}>
        <GameBoardZoneActionsSection
          menuId={randomDiscardZoneActions.menuId}
          activeMenuId={activeMenuId}
          actionsLabel={randomDiscardZoneActions.actionsLabel}
          actions={randomDiscardZoneActions.actions}
          onActiveMenuChange={onActiveMenuChange}
        />
      </div>
    )}

    {showRevealHandMenu && (
      <div style={actionMenuWrapperStyle}>
        <GameBoardZoneActionsSection
          menuId={revealHandZoneActions.menuId}
          activeMenuId={activeMenuId}
          actionsLabel={revealHandZoneActions.actionsLabel}
          actions={revealHandZoneActions.actions}
          onActiveMenuChange={onActiveMenuChange}
        />
      </div>
    )}

    {showMulliganButton && (
      <GameBoardMulliganButton
        label={mulliganLabel}
        onClick={onOpenMulligan}
        style={mulliganButtonStyle}
      />
    )}
  </div>
);

export default GameBoardBottomHandSection;
