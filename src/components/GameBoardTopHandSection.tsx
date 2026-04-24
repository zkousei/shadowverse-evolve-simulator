import React from 'react';
import Zone from './Zone';
import GameBoardHandRow from './GameBoardHandRow';
import GameBoardMulliganButton from './GameBoardMulliganButton';
import GameBoardZoneActionsSection from './GameBoardZoneActionsSection';
import { useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';

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
  rowGap?: string;
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

const GameBoardTopHandSection: React.FC<GameBoardTopHandSectionProps> = ({
  columns,
  width,
  centerWidth,
  justifyCenter = false,
  minHeight,
  rowGap,
  zoneProps,
  activeMenuId,
  onActiveMenuChange,
  showActionMenu,
  actionMenu,
  showMulliganButton = false,
  mulliganLabel,
  onOpenMulligan,
  mulliganButtonStyle,
}) => {
  const inputProfile = useGameBoardInputProfile();
  const isCompactInput = inputProfile === 'coarse';
  const actionMenuWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    right: '8px',
    bottom: '8px',
    width: isCompactInput ? '164px' : '180px',
    zIndex: 30,
  };

  return (
    <GameBoardHandRow
      columns={columns}
      width={width}
      centerWidth={centerWidth}
      justifyCenter={justifyCenter}
      minHeight={minHeight}
      rowGap={rowGap}
    >
      <Zone {...zoneProps} />

      {showActionMenu && (
        <div style={actionMenuWrapperStyle}>
          <GameBoardZoneActionsSection
            menuId={actionMenu.menuId}
            activeMenuId={activeMenuId}
            actionsLabel={actionMenu.actionsLabel}
            actions={actionMenu.actions}
            direction="down"
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
};

export default GameBoardTopHandSection;
