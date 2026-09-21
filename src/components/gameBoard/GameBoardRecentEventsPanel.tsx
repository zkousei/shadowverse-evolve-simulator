import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameBoardInputProfile } from '../../contexts/gameBoardInputProfileContext';

type GameBoardRecentEventsPanelProps = {
  eventHistory: string[];
};

const GameBoardRecentEventsPanel: React.FC<GameBoardRecentEventsPanelProps> = ({
  eventHistory,
}) => {
  const { t } = useTranslation();
  const inputProfile = useGameBoardInputProfile();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const isCompact = inputProfile === 'coarse';
  const maxVisibleEvents = isCompact ? 2 : eventHistory.length;
  const visibleEvents = eventHistory.slice(0, maxVisibleEvents);
  const hiddenEventsCount = Math.max(0, eventHistory.length - visibleEvents.length);

  return (
    <div
      data-testid="gameboard-recent-events"
      style={{
        alignSelf: 'flex-end',
        width: isCompact ? 'min(240px, 100%)' : 'min(380px, 100%)',
        boxSizing: 'border-box',
        maxHeight: isCollapsed ? 'auto' : isCompact ? '76px' : '132px',
        overflowY: isCollapsed ? 'hidden' : 'auto',
        overflowX: 'hidden',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        borderRadius: '12px',
        padding: isCompact ? '0.45rem 0.52rem' : '0.5rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: isCompact ? '0.3rem' : '0.35rem',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        onClick={() => setIsCollapsed(prev => !prev)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: isCompact ? '0.66rem' : '0.76rem', letterSpacing: '0.03em' }}>
          {t('gameBoard.alerts.recentEvents')}
        </div>
        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
          {isCollapsed ? '▼' : '▲'}
        </span>
      </div>
      {!isCollapsed && (
        <>
          {visibleEvents.map((entry, index) => (
            <div
              key={`${entry}-${index}`}
              style={{
                color: index === 0 ? '#f8fafc' : '#cbd5e1',
                fontSize: isCompact ? '0.64rem' : '0.74rem',
                opacity: index === 0 ? 1 : 0.8,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                lineHeight: isCompact ? 1.2 : 1.3,
              }}
            >
              {entry}
            </div>
          ))}
          {hiddenEventsCount > 0 && (
            <div style={{ fontSize: '0.62rem', color: '#93c5fd', fontWeight: 700 }}>
              +{hiddenEventsCount}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GameBoardRecentEventsPanel;
