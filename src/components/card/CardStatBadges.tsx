import React from 'react';

export interface CardStatBadgesProps {
  shouldShowCounterOverlay: boolean;
  atkCounter: number;
  hpCounter: number;
  currentStats: { atk: number; hp: number } | null;
  showGenericCounter: boolean;
  genericCounterValue: number;
  counterLabel: string;
  isTapped?: boolean;
}

export const CardStatBadges: React.FC<CardStatBadgesProps> = ({
  shouldShowCounterOverlay,
  atkCounter,
  hpCounter,
  currentStats,
  showGenericCounter,
  genericCounterValue,
  counterLabel,
  isTapped = false,
}) => {
  return (
    <>
      {/* Counters Overlay - Hide if in hand */}
      {shouldShowCounterOverlay && (
        <div style={{
          position: 'absolute', bottom: -5, right: -5,
          background: 'rgba(0,0,0,0.85)', padding: '4px 8px', borderRadius: '8px',
          border: '1px solid #fff', display: 'flex', gap: '4px', alignItems: 'center',
          fontWeight: 'bold', fontSize: '0.85rem'
        }}>
          <span style={{ color: '#fbbf24' }}>{atkCounter > 0 ? '+' : ''}{atkCounter}</span>
          <span style={{ color: '#fff' }}>/</span>
          <span style={{ color: '#ef4444' }}>{hpCounter > 0 ? '+' : ''}{hpCounter}</span>
        </div>
      )}

      {currentStats && (
        <div
          data-testid="current-stats-badge"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            zIndex: 25,
            transform: isTapped ? 'rotate(-90deg)' : undefined,
            transformOrigin: 'center center',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '999px',
            padding: '3px 7px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            color: 'white',
            pointerEvents: 'none',
            boxShadow: '0 6px 12px rgba(0,0,0,0.3)'
          }}
        >
          <span style={{ color: '#fbbf24' }}>{currentStats.atk}</span>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>/</span>
          <span style={{ color: '#f87171' }}>{currentStats.hp}</span>
        </div>
      )}

      {showGenericCounter && (
        <div
          data-testid="generic-counter-badge"
          style={{
            position: 'absolute',
            top: currentStats ? 34 : 6,
            right: 6,
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '999px',
            padding: '3px 7px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.66rem',
            fontWeight: 'bold',
            color: '#e2e8f0',
            pointerEvents: 'none',
            boxShadow: '0 6px 12px rgba(0,0,0,0.3)'
          }}
        >
          <span>{counterLabel}</span>
          <span style={{ color: '#f8fafc' }}>{genericCounterValue}</span>
        </div>
      )}
    </>
  );
};
