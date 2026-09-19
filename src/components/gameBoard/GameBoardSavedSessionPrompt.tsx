import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardSavedSessionPromptProps = {
  savedSessionTimestamp: string | null;
  onDiscard: () => void;
  onResume: () => void;
};

const GameBoardSavedSessionPrompt: React.FC<GameBoardSavedSessionPromptProps> = ({
  savedSessionTimestamp,
  onDiscard,
  onResume,
}) => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        marginTop: '-0.35rem',
        background: 'rgba(59, 130, 246, 0.12)',
        border: '1px solid rgba(59, 130, 246, 0.32)',
        color: '#dbeafe',
        borderRadius: '10px',
        padding: '0.75rem 0.9rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <strong style={{ fontSize: '0.88rem' }}>{t('gameBoard.alerts.previousSession')}</strong>
        <span style={{ fontSize: '0.78rem', color: '#bfdbfe' }}>
          {savedSessionTimestamp
            ? t('gameBoard.alerts.previousSessionTime', { time: savedSessionTimestamp })
            : t('gameBoard.alerts.previousSessionUnknown')}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <button
          onClick={onDiscard}
          style={{
            padding: '0.45rem 0.9rem',
            background: 'transparent',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          {t('gameBoard.alerts.discard')}
        </button>
        <button
          onClick={onResume}
          style={{
            padding: '0.45rem 0.9rem',
            background: '#3b82f6',
            color: 'white',
            border: '1px solid #2563eb',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {t('gameBoard.alerts.resume')}
        </button>
      </div>
    </div>
  );
};

export default GameBoardSavedSessionPrompt;
