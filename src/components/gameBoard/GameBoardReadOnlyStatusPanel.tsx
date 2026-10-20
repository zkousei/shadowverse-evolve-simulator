import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameBoardLayoutProfile } from '../../contexts/gameBoardInputProfileContext';

type GameBoardReadOnlyStatusPanelProps = {
  label: string;
  hp: number;
  pp: number;
  maxPp: number;
  ep: number;
  sep: number;
};

const GameBoardReadOnlyStatusPanel: React.FC<GameBoardReadOnlyStatusPanelProps> = ({
  label,
  hp,
  pp,
  maxPp,
  ep,
  sep,
}) => {
  const { t } = useTranslation();
  const layoutProfile = useGameBoardLayoutProfile();
  const isMobileLayout = layoutProfile === 'mobile';
  const statItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#fff',
    fontSize: isMobileLayout ? '0.68rem' : '0.95rem',
    lineHeight: isMobileLayout ? 1.15 : undefined,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      data-testid="readonly-status-panel"
      data-compact={String(isMobileLayout)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobileLayout ? '0.2rem' : '0.55rem',
        padding: isMobileLayout ? '0.32rem 0.42rem' : '0.9rem 1rem',
        background: 'rgba(0, 0, 0, 0.55)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div
        style={{
          fontSize: isMobileLayout ? '0.64rem' : '0.8rem',
          fontWeight: 'bold',
          color: '#fff',
          lineHeight: isMobileLayout ? 1.1 : undefined,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {t('gameBoard.board.statusLabel', { label })}
      </div>
      <div
        data-testid="readonly-status-stats"
        style={
          isMobileLayout
            ? {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.16rem 0.35rem',
              }
            : {
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem',
              }
        }
      >
        <div style={statItemStyle}>
          <span>{t('gameBoard.board.stats.hp')}</span>
          <strong style={{ color: '#ef4444' }}>{hp}</strong>
        </div>
        <div style={statItemStyle}>
          <span>PP</span>
          <strong><span style={{ color: '#3b82f6' }}>{pp}</span> / {maxPp}</strong>
        </div>
        <div style={statItemStyle}>
          <span>{t('gameBoard.board.stats.ep')}</span>
          <strong style={{ color: '#fbbf24' }}>{ep}</strong>
        </div>
        <div style={statItemStyle}>
          <span>{t('gameBoard.board.stats.sep')}</span>
          <strong style={{ color: '#facc15' }}>{sep}</strong>
        </div>
      </div>
    </div>
  );
};

export default GameBoardReadOnlyStatusPanel;

