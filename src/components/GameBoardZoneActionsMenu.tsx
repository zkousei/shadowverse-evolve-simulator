import React from 'react';

type ZoneAction = {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'accent';
};

type GameBoardZoneActionsMenuProps = {
  actionsLabel: string;
  isOpen: boolean;
  actions: ZoneAction[];
  direction?: 'down' | 'up';
  onToggle: () => void;
  onActionClick: (action: () => void) => void;
};

const GameBoardZoneActionsMenu: React.FC<GameBoardZoneActionsMenuProps> = ({
  actionsLabel,
  isOpen,
  actions,
  direction = 'down',
  onToggle,
  onActionClick,
}) => (
  <div style={{ position: 'relative', zIndex: isOpen ? 60 : 5 }}>
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        fontSize: '0.75rem',
        padding: '4px',
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-light)',
        color: 'white',
        borderRadius: '4px',
        cursor: 'pointer',
        position: 'relative',
        zIndex: 61,
      }}
    >
      {actionsLabel}
    </button>
    {isOpen && (
      <div
        style={{
          position: 'absolute',
          top: direction === 'down' ? 'calc(100% + 4px)' : 'auto',
          bottom: direction === 'up' ? 'calc(100% + 4px)' : 'auto',
          left: 0,
          right: 0,
          zIndex: 62,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '6px',
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid var(--border-light)',
          borderRadius: '6px',
          boxShadow: '0 10px 20px rgba(0,0,0,0.35)',
        }}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onActionClick(action.onClick)}
            style={{
              fontSize: '0.75rem',
              padding: '5px 6px',
              background: action.tone === 'accent' ? '#3b82f6' : 'var(--bg-surface-elevated)',
              border: `1px solid ${action.tone === 'accent' ? '#2563eb' : 'var(--border-light)'}`,
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    )}
  </div>
);

export default GameBoardZoneActionsMenu;
