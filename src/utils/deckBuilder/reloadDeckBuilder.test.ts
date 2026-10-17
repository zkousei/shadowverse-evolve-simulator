import { beforeEach, expect, test, vi } from 'vitest';
import { createDefaultDeckRuleConfig } from '../../models/deckRule';
import { createEmptyDeckState } from '../../models/deckState';
import { loadDraft, saveDraft } from '../deck/deckStorage';
import { reloadDeckBuilderPreservingDraft } from './reloadDeckBuilder';
const payload = { selectedDeckId: null, name: 'Immediate edit', ruleConfig: createDefaultDeckRuleConfig(), deckState: createEmptyDeckState() };
beforeEach(() => { vi.restoreAllMocks(); window.localStorage.clear(); });

test('flushes the current draft synchronously before reloading, including before the debounce fires', () => {
  const reload = vi.fn(() => expect(loadDraft()?.name).toBe('Immediate edit'));
  reloadDeckBuilderPreservingDraft({ initialized: true, pendingRestore: false, hasBuilderState: true, payload }, reload);
  expect(reload).toHaveBeenCalledOnce();
});

test.each([false, true])('keeps the stored draft untouched while initialization or confirmation is pending (%s)', initialized => {
  saveDraft({ ...payload, name: 'Existing draft' });
  const reload = vi.fn();
  reloadDeckBuilderPreservingDraft({ initialized, pendingRestore: initialized, hasBuilderState: false, payload }, reload);
  expect(loadDraft()?.name).toBe('Existing draft');
  expect(reload).toHaveBeenCalledOnce();
});

test('does not reload when draft storage fails', () => {
  vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
  const reload = vi.fn();
  expect(() => reloadDeckBuilderPreservingDraft({ initialized: true, pendingRestore: false, hasBuilderState: true, payload }, reload)).toThrow('Quota');
  expect(reload).not.toHaveBeenCalled();
});


test('protects early edits before catalog initialization if there is no previous draft to overwrite', () => {
  const reload = vi.fn();
  reloadDeckBuilderPreservingDraft({ initialized: false, pendingRestore: false, hasBuilderState: true, payload }, reload);
  expect(loadDraft()?.name).toBe('Immediate edit');
  expect(reload).toHaveBeenCalledOnce();
});
