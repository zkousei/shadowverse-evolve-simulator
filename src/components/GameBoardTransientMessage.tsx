import React from 'react';

type GameBoardTransientMessageTone = 'turn' | 'card-play' | 'attack';

type GameBoardTransientMessageProps = {
  message: string;
  tone: GameBoardTransientMessageTone;
};

const MESSAGE_STYLES: Record<GameBoardTransientMessageTone, React.CSSProperties> = {
  turn: {
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0,0,0,0.9)',
    color: '#f59e0b',
    padding: '2rem 4rem',
    borderRadius: 'var(--radius-lg)',
    border: '4px double #f59e0b',
    fontSize: '3rem',
    fontWeight: '900',
    zIndex: 2000,
    boxShadow: '0 0 30px rgba(245,158,11,0.4)',
    textShadow: '0 0 10px rgba(0,0,0,0.5)',
    pointerEvents: 'none',
    letterSpacing: '8px',
  },
  'card-play': {
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(15, 23, 42, 0.96)',
    color: '#eff6ff',
    padding: '0.8rem 1.2rem',
    borderRadius: '12px',
    border: '1px solid rgba(59, 130, 246, 0.45)',
    fontSize: '0.98rem',
    fontWeight: 'bold',
    zIndex: 1975,
    boxShadow: '0 12px 28px rgba(0,0,0,0.32)',
    pointerEvents: 'none',
    textAlign: 'center',
    maxWidth: 'min(90vw, 560px)',
  },
  attack: {
    top: '27%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(15, 23, 42, 0.95)',
    color: '#fdba74',
    padding: '1rem 1.7rem',
    borderRadius: '14px',
    border: '2px solid rgba(249, 115, 22, 0.55)',
    fontSize: '1rem',
    fontWeight: 'bold',
    zIndex: 1950,
    boxShadow: '0 0 24px rgba(249,115,22,0.24)',
    pointerEvents: 'none',
    textAlign: 'center',
  },
};

const GameBoardTransientMessage: React.FC<GameBoardTransientMessageProps> = ({
  message,
  tone,
}) => (
  <div
    role="status"
    aria-live="polite"
    style={{
      position: 'fixed',
      ...MESSAGE_STYLES[tone],
    }}
  >
    {message}
  </div>
);

export default GameBoardTransientMessage;
