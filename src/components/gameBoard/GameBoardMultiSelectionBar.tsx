import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { BoardBatchAction } from '../../utils/gameBoard/gameBoardMultiSelection';

type Props = {
  active: boolean; canStart: boolean; count: number;
  onStart: () => void; onClear: () => void; onFinish: () => void;
  onRun: (action: BoardBatchAction) => void;
  canRun: (action: BoardBatchAction) => boolean;
};
const buttonStyle: CSSProperties = { minHeight: 36, padding: '4px 8px', border: '1px solid #475569', borderRadius: 6, color: '#f8fafc', background: '#1e293b', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 };
export default function GameBoardMultiSelectionBar({ active, canStart, count, onStart, onClear, onFinish, onRun, canRun }: Props) {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  if (!canStart && !active) return null;
  const actionButton = (action: BoardBatchAction, label = t(`gameBoard.multiSelect.actions.${action}`)) => {
    const enabled = canRun(action);
    return <button type="button" key={action} aria-label={t(`gameBoard.multiSelect.actions.${action}`)}
      style={{ ...buttonStyle, opacity: enabled ? 1 : 0.45, cursor: enabled ? 'pointer' : 'not-allowed' }}
      disabled={!enabled} title={enabled ? t(`gameBoard.multiSelect.actions.${action}`) : t('gameBoard.multiSelect.unavailable')}
      onClick={() => onRun(action)}>{label}</button>;
  };
  return <section data-testid="board-multi-selection-bar" aria-label={t('gameBoard.multiSelect.title')}
    style={{ minWidth: 0, width: active ? '100%' : undefined }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: active ? 'auto' : undefined, whiteSpace: 'nowrap' }}>
      {!active ? <button type="button" style={{ ...buttonStyle, minHeight: 28, fontSize: '0.75rem' }} onClick={() => { setHelpOpen(false); onStart(); }}>{t('gameBoard.multiSelect.start')}</button> : <>
        <strong role="status" style={{ color: '#7dd3fc', fontSize: '0.8rem', flexShrink: 0 }}>{t('gameBoard.multiSelect.count', { count })}</strong>
        <button type="button" style={buttonStyle} title={t('gameBoard.multiSelect.clear')} aria-label={t('gameBoard.multiSelect.clear')} onClick={onClear} disabled={!count}>×</button>
        {(['atk', 'hp', 'counter'] as const).map(stat => <div key={stat} style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>{t(`gameBoard.multiSelect.stats.${stat}`)}</span>
          {actionButton(`${stat}-`, '−')}{actionButton(`${stat}+`, '+')}
        </div>)}
        {(['rest', 'stand', 'cemetery', 'banish'] as const).map(action => actionButton(action))}
        <button type="button" style={buttonStyle} onClick={() => setHelpOpen(!helpOpen)} aria-label={t('gameBoard.multiSelect.help')} aria-expanded={helpOpen}>?</button>
        <button type="button" style={{ ...buttonStyle, marginLeft: 'auto' }} onClick={onFinish}>{t('gameBoard.multiSelect.finish')}</button>
      </>}
    </div>
    {active && helpOpen && <div data-testid="multi-selection-help" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 'min(360px, 90vw)', boxSizing: 'border-box', padding: 12, border: '1px solid #475569', borderRadius: 8, background: '#0f172a', color: '#cbd5e1', fontSize: '0.8rem', boxShadow: '0 6px 20px #0008' }}>
      <p style={{ margin: '0 0 8px' }}>{t('gameBoard.multiSelect.hint')}</p>
      <p style={{ margin: '0 0 8px' }}>{t('gameBoard.multiSelect.relatedHint')}</p>
      <p style={{ margin: 0, color: '#fbbf24' }}>{t('gameBoard.multiSelect.unavailable')}</p>
    </div>}
  </section>;
}
