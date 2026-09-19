import React from 'react';

type DeckBuilderSaveFeedbackProps = {
  kind: 'success' | 'warning';
  message: string;
};

const DeckBuilderSaveFeedback: React.FC<DeckBuilderSaveFeedbackProps> = ({
  kind,
  message,
}) => (
  <div
    role={kind === 'warning' ? 'alert' : 'status'}
    aria-live="polite"
    style={{
      position: 'fixed',
      top: '1.25rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1250,
      minWidth: 'min(32rem, calc(100vw - 2rem))',
      maxWidth: 'min(36rem, calc(100vw - 2rem))',
      padding: '0.8rem 1rem',
      borderRadius: 'var(--radius-md)',
      border: kind === 'warning'
        ? '1px solid rgba(248, 113, 113, 0.45)'
        : '1px solid rgba(103, 232, 249, 0.35)',
      background: kind === 'warning'
        ? 'rgba(127, 29, 29, 0.92)'
        : 'rgba(8, 47, 73, 0.92)',
      color: '#fff',
      fontSize: '0.9rem',
      fontWeight: 600,
      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.38)',
      textAlign: 'center',
    }}
  >
    {message}
  </div>
);

export default DeckBuilderSaveFeedback;
