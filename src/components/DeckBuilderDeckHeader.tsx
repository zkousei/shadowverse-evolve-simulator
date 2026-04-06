import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload } from 'lucide-react';
import { DEFAULT_DECK_NAME } from '../utils/deckStorage';

type DeckBuilderDeckHeaderProps = {
  deckName: string;
  canSaveCurrentDeck: boolean;
  canExportDeck: boolean;
  selectedSavedDeckId: string | null;
  saveStateMessage: string;
  draftRestored: boolean;
  hasReachedSoftLimit: boolean;
  hasReachedHardLimit: boolean;
  savedDeckCount: number;
  hardSavedDeckLimit: number;
  onDeckNameChange: (value: string) => void;
  onSave: () => void;
  onMakeUnsavedCopy: () => void;
  onOpenMyDecks: () => void;
  onImportDeck: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenDeckLogImport: () => void;
  onExportDeck: () => void;
};

const DeckBuilderDeckHeader: React.FC<DeckBuilderDeckHeaderProps> = ({
  deckName,
  canSaveCurrentDeck,
  canExportDeck,
  selectedSavedDeckId,
  saveStateMessage,
  draftRestored,
  hasReachedSoftLimit,
  hasReachedHardLimit,
  savedDeckCount,
  hardSavedDeckLimit,
  onDeckNameChange,
  onSave,
  onMakeUnsavedCopy,
  onOpenMyDecks,
  onImportDeck,
  onOpenDeckLogImport,
  onExportDeck,
}) => {
  const { t } = useTranslation();

  return (
    <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {t('deckBuilder.deckArea.deckName')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="text"
            value={deckName}
            onChange={(event) => onDeckNameChange(event.target.value)}
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              background: 'rgba(15, 23, 42, 0.45)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderBottom: '2px solid rgba(255,255,255,0.16)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              outline: 'none',
              width: '100%',
              minWidth: 0,
              transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
              padding: '0.7rem 0.85rem',
              flex: 1,
            }}
            onFocus={(event) => {
              event.target.style.borderColor = 'rgba(255,255,255,0.22)';
              event.target.style.borderBottom = '2px solid var(--brand-accent)';
              event.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.12)';
              event.target.style.background = 'rgba(15, 23, 42, 0.7)';
            }}
            onBlur={(event) => {
              event.target.style.borderColor = 'rgba(255,255,255,0.12)';
              event.target.style.borderBottom = '2px solid rgba(255,255,255,0.16)';
              event.target.style.boxShadow = 'none';
              event.target.style.background = 'rgba(15, 23, 42, 0.45)';
            }}
            placeholder={t('deckBuilder.deckArea.deckName')}
          />
          <button
            type="button"
            onClick={onSave}
            disabled={!canSaveCurrentDeck}
            title={canSaveCurrentDeck
              ? t('deckBuilder.deckArea.actions.saveTitle')
              : t('deckBuilder.deckArea.actions.saveDisabledTitle', { limit: hardSavedDeckLimit })}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: canSaveCurrentDeck ? 'var(--accent-primary)' : '#475569',
              color: '#fff',
              border: `1px solid ${canSaveCurrentDeck ? 'rgba(255,255,255,0.12)' : '#64748b'}`,
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: canSaveCurrentDeck ? 'pointer' : 'not-allowed',
              opacity: canSaveCurrentDeck ? 1 : 0.75,
            }}
          >
            {t('deckBuilder.deckArea.actions.save')}
          </button>
        </div>
        {selectedSavedDeckId && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onMakeUnsavedCopy}
              title={t('deckBuilder.deckArea.actions.keepWorkingCopy')}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('deckBuilder.deckArea.actions.makeUnsavedCopy')}
            </button>
          </div>
        )}
        {deckName.trim() === '' && (
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {t('deckBuilder.deckArea.deckNameHint', { name: DEFAULT_DECK_NAME })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {t('deckBuilder.deckArea.storage')}
          </span>
          <button
            type="button"
            onClick={onOpenMyDecks}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              background: 'var(--bg-overlay)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-light)',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              minWidth: '110px',
            }}
          >
            {t('deckBuilder.myDecks.title')}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {t('deckBuilder.deckArea.file')}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-overlay)', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.875rem', border: '1px solid var(--border-light)' }}>
              <Upload size={14} /> {t('deckBuilder.deckArea.actions.import')}
              <input type="file" accept=".json" onChange={onImportDeck} style={{ display: 'none' }} />
            </label>
            <button
              type="button"
              onClick={onOpenDeckLogImport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                background: 'var(--bg-overlay)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-light)',
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <Upload size={14} />
              {t('deckBuilder.deckArea.actions.importDeckLog')}
              <span
                style={{
                  marginLeft: '0.2rem',
                  padding: '0.08rem 0.35rem',
                  borderRadius: '999px',
                  background: 'rgba(245, 158, 11, 0.18)',
                  color: '#fcd34d',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                {t('deckBuilder.deckArea.actions.betaBadge')}
              </span>
            </button>
            <button
              type="button"
              onClick={onExportDeck}
              disabled={!canExportDeck}
              title={canExportDeck ? t('deckBuilder.deckArea.actions.exportTitle') : t('deckBuilder.deckArea.actions.exportDisabledTitle')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                background: canExportDeck ? '#3b82f6' : '#475569',
                color: '#fff',
                border: `1px solid ${canExportDeck ? '#2563eb' : '#64748b'}`,
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 700,
                boxShadow: canExportDeck ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                opacity: canExportDeck ? 1 : 0.75,
                cursor: canExportDeck ? 'pointer' : 'not-allowed',
              }}
            >
              <Download size={14} /> {t('deckBuilder.deckArea.actions.export')}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minHeight: '1.9rem' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          {saveStateMessage}
        </div>
        {draftRestored && (
          <div style={{ color: '#fcd34d', fontSize: '0.75rem' }}>
            {t('deckBuilder.alerts.sessionRestored')}
          </div>
        )}
      </div>
      {hasReachedSoftLimit && (
        <div style={{ color: hasReachedHardLimit ? '#fca5a5' : '#fcd34d', fontSize: '0.75rem', lineHeight: 1.5 }}>
          {hasReachedHardLimit
            ? t('deckBuilder.alerts.limitReachedHard', { limit: hardSavedDeckLimit })
            : t('deckBuilder.alerts.limitReachedSoft', { count: savedDeckCount, limit: hardSavedDeckLimit })}
        </div>
      )}
    </div>
  );
};

export default DeckBuilderDeckHeader;
