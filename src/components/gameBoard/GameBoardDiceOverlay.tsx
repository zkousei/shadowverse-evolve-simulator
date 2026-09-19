import React from 'react';

type GameBoardDiceOverlayProps = {
  value: number;
};

const GameBoardDiceOverlay: React.FC<GameBoardDiceOverlayProps> = ({ value }) => (
  <div
    role="status"
    aria-live="polite"
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      pointerEvents: 'none',
    }}
  >
    <div
      style={{
        width: '120px',
        height: '120px',
        background: 'white',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '4rem',
        fontWeight: '900',
        color: '#1f2937',
        boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)',
        border: '4px solid #8b5cf6',
        animation: 'diceRoll 0.1s infinite alternate',
      }}
    >
      {value}
    </div>
    <style>{`
      @keyframes diceRoll {
        from { transform: rotate(-10deg) scale(0.9); }
        to { transform: rotate(10deg) scale(1.1); }
      }
    `}</style>
  </div>
);

export default GameBoardDiceOverlay;
