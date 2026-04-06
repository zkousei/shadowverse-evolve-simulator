import React from 'react';
import { useTranslation } from 'react-i18next';
import type { LegalSavedDeckOption } from '../utils/gameBoardSavedDecks';

type GameBoardSavedDeckPickerDialogProps = {
  targetLabel: string;
  savedDeckSearch: string;
  filteredSavedDeckOptions: LegalSavedDeckOption[];
  onBackdropClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onLoadDeck: (option: LegalSavedDeckOption) => void;
};

const GameBoardSavedDeckPickerDialog: React.FC<GameBoardSavedDeckPickerDialogProps> = ({
  targetLabel,
  savedDeckSearch,
  filteredSavedDeckOptions,
  onBackdropClick,
  onClose,
  onSearchChange,
  onLoadDeck,
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="presentation"
      data-testid="saved-deck-picker-backdrop"
      onClick={onBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('gameBoard.deckPicker.title')}
        onClick={(event) => event.stopPropagation()}
        className="glass-panel"
        style={{
          width: 'min(720px, calc(100vw - 32px))',
          maxHeight: 'min(80vh, 760px)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>{t('gameBoard.deckPicker.title')}</h3>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {t('gameBoard.deckPicker.subtitle', { label: targetLabel })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            {t('gameBoard.deckPicker.close')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={savedDeckSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('gameBoard.deckPicker.searchPlaceholder')}
            aria-label={t('gameBoard.deckPicker.searchAria')}
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '0.65rem 0.8rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              outline: 'none',
            }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {t('gameBoard.deckPicker.deckCount', { count: filteredSavedDeckOptions.length })}
          </span>
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
          {filteredSavedDeckOptions.length === 0 ? (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {t('gameBoard.deckPicker.noDecks')}
            </div>
          ) : (
            filteredSavedDeckOptions.map((option) => (
              <div
                key={option.deck.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{option.deck.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{option.summary}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>{option.counts}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onLoadDeck(option)}
                  style={{
                    padding: '0.45rem 0.7rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('gameBoard.deckPicker.load')}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GameBoardSavedDeckPickerDialog;
