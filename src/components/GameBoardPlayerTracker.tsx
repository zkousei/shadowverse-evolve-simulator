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
  compact?: boolean;
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
  compact = false,
  onAdjustStat,
  readOnly = false,
}) => {
  const { t } = useTranslation();

  const trackerContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: compact ? '0.28rem' : '0.4rem',
    marginTop: compact ? '0.45rem' : '0.8rem',
    padding: compact ? '0.45rem' : '0.6rem',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light)',
  };
  const trackerHeaderStyle: React.CSSProperties = {
    fontSize: compact ? '0.66rem' : '0.8rem',
    fontWeight: 'bold',
    color: 'white',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
  const trackerStatRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: compact ? '0.22rem' : '0.35rem',
    flexWrap: 'nowrap',
  };
  const trackerStatLabelBaseStyle: React.CSSProperties = {
    fontWeight: 'bold',
    fontSize: compact ? '0.66rem' : undefined,
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
  };
  const trackerAdjustButtonBaseStyle: React.CSSProperties = {
    minWidth: compact ? '22px' : '28px',
    minHeight: compact ? '20px' : undefined,
    padding: compact ? '1px 6px' : '2px 8px',
    borderRadius: '4px',
    border: '1px solid',
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: compact ? '0.72rem' : undefined,
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
    gap: compact ? '0.2rem' : '0.35rem',
    flexShrink: 0,
  };
  const ppSectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: compact ? '0.28rem' : '0.4rem',
    padding: compact ? '0.45rem' : '0.6rem',
    background: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  };

  return (
    <div data-testid={testId} style={trackerContainerStyle}>
      <div title={t('gameBoard.board.statusLabel', { label })} style={trackerHeaderStyle}>{t('gameBoard.board.statusLabel', { label })}</div>
      <div style={trackerStatRowStyle}>
        <span style={{ ...trackerStatLabelBaseStyle, color: '#ef4444' }}>{t('gameBoard.board.stats.hp')}: {hp}</span>
        {!readOnly && <div style={trackerButtonRowStyle}>
          <button data-testid={`${testId}-hp-increase`} onClick={() => onAdjustStat('hp', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button data-testid={`${testId}-hp-decrease`} onClick={() => onAdjustStat('hp', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>}
      </div>
      <div style={trackerStatRowStyle}>
        <span style={{ ...trackerStatLabelBaseStyle, color: '#fbbf24' }}>{t('gameBoard.board.stats.ep')}: {ep}</span>
        {!readOnly && <div style={trackerButtonRowStyle}>
          <button data-testid={`${testId}-ep-increase`} onClick={() => onAdjustStat('ep', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button data-testid={`${testId}-ep-decrease`} onClick={() => onAdjustStat('ep', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>}
      </div>
      <div style={trackerStatRowStyle}>
        <span style={{ ...trackerStatLabelBaseStyle, color: '#facc15' }}>{t('gameBoard.board.stats.sep')}: {sep}</span>
        {!readOnly && <div style={trackerButtonRowStyle}>
          <button data-testid={`${testId}-sep-increase`} onClick={() => onAdjustStat('sep', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button data-testid={`${testId}-sep-decrease`} onClick={() => onAdjustStat('sep', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>}
      </div>
      <div style={trackerStatRowStyle}>
        <span style={{ ...trackerStatLabelBaseStyle, color: '#fff' }}>{t('gameBoard.board.stats.combo')}: {combo}</span>
        {!readOnly && <div style={trackerButtonRowStyle}>
          <button data-testid={`${testId}-combo-increase`} onClick={() => onAdjustStat('combo', 1)} style={trackerIncreaseButtonStyle}>+</button>
          <button data-testid={`${testId}-combo-decrease`} onClick={() => onAdjustStat('combo', -1)} style={trackerDecreaseButtonStyle}>-</button>
        </div>}
      </div>
      <div style={ppSectionStyle}>
        <div style={trackerStatRowStyle}>
          {!readOnly && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? '1px' : '2px', flexShrink: 0 }}>
            <button data-testid={`${testId}-maxPp-increase`} onClick={() => onAdjustStat('maxPp', 1)} style={{ ...trackerIncreaseButtonStyle, width: compact ? '20px' : '24px', height: compact ? '18px' : '20px', minWidth: compact ? '20px' : '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: compact ? '0.66rem' : '0.75rem' }}>+</button>
            <span style={{ fontSize: compact ? '0.54rem' : '0.6rem', color: '#93c5fd', fontWeight: 'bold', lineHeight: 1 }}>{t('gameBoard.board.stats.max')}</span>
            <button data-testid={`${testId}-maxPp-decrease`} onClick={() => onAdjustStat('maxPp', -1)} style={{ ...trackerDecreaseButtonStyle, width: compact ? '20px' : '24px', height: compact ? '18px' : '20px', minWidth: compact ? '20px' : '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: compact ? '0.66rem' : '0.75rem' }}>-</button>
          </div>}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: compact ? '0.58rem' : '0.7rem', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: compact ? 0 : '-2px', lineHeight: 1.1 }}>{t('gameBoard.board.stats.playPoints')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px' }}>
              <span style={{ color: '#3b82f6', fontWeight: '900', fontSize: compact ? '1.2rem' : '1.75rem', lineHeight: 1 }}>{pp}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: compact ? '0.72rem' : '1rem', fontWeight: 'bold' }}>/</span>
              <span style={{ color: '#fff', fontSize: compact ? '0.92rem' : '1.25rem', fontWeight: 'bold', lineHeight: 1 }}>{maxPp}</span>
            </div>
          </div>
          {!readOnly && <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '4px' : '6px', alignItems: 'center', flexShrink: 0 }}>
            <button data-testid={`${testId}-pp-increase`} onClick={() => onAdjustStat('pp', 1)} style={{ width: compact ? '24px' : '30px', height: compact ? '24px' : '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: compact ? '0.86rem' : '1rem', color: '#3b82f6', fontWeight: 'bold' }}>∧</button>
            <button data-testid={`${testId}-pp-decrease`} onClick={() => onAdjustStat('pp', -1)} style={{ width: compact ? '24px' : '30px', height: compact ? '24px' : '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: compact ? '0.86rem' : '1rem', color: '#3b82f6', fontWeight: 'bold' }}>∨</button>
          </div>}
        </div>
      </div>
    </div>
  );
};

export default GameBoardPlayerTracker;
