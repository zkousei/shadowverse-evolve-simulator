import React from 'react';
import Zone from './Zone';
import GameBoardHandRow from './GameBoardHandRow';
import GameBoardMulliganButton from './GameBoardMulliganButton';
import GameBoardZoneActionsSection from './GameBoardZoneActionsSection';

type ZoneAction = {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'accent';
};

type GameBoardTopHandSectionProps = {
  columns: string;
  width: number;
  centerWidth: number;
  justifyCenter?: boolean;
  minHeight?: string;
  zoneProps: React.ComponentProps<typeof Zone>;
  activeMenuId: string | null;
  onActiveMenuChange: (menuId: string | null) => void;
  showActionMenu: boolean;
  actionMenu: {
    menuId: string;
    actionsLabel: string;
    actions: ZoneAction[];
  };
  showMulliganButton?: boolean;
  mulliganLabel?: string;
  onOpenMulligan?: () => void;
  mulliganButtonStyle?: React.CSSProperties;
};

const actionMenuWrapperStyle: React.CSSProperties = {
  position: 'absolute',
  right: '10px',
  bottom: '-32px',
  width: '180px',
  zIndex: 30,
};

const GameBoardTopHandSection: React.FC<GameBoardTopHandSectionProps> = ({
  columns,
  width,
  centerWidth,
  justifyCenter = false,
  minHeight,
  zoneProps,
  activeMenuId,
  onActiveMenuChange,
  showActionMenu,
  actionMenu,
  showMulliganButton = false,
  mulliganLabel,
  onOpenMulligan,
  mulliganButtonStyle,
}) => (
  <GameBoardHandRow
    columns={columns}
    width={width}
    centerWidth={centerWidth}
    justifyCenter={justifyCenter}
    minHeight={minHeight}
  >
    <Zone {...zoneProps} />

    {showActionMenu && (
      <div style={actionMenuWrapperStyle}>
        <GameBoardZoneActionsSection
          menuId={actionMenu.menuId}
          activeMenuId={activeMenuId}
          actionsLabel={actionMenu.actionsLabel}
          actions={actionMenu.actions}
          onActiveMenuChange={onActiveMenuChange}
        />
      </div>
    )}

    {showMulliganButton && mulliganLabel && onOpenMulligan && mulliganButtonStyle && (
      <GameBoardMulliganButton
        label={mulliganLabel}
        onClick={onOpenMulligan}
        style={mulliganButtonStyle}
      />
    )}
  </GameBoardHandRow>
);

export default GameBoardTopHandSection;
