import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { DeckValidationMessage } from '../../utils/deckBuilder/deckBuilderRules';

type DeckIssueParams = Record<string, string | number> & {
  deck?: string;
  deckI18nKey?: string;
  format?: string;
};

const buildTranslatedDeckIssueParams = (
  params: DeckValidationMessage['params'],
  t: ReturnType<typeof useTranslation>['t']
): DeckIssueParams => {
  const nextParams: DeckIssueParams = { ...(params ?? {}) };

  if (nextParams.deckI18nKey) {
    nextParams.deck = t(nextParams.deckI18nKey);
  }

  if (
    typeof nextParams.format === 'string'
    && ['constructed', 'crossover', 'other'].includes(nextParams.format)
  ) {
    nextParams.format = t(`deckBuilder.deckRule.formats.${nextParams.format}`);
  }

  return nextParams;
};

const DeckBuilderValidationStatus: React.FC<{ messages: DeckValidationMessage[] }> = ({ messages }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const detailsRef = React.useRef<HTMLButtonElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const isLegal = messages.length === 0;
  const summary = t(isLegal ? 'deckBuilder.deckRule.legalSummary' : 'deckBuilder.deckRule.illegalSummary', { count: messages.length });

  React.useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const trigger = detailsRef.current;
    return () => { trigger?.focus(); };
  }, [isOpen]);

  return (
    <>
      <div style={{ height: '3.5rem', minHeight: '3.5rem', flexShrink: 0, boxSizing: 'border-box',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
        <span role="status" aria-label={t('deckBuilder.deckRule.validationStatusAria')} title={summary}
          style={{ color: isLegal ? 'var(--vivid-green-cyan)' : '#ef4444', fontSize: '0.875rem', fontWeight: 700,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {summary}
        </span>
        <button ref={detailsRef} type="button" aria-haspopup="dialog" aria-expanded={isOpen}
          aria-label={t('deckBuilder.deckRule.validationDetailsAria')} onClick={() => setIsOpen(true)}
          style={{ padding: '0.375rem 0.5rem', color: 'var(--text-main)', border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          {t('deckBuilder.deckRule.validationDetails')}
        </button>
      </div>
      {isOpen && createPortal(
        <div onClick={event => { if (event.target === event.currentTarget) setIsOpen(false); }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setIsOpen(false);
            } else if (event.key === 'Tab') {
              // Keep focus in the dialog while allowing keyboard access to
              // scroll long validation results (the other focusable control).
              event.preventDefault();
              const next = document.activeElement === closeRef.current ? resultsRef.current : closeRef.current;
              next?.focus();
            }
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem', boxSizing: 'border-box', background: 'rgba(15, 23, 42, 0.72)' }}>
          <div role="dialog" aria-modal="true" aria-label={t('deckBuilder.deckRule.validationDialogTitle')}
            className="glass-panel" style={{ width: '100%', maxWidth: '32rem', maxHeight: 'calc(100dvh - 3rem)',
              boxSizing: 'border-box', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
              <h3 style={{ margin: 0 }}>{t('deckBuilder.deckRule.validationDialogTitle')}</h3>
              <button ref={closeRef} type="button" onClick={() => setIsOpen(false)}
                style={{ color: 'var(--text-main)', padding: '0.5rem', flexShrink: 0 }}>
                {t('common.buttons.close')}
              </button>
            </div>
            <div ref={resultsRef} tabIndex={0} role="region" aria-label={t('deckBuilder.deckRule.validationResults')}
              style={{ overflowY: 'auto', minHeight: 0, overscrollBehavior: 'contain' }}>
              {isLegal ? (
                <p style={{ margin: 0, color: 'var(--vivid-green-cyan)', lineHeight: 1.5 }}>{t('deckBuilder.deckRule.legalReady')}</p>
              ) : (
                <>
                  <p style={{ margin: '0 0 0.75rem', color: '#ef4444', fontWeight: 700, lineHeight: 1.5 }}>
                    {t('deckBuilder.deckRule.resolveBeforeExport')}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-main)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                    {messages.map(message => {
                      const params = buildTranslatedDeckIssueParams(message.params, t);
                      return <li key={message.id + JSON.stringify(params)} style={{ marginBottom: '0.5rem', overflowWrap: 'anywhere' }}>
                        {t(message.id, params)}
                      </li>;
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>, document.body,
      )}
    </>
  );
};

export default DeckBuilderValidationStatus;
