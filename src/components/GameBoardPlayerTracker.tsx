import React from 'react';
import { useTranslation } from 'react-i18next';

type TrackerStat = 'hp' | 'ep' | 'sep' | 'combo' | 'pp' | 'maxPp';

type GameBoardPlayerTrackerProps = {
  testId: string;
  label: string;
  hp: number;
  ep: number;
  sep: number;
  combo: number;
  pp: number;
  maxPp: number;
  onAdjustStat: (stat: TrackerStat, delta: number) => void;
  readOnly?: boolean;
};

const GameBoardPlayerTracker: React.FC<GameBoardPlayerTrackerProps> = ({
  testId,
  label,
  hp,
  ep,
  sep,
  combo,
  pp,
  maxPp,
  onAdjustStat,
  readOnly = false,
}) => {
  const { t } = useTranslation();

  const trackerAdjustButtonBaseStyle: React.CSSProperties = {
    minWidth: '28px',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid',
    color: '#f8fafc',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
  };
  const trackerIncreaseButtonStyle: React.CSSProperties = {
    ...trackerAdjustButtonBaseStyle,
    background: '#1d4ed8',
    borderColor: '#60a5fa',
  };
  const trackerDecreaseButtonStyle: React.CSSProperties = {
    ...trackerAdjustButtonBaseStyle,
    background: '#7f1d1d',
    borderColor: '#fca5a5',
  };
  const trackerButtonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.35rem',
  };

  return (
    <div data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem', padding: '0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>{t('gameBoard.board.statusLabel', { label })}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{t('gameBoard.board.stats.hp')}: {hp}</span>
        {!readOnly && <div style={trackerButtonRowStyle}>
          <button data-testid={`${testId}-hp-increase`} onClick={() => onAdjustStat('hp', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button data-testid={`${testId}-hp-decrease`} onClick={() => onAdjustStat('hp', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{t('gameBoard.board.stats.ep')}: {ep}</span>
        {!readOnly && <div style={trackerButtonRowStyle}>
          <button data-testid={`${testId}-ep-increase`} onClick={() => onAdjustStat('ep', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button data-testid={`${testId}-ep-decrease`} onClick={() => onAdjustStat('ep', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#facc15', fontWeight: 'bold' }}>{t('gameBoard.board.stats.sep')}: {sep}</span>
        {!readOnly && <div style={trackerButtonRowStyle}>
          <button data-testid={`${testId}-sep-increase`} onClick={() => onAdjustStat('sep', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button data-testid={`${testId}-sep-decrease`} onClick={() => onAdjustStat('sep', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>{t('gameBoard.board.stats.combo')}: {combo}</span>
        {!readOnly && <div style={trackerButtonRowStyle}>
          <button data-testid={`${testId}-combo-increase`} onClick={() => onAdjustStat('combo', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button data-testid={`${testId}-combo-decrease`} onClick={() => onAdjustStat('combo', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.6rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {!readOnly && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <button data-testid={`${testId}-maxPp-increase`} onClick={() => onAdjustStat('maxPp', 1)} style={{ ...trackerIncreaseButtonStyle, width: '24px', height: '20px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '0.75rem' }}>+</button>
            <span style={{ fontSize: '0.6rem', color: '#93c5fd', fontWeight: 'bold' }}>{t('gameBoard.board.stats.max')}</span>
            <button data-testid={`${testId}-maxPp-decrease`} onClick={() => onAdjustStat('maxPp', -1)} style={{ ...trackerDecreaseButtonStyle, width: '24px', height: '20px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '0.75rem' }}>-</button>
          </div>}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-2px' }}>{t('gameBoard.board.stats.playPoints')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px' }}>
              <span style={{ color: '#3b82f6', fontWeight: '900', fontSize: '1.75rem' }}>{pp}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', fontWeight: 'bold' }}>/</span>
              <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold' }}>{maxPp}</span>
            </div>
          </div>
          {!readOnly && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            <button data-testid={`${testId}-pp-increase`} onClick={() => onAdjustStat('pp', 1)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', color: '#3b82f6', fontWeight: 'bold' }}>∧</button>
            <button data-testid={`${testId}-pp-decrease`} onClick={() => onAdjustStat('pp', -1)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', color: '#3b82f6', fontWeight: 'bold' }}>∨</button>
          </div>}
        </div>
      </div>
    </div>
  );
};

export default GameBoardPlayerTracker;
