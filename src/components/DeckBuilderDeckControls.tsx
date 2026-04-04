import React from 'react';
import { useTranslation } from 'react-i18next';
import { DECK_SORT_VALUES, type DeckSortMode } from '../utils/deckBuilderDisplay';

type DeckBuilderDeckControlsProps = {
  deckSortMode: DeckSortMode;
  onDeckSortModeChange: (value: DeckSortMode) => void;
  onOpenResetDeckDialog: () => void;
  onOpenResetBuilderDialog: () => void;
};

const DeckBuilderDeckControls: React.FC<DeckBuilderDeckControlsProps> = ({
  deckSortMode,
  onDeckSortModeChange,
  onOpenResetDeckDialog,
  onOpenResetBuilderDialog,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.5rem' }}>
        <label htmlFor="deck-sort" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {t('deckBuilder.deckArea.myDeckSort')}
        </label>
        <select
          id="deck-sort"
          aria-label={t('deckBuilder.deckArea.sortAria')}
          value={deckSortMode}
          onChange={(event) => onDeckSortModeChange(event.target.value as DeckSortMode)}
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-surface)',
            color: 'var(--text-main)',
          }}
        >
          {DECK_SORT_VALUES.map(sortMode => (
            <option key={sortMode} value={sortMode}>
              {t(`deckBuilder.deckArea.sort.${sortMode}`)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onOpenResetDeckDialog}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#fca5a5',
            border: '1px solid rgba(248, 113, 113, 0.45)',
            padding: '0.4rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('deckBuilder.deckArea.actions.reset')}
        </button>
        <button
          type="button"
          onClick={onOpenResetBuilderDialog}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(239, 68, 68, 0.18)',
            color: '#fecaca',
            border: '1px solid rgba(248, 113, 113, 0.55)',
            padding: '0.4rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('deckBuilder.modals.resetBuilder.title')}
        </button>
      </div>
    </>
  );
};

export default DeckBuilderDeckControls;
