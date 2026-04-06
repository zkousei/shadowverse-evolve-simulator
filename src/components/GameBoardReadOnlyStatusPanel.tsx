import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardReadOnlyStatusPanelProps = {
  label: string;
  hp: number;
  pp: number;
  maxPp: number;
  ep: number;
  sep: number;
  combo: number;
};

const GameBoardReadOnlyStatusPanel: React.FC<GameBoardReadOnlyStatusPanelProps> = ({
  label,
  hp,
  pp,
  maxPp,
  ep,
  sep,
  combo,
}) => {
  const { t } = useTranslation();

  return (
    <div style={{
      width: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.55rem',
      padding: '0.9rem 1rem',
      background: 'rgba(0, 0, 0, 0.55)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid rgba(255,255,255,0.12)',
    }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>
        {t('gameBoard.board.statusLabel', { label })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>{t('gameBoard.board.stats.hp')}</span>
        <strong style={{ color: '#ef4444' }}>{hp}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>PP</span>
        <strong><span style={{ color: '#3b82f6' }}>{pp}</span> / {maxPp}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>{t('gameBoard.board.stats.ep')}</span>
        <strong style={{ color: '#fbbf24' }}>{ep}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>{t('gameBoard.board.stats.sep')}</span>
        <strong style={{ color: '#facc15' }}>{sep}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.95rem' }}>
        <span>{t('gameBoard.board.stats.combo')}</span>
        <strong>{combo}</strong>
      </div>
    </div>
  );
};

export default GameBoardReadOnlyStatusPanel;
