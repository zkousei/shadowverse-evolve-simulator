import { useTranslation } from 'react-i18next';
import type { GameBoardCatalogStatus as CatalogStatus } from '../../hooks/gameBoard/useGameBoardCatalogResources';

export default function GameBoardCatalogStatus({ status, onRetry }: { status: CatalogStatus; onRetry: () => void }) {
  const { t } = useTranslation();
  if (status !== 'error') return null;
  return (
    <div role="alert" style={{ padding: '0.6rem', flexShrink: 0, color: 'var(--text-main)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
      {t('gameBoard.catalog.error')}{' '}
      <button type="button" onClick={onRetry}>{t('gameBoard.catalog.retry')}</button>
    </div>
  );
}
