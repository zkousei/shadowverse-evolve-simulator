import { beforeAll, expect, it } from 'vitest';
import { createInstance } from 'i18next';
import en from '../../i18n/en/translation.json';
import ja from '../../i18n/ja/translation.json';
import { formatSharedUiMessage } from './sharedUiMessage';
import type { SharedUiEffect } from '../../types/sync';
const i18n = createInstance();
beforeAll(async () => { await i18n.init({ lng: 'en', interpolation: { escapeValue: false }, resources: { en: { translation: en }, ja: { translation: ja } } }); });
it('formats a grouped undo with actual player values and viewer-relative ownership', () => {
  const effect = { type: 'UNDO_COMPLETED', actor: 'host', summary: { kind: 'player-stat', player: 'host', changes: [{ stat: 'hp', from: 22, to: 20 }] } } as SharedUiEffect;
  expect(formatSharedUiMessage(effect, 'host', false, i18n.t)).toBe('You undid your stat adjustments (Life 22 → 20).');
  expect(formatSharedUiMessage(effect, 'guest', false, i18n.t)).toBe("Opponent undid opponent's stat adjustments (Life 22 → 20).");
  expect(formatSharedUiMessage(effect, 'guest', true, i18n.t)).toContain('Player 1');
});
it('formats private look results using counts without identifying cards', () => {
  const effect = { type: 'UNDO_COMPLETED', actor: 'host', summary: { kind: 'look', counts: { hand: 1, top: 0, bottom: 2, field: 0, ex: 0, cemetery: 0 } } } as SharedUiEffect;
  expect(formatSharedUiMessage(effect, 'host', false, i18n.t)).toBe('You undid Look Top (Hand: 1, Deck bottom: 2).');
});
it('formats public card changes and private card counts separately', () => {
  const summary = { kind: 'card-stat', stat: 'atk', count: 1 } as const;
  expect(formatSharedUiMessage({ type: 'UNDO_COMPLETED', actor: 'host', summary }, 'host', false, i18n.t)).toBe('You undid card ATK modifier adjustments (cards: 1).');
  expect(formatSharedUiMessage({ type: 'UNDO_COMPLETED', actor: 'host', summary: { ...summary, detail: { name: 'Knight', from: 2, to: 0 } } }, 'host', false, i18n.t)).toBe('You undid Knight’s ATK modifier adjustment (+2 → 0).');
});
it('renders move aggregates and the safe fallback in Japanese', () => {
  const t = i18n.getFixedT('ja');
  const message = formatSharedUiMessage({ type: 'UNDO_COMPLETED', actor: 'guest', summary: { kind: 'move', moves: [{ owner: 'host', from: 'hand', to: 'deck', count: 1 }] } }, 'host', false, t);
  expect(message).toContain('相手');
  expect(message).toContain('手札 → 山札: 1枚');
  expect(formatSharedUiMessage({ type: 'UNDO_COMPLETED', actor: 'host', summary: { kind: 'generic' } }, 'host', false, t)).toBe('あなた が直前の操作を取り消しました');
});

it('labels card HP as a modifier rather than player life', () => {
  expect(formatSharedUiMessage({ type: 'UNDO_COMPLETED', actor: 'host', summary: { kind: 'card-stat', stat: 'hp', count: 1, detail: { name: 'Knight', from: -1, to: 0 } } }, 'host', false, i18n.t)).toBe('You undid Knight’s HP modifier adjustment (-1 → 0).');
});

it('distinguishes both zone sides for cross-side movement', () => {
  const message = formatSharedUiMessage({ type: 'UNDO_COMPLETED', actor: 'host', summary: { kind: 'move', moves: [{ owner: 'host', sourceOwner: 'guest', from: 'field', to: 'field', count: 1 }] } }, 'host', false, i18n.t);
  expect(message).toBe("You undid card movement (opponent's Field → your Field: 1).");
});
