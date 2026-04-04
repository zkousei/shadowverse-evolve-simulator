import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardRecentEventsPanelProps = {
  eventHistory: string[];
};

const GameBoardRecentEventsPanel: React.FC<GameBoardRecentEventsPanelProps> = ({
  eventHistory,
}) => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        alignSelf: 'flex-end',
        width: 'min(320px, 100%)',
        background: 'rgba(15, 23, 42, 0.88)',
        border: '1px solid rgba(148, 163, 184, 0.22)',
        borderRadius: '12px',
        padding: '0.75rem 0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
      }}
    >
      <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.03em' }}>
        {t('gameBoard.alerts.recentEvents')}
      </div>
      {eventHistory.map((entry, index) => (
        <div
          key={`${entry}-${index}`}
          style={{
            color: index === 0 ? '#f8fafc' : '#cbd5e1',
            fontSize: '0.78rem',
            opacity: index === 0 ? 1 : 0.8,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.35,
          }}
        >
          {entry}
        </div>
      ))}
    </div>
  );
};

export default GameBoardRecentEventsPanel;
