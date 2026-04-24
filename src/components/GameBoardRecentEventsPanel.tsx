import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';

type GameBoardRecentEventsPanelProps = {
  eventHistory: string[];
};

const GameBoardRecentEventsPanel: React.FC<GameBoardRecentEventsPanelProps> = ({
  eventHistory,
}) => {
  const { t } = useTranslation();
  const inputProfile = useGameBoardInputProfile();
  const isCompact = inputProfile === 'coarse';
  const maxVisibleEvents = isCompact ? 2 : eventHistory.length;
  const visibleEvents = eventHistory.slice(0, maxVisibleEvents);
  const hiddenEventsCount = Math.max(0, eventHistory.length - visibleEvents.length);

  return (
    <div
      data-testid="gameboard-recent-events"
      style={{
        alignSelf: 'flex-end',
        width: isCompact ? 'min(240px, 100%)' : 'min(320px, 100%)',
        boxSizing: 'border-box',
        maxHeight: isCompact ? '76px' : '132px',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'rgba(15, 23, 42, 0.88)',
        border: '1px solid rgba(148, 163, 184, 0.22)',
        borderRadius: '12px',
        padding: isCompact ? '0.45rem 0.52rem' : '0.75rem 0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: isCompact ? '0.3rem' : '0.45rem',
      }}
    >
      <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: isCompact ? '0.66rem' : '0.8rem', letterSpacing: '0.03em' }}>
        {t('gameBoard.alerts.recentEvents')}
      </div>
      {visibleEvents.map((entry, index) => (
        <div
          key={`${entry}-${index}`}
          style={{
            color: index === 0 ? '#f8fafc' : '#cbd5e1',
            fontSize: isCompact ? '0.66rem' : '0.78rem',
            opacity: index === 0 ? 1 : 0.8,
            whiteSpace: 'pre-wrap',
            lineHeight: isCompact ? 1.2 : 1.35,
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
    </div>
  );
};

export default GameBoardRecentEventsPanel;
