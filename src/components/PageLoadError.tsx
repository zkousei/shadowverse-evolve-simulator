import { useTranslation } from 'react-i18next';

export default function PageLoadError() {
  const { t } = useTranslation();
  return (
    <section role="alert" style={{ padding: '2rem' }}>
      <h1>{t('app.pageLoadError.title')}</h1>
      <p>{t('app.pageLoadError.message')}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t('app.pageLoadError.reload')}
      </button>
    </section>
  );
}
