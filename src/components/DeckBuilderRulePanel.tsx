import React from 'react';
import { useTranslation } from 'react-i18next';
import { CLASS, CONSTRUCTED_CLASS_VALUES, type CardClass } from '../models/class';
import { DECK_FORMAT_VALUES, type DeckFormat, type DeckRuleConfig } from '../models/deckRule';
import type { DeckValidationMessage } from '../utils/deckBuilderRules';

type DeckBuilderRulePanelProps = {
  deckRuleConfig: DeckRuleConfig;
  titles: string[];
  crossoverClassOptionsA: CardClass[];
  crossoverClassOptionsB: CardClass[];
  isRuleReady: boolean;
  deckIssueMessages: DeckValidationMessage[];
  onDeckFormatChange: (nextFormat: DeckFormat) => void;
  onDeckIdentityTypeChange: (identityType: 'class' | 'title') => void;
  onConstructedClassChange: (nextValue: string) => void;
  onConstructedTitleChange: (nextValue: string) => void;
  onCrossoverClassChange: (index: 0 | 1, nextValue: string) => void;
};

type DeckIssueParams = Record<string, string | number> & {
  deck?: string;
  deckI18nKey?: string;
  format?: string;
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const selectStyle: React.CSSProperties = {
  padding: '0.5rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-light)',
  background: 'var(--bg-surface)',
  color: 'var(--text-main)',
};

const getClassTranslationKey = (cardClass: CardClass): string => (
  Object.entries(CLASS).find(([, value]) => value === cardClass)?.[0].toLowerCase() ?? 'neutral'
);

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

const DeckBuilderRulePanel: React.FC<DeckBuilderRulePanelProps> = ({
  deckRuleConfig,
  titles,
  crossoverClassOptionsA,
  crossoverClassOptionsB,
  isRuleReady,
  deckIssueMessages,
  onDeckFormatChange,
  onDeckIdentityTypeChange,
  onConstructedClassChange,
  onConstructedTitleChange,
  onCrossoverClassChange,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <h3 style={{ marginBottom: '0.5rem' }}>{t('deckBuilder.deckRule.title')}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={fieldStyle}>
          <label htmlFor="deck-format" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('deckBuilder.deckRule.ruleFormat')}
          </label>
          <select
            id="deck-format"
            aria-label={t('deckBuilder.deckRule.aria.format')}
            value={deckRuleConfig.format}
            onChange={(event) => onDeckFormatChange(event.target.value as DeckFormat)}
            style={selectStyle}
          >
            {DECK_FORMAT_VALUES.map(format => (
              <option key={format} value={format}>
                {t(`deckBuilder.deckRule.formats.${format}`)}
              </option>
            ))}
          </select>
        </div>

        {deckRuleConfig.format === 'constructed' && (
          <>
            <div
              role="group"
              aria-label={t('deckBuilder.deckRule.aria.identityType')}
              style={{
                display: 'flex',
                background: 'var(--bg-surface)',
                padding: '0.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                gap: '0.25rem',
                alignItems: 'center',
              }}
            >
              <span style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {t('deckBuilder.deckRule.identity.type')}
              </span>
              {(['class', 'title'] as const).map(identityType => (
                <button
                  key={identityType}
                  type="button"
                  aria-pressed={deckRuleConfig.identityType === identityType}
                  onClick={() => onDeckIdentityTypeChange(identityType)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    background: deckRuleConfig.identityType === identityType ? 'var(--brand-accent)' : 'transparent',
                    color: deckRuleConfig.identityType === identityType ? '#fff' : 'var(--text-main)',
                    fontWeight: deckRuleConfig.identityType === identityType ? 'bold' : 'normal',
                  }}
                >
                  {t(`deckBuilder.deckRule.identity.${identityType}`)}
                </button>
              ))}
            </div>

            {deckRuleConfig.identityType === 'class' ? (
              <div style={fieldStyle}>
                <label htmlFor="constructed-class" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {t('deckBuilder.deckRule.selectedClass')}
                </label>
                <select
                  id="constructed-class"
                  aria-label={t('deckBuilder.deckRule.aria.constructedClass')}
                  value={deckRuleConfig.selectedClass ?? ''}
                  onChange={(event) => onConstructedClassChange(event.target.value)}
                  style={selectStyle}
                >
                  <option value="">{t('deckBuilder.deckRule.selectClass')}</option>
                  {CONSTRUCTED_CLASS_VALUES.map(cardClass => (
                    <option key={cardClass} value={cardClass}>
                      {t(`common.classes.${getClassTranslationKey(cardClass)}`)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={fieldStyle}>
                <label htmlFor="constructed-title" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {t('deckBuilder.deckRule.selectedTitle')}
                </label>
                <select
                  id="constructed-title"
                  aria-label={t('deckBuilder.deckRule.aria.constructedTitle')}
                  value={deckRuleConfig.selectedTitle ?? ''}
                  onChange={(event) => onConstructedTitleChange(event.target.value)}
                  style={selectStyle}
                >
                  <option value="">{t('deckBuilder.deckRule.selectTitle')}</option>
                  {titles.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {deckRuleConfig.format === 'crossover' && (
          <>
            <div style={fieldStyle}>
              <label htmlFor="crossover-class-a" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {t('deckBuilder.deckRule.crossoverClassA')}
              </label>
              <select
                id="crossover-class-a"
                aria-label={t('deckBuilder.deckRule.aria.crossoverClassA')}
                value={deckRuleConfig.selectedClasses[0] ?? ''}
                onChange={(event) => onCrossoverClassChange(0, event.target.value)}
                style={selectStyle}
              >
                <option value="">{t('deckBuilder.deckRule.selectFirstClass')}</option>
                {crossoverClassOptionsA.map(cardClass => (
                  <option key={cardClass} value={cardClass}>
                    {t(`common.classes.${getClassTranslationKey(cardClass)}`)}
                  </option>
                ))}
              </select>
            </div>

            <div style={fieldStyle}>
              <label htmlFor="crossover-class-b" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {t('deckBuilder.deckRule.crossoverClassB')}
              </label>
              <select
                id="crossover-class-b"
                aria-label={t('deckBuilder.deckRule.aria.crossoverClassB')}
                value={deckRuleConfig.selectedClasses[1] ?? ''}
                onChange={(event) => onCrossoverClassChange(1, event.target.value)}
                style={selectStyle}
              >
                <option value="">{t('deckBuilder.deckRule.selectSecondClass')}</option>
                {crossoverClassOptionsB.map(cardClass => (
                  <option key={cardClass} value={cardClass}>
                    {t(`common.classes.${getClassTranslationKey(cardClass)}`)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {deckRuleConfig.format === 'constructed' && !isRuleReady && (
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('deckBuilder.deckRule.promptConstructed')}
          </p>
        )}
        {deckRuleConfig.format === 'crossover' && !isRuleReady && (
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('deckBuilder.deckRule.promptCrossover')}
          </p>
        )}
        {deckIssueMessages.length > 0 && (
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#ef4444', fontSize: '0.875rem', fontWeight: 700 }}>
              {t('deckBuilder.deckRule.resolveBeforeExport')}
            </p>
            <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {deckIssueMessages.map((message) => {
                const params = buildTranslatedDeckIssueParams(message.params, t);
                return (
                  <li key={message.id + JSON.stringify(params)} style={{ marginBottom: '0.25rem' }}>
                    {t(message.id, params)}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {deckIssueMessages.length === 0 && (
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
            <p style={{ margin: 0, color: 'var(--vivid-green-cyan)', fontSize: '0.875rem', fontWeight: 700 }}>
              {t('deckBuilder.deckRule.legalReady')}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default DeckBuilderRulePanel;
