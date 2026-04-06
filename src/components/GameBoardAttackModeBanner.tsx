import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardAttackModeBannerProps = {
  attackerName: string;
  onCancel: () => void;
};

const GameBoardAttackModeBanner: React.FC<GameBoardAttackModeBannerProps> = ({
  attackerName,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        background: 'rgba(249, 115, 22, 0.14)',
        border: '1px solid rgba(249, 115, 22, 0.34)',
        borderRadius: '10px',
        padding: '0.7rem 0.9rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.18rem' }}>
        <div style={{ color: '#fdba74', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.04em' }}>
          {t('gameBoard.alerts.attackMode')}
        </div>
        <div style={{ color: '#f8fafc', fontSize: '0.82rem' }}>
          {t('gameBoard.alerts.attackSelect')}<strong>{attackerName}</strong>.
        </div>
      </div>
      <button
        onClick={onCancel}
        style={{
          padding: '0.35rem 0.8rem',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(255,255,255,0.16)',
          color: 'white',
          borderRadius: '999px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        {t('gameBoard.alerts.cancel')}
      </button>
    </div>
  );
};

export default GameBoardAttackModeBanner;
