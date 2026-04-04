import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardPreparationPanelProps = {
  isSoloMode: boolean;
  isHost: boolean;
  hostInitialHandDrawn: boolean;
  guestInitialHandDrawn: boolean;
  hostReady: boolean;
  guestReady: boolean;
  revealHandsMode: boolean;
  onToggleRevealHandsMode: () => void;
};

const preparationStepStyle = (isDone: boolean): React.CSSProperties => ({
  padding: '0.35rem 0.7rem',
  borderRadius: '999px',
  border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255,255,255,0.12)'}`,
  background: isDone ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255,255,255,0.05)',
  color: isDone ? '#d1fae5' : '#cbd5e1',
  fontSize: '0.78rem',
  fontWeight: 'bold',
});

const preparationStatusCardStyle: React.CSSProperties = {
  flex: 1,
  minWidth: '220px',
  background: 'rgba(15, 23, 42, 0.55)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '0.7rem 0.8rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
};

const GameBoardPreparationPanel: React.FC<GameBoardPreparationPanelProps> = ({
  isSoloMode,
  isHost,
  hostInitialHandDrawn,
  guestInitialHandDrawn,
  hostReady,
  guestReady,
  revealHandsMode,
  onToggleRevealHandsMode,
}) => {
  const { t } = useTranslation();
  const bothHandsDrawn = hostInitialHandDrawn && guestInitialHandDrawn;
  const bothReady = hostReady && guestReady;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(59, 130, 246, 0.12))',
        border: '1px solid rgba(250, 204, 21, 0.22)',
        borderRadius: 'var(--radius-md)',
        padding: '0.9rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ color: '#fde68a', fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.03em' }}>
          {t('gameBoard.preparation.title')}
        </div>
        <div style={{ color: '#e5e7eb', fontSize: '0.84rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {t('gameBoard.preparation.description')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
        <span style={preparationStepStyle(bothHandsDrawn)}>
          {t('gameBoard.preparation.step1')}
        </span>
        <span style={preparationStepStyle(bothReady)}>
          {t('gameBoard.preparation.step2')}
        </span>
        <span style={preparationStepStyle(bothReady)}>
          {t('gameBoard.preparation.step3')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={preparationStatusCardStyle}>
          <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.82rem' }}>
            {isSoloMode ? t('gameBoard.controls.p1') : t('gameBoard.controls.host')}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.76rem' }}>
            {t('gameBoard.preparation.openingHand')} {hostInitialHandDrawn ? t('gameBoard.preparation.done') : t('gameBoard.preparation.pending')}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.76rem' }}>
            {t('gameBoard.preparation.ready')} {hostReady ? t('gameBoard.preparation.done') : t('gameBoard.preparation.pending')}
          </div>
        </div>

        <div style={preparationStatusCardStyle}>
          <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.82rem' }}>
            {isSoloMode ? t('gameBoard.controls.p2') : t('gameBoard.controls.guest')}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.76rem' }}>
            {t('gameBoard.preparation.openingHand')} {guestInitialHandDrawn ? t('gameBoard.preparation.done') : t('gameBoard.preparation.pending')}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.76rem' }}>
            {t('gameBoard.preparation.ready')} {guestReady ? t('gameBoard.preparation.done') : t('gameBoard.preparation.pending')}
          </div>
        </div>
      </div>

      {!isSoloMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.6rem 0.8rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>
              {t('gameBoard.preparation.revealHandsMode')}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
              {t('gameBoard.preparation.revealHandsModeDesc')}
            </div>
          </div>
          <button
            onClick={onToggleRevealHandsMode}
            disabled={!isHost}
            style={{
              padding: '4px 12px',
              background: revealHandsMode ? '#059669' : '#334155',
              color: 'white',
              borderRadius: '999px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: isHost ? 'pointer' : 'not-allowed',
              opacity: isHost ? 1 : 0.6,
              transition: 'background-color 0.2s',
            }}
          >
            {revealHandsMode ? 'ON' : 'OFF'}
          </button>
        </div>
      )}
    </div>
  );
};

export default GameBoardPreparationPanel;
