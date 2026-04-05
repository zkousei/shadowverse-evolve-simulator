import React from 'react';
import { useTranslation } from 'react-i18next';

const GameBoardReconnectAlert: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      style={{
        marginTop: '-0.35rem',
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.32)',
        color: '#fde68a',
        borderRadius: '10px',
        padding: '0.6rem 0.85rem',
        fontSize: '0.82rem',
        fontWeight: 600,
      }}
    >
      {t('gameBoard.alerts.reconnectingLocked')}
    </div>
  );
};

export default GameBoardReconnectAlert;
