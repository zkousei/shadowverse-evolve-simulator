import React from 'react';
import { useTranslation } from 'react-i18next';

type DeckBuilderPaginationControlsProps = {
  page: number;
  totalPages: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

const DeckBuilderPaginationControls: React.FC<DeckBuilderPaginationControlsProps> = ({
  page,
  totalPages,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}) => {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={onPrev}
          className="glass-panel"
          style={{ padding: '0.5rem 1rem' }}
        >
          {t('deckBuilder.pagination.prev')}
        </button>
        <span>{page + 1} / {totalPages}</span>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={onNext}
          className="glass-panel"
          style={{ padding: '0.5rem 1rem' }}
        >
          {t('deckBuilder.pagination.next')}
        </button>
      </div>
    </div>
  );
};

export default DeckBuilderPaginationControls;
