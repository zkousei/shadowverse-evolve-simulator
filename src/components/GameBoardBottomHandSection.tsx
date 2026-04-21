import React from 'react';
import Zone from './Zone';
import GameBoardMulliganButton from './GameBoardMulliganButton';
import GameBoardZoneActionsSection from './GameBoardZoneActionsSection';
import { useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';

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
}) => {
  const inputProfile = useGameBoardInputProfile();
  const isCompactInput = inputProfile === 'coarse';
  const minHeight = zoneProps.containerStyle?.minHeight ?? '160px';
  const actionMenuWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    right: isCompactInput ? '8px' : '10px',
    bottom: isCompactInput ? '8px' : '-32px',
    width: isCompactInput ? '164px' : '180px',
    zIndex: 30,
  };

  return (
    <div style={{ width: `${width}px`, minHeight, position: 'relative' }}>
      <Zone {...zoneProps} />

      {showRandomDiscardMenu && (
        <div style={actionMenuWrapperStyle}>
          <GameBoardZoneActionsSection
            menuId={randomDiscardZoneActions.menuId}
            activeMenuId={activeMenuId}
            actionsLabel={randomDiscardZoneActions.actionsLabel}
            actions={randomDiscardZoneActions.actions}
            direction={isCompactInput ? 'up' : 'down'}
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
            direction={isCompactInput ? 'up' : 'down'}
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
};

export default GameBoardBottomHandSection;
