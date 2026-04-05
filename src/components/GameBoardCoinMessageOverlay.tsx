import React from 'react';

type GameBoardCoinMessageOverlayProps = {
  message: string;
};

const GameBoardCoinMessageOverlay: React.FC<GameBoardCoinMessageOverlayProps> = ({
  message,
}) => (
  <div
    role="status"
    aria-live="polite"
    style={{
      position: 'fixed',
      top: '20%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.85)',
      color: 'var(--vivid-green-cyan)',
      padding: '1.5rem 2.5rem',
      borderRadius: 'var(--radius-lg)',
      border: '2px solid var(--vivid-green-cyan)',
      fontSize: '1.25rem',
      fontWeight: 'bold',
      zIndex: 1000,
      boxShadow: 'var(--shadow-lg)',
    }}
  >
    {message}
  </div>
);

export default GameBoardCoinMessageOverlay;
