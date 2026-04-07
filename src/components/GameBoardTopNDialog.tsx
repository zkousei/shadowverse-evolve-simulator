import React from 'react';
import { useTranslation } from 'react-i18next';

type GameBoardTopNDialogProps = {
  value: number;
  onValueChange: (value: number) => void;
  onCancel: () => void;
  onConfirm: (value: number) => void;
};

const GameBoardTopNDialog: React.FC<GameBoardTopNDialogProps> = ({
  value,
  onValueChange,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [isCustomInputOpen, setIsCustomInputOpen] = React.useState(value < 1 || value > 5);
  const [customInputValue, setCustomInputValue] = React.useState(String(value));
  const presetValues = [1, 2, 3, 4, 5];

  React.useEffect(() => {
    setCustomInputValue(String(value));
  }, [value]);

  const selectPreset = (presetValue: number) => {
    onValueChange(presetValue);
    onConfirm(presetValue);
  };

  const openCustomInput = () => {
    setCustomInputValue(String(value));
    setIsCustomInputOpen(true);
  };

  const handleCustomValueChange = (rawValue: string) => {
    const nextValue = Number(rawValue);
    if (!Number.isFinite(nextValue)) {
      setCustomInputValue('');
      return;
    }
    setCustomInputValue(String(nextValue));
    onValueChange(nextValue);
  };

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('gameBoard.modals.topN.title')}
        style={{
          background: 'var(--bg-surface)',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          textAlign: 'center',
        }}
      >
        <h3 style={{ marginBottom: '1rem', color: 'white' }}>{t('gameBoard.modals.topN.title')}</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(64px, 1fr))',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {presetValues.map((presetValue) => (
            <button
              key={presetValue}
              type="button"
              onClick={() => selectPreset(presetValue)}
              style={{
                padding: '0.65rem 0.8rem',
                background: value === presetValue && !isCustomInputOpen ? 'var(--accent-primary)' : '#1f2937',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                border: value === presetValue && !isCustomInputOpen ? '1px solid var(--accent-primary)' : '1px solid #444',
                fontWeight: 'bold',
              }}
            >
              {presetValue}
            </button>
          ))}
          <button
            type="button"
            onClick={openCustomInput}
            aria-pressed={isCustomInputOpen}
            style={{
              padding: '0.65rem 0.8rem',
              background: isCustomInputOpen ? 'var(--accent-primary)' : '#1f2937',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              border: isCustomInputOpen ? '1px solid var(--accent-primary)' : '1px solid #444',
              fontWeight: 'bold',
            }}
          >
            {t('gameBoard.modals.topN.custom')}
          </button>
        </div>
        {isCustomInputOpen && (
          <input
            type="number"
            aria-label={t('gameBoard.modals.topN.customInput')}
            value={customInputValue}
            onChange={(event) => handleCustomValueChange(event.target.value)}
            min="1"
            max="50"
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              background: 'black',
              color: 'white',
              border: '1px solid #444',
              fontSize: '1.25rem',
              textAlign: 'center',
              width: '80px',
              marginBottom: '1.5rem',
            }}
          />
        )}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: '0.5rem 1.5rem', background: '#333', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
          >
            {t('common.buttons.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(isCustomInputOpen ? Number(customInputValue) : value)}
            style={{ padding: '0.5rem 1.5rem', background: 'var(--accent-primary)', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}
          >
            {t('gameBoard.modals.topN.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameBoardTopNDialog;
