import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  filterSavedDeckOptionsBySearch,
  formatSavedSessionTimestamp,
  getConnectionBadgeTone,
  getInteractionBlockedTitle,
} from './gameBoardPresentation';

describe('gameBoardPresentation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the correct tone for each connection state group', () => {
    const t = (key: string) => `translated:${key}`;

    expect(getConnectionBadgeTone('connected', t)).toEqual({
      label: 'translated:gameBoard.status.connected',
      background: 'rgba(16, 185, 129, 0.18)',
      border: 'rgba(16, 185, 129, 0.38)',
      color: '#d1fae5',
    });
    expect(getConnectionBadgeTone('connecting', t).label).toBe('translated:gameBoard.status.reconnecting');
    expect(getConnectionBadgeTone('reconnecting', t).label).toBe('translated:gameBoard.status.reconnecting');
    expect(getConnectionBadgeTone('idle', t).label).toBe('translated:gameBoard.status.disconnected');
  });

  it('resolves the interaction blocked title only when guests are blocked', () => {
    const t = (key: string) => `translated:${key}`;

    expect(getInteractionBlockedTitle(false, 'disconnected', t)).toBeUndefined();
    expect(getInteractionBlockedTitle(true, 'connecting', t)).toBe('translated:gameBoard.status.reconnectingTitle');
    expect(getInteractionBlockedTitle(true, 'reconnecting', t)).toBe('translated:gameBoard.status.reconnectingTitle');
    expect(getInteractionBlockedTitle(true, 'disconnected', t)).toBe('translated:gameBoard.status.connectionRequired');
  });

  it('formats saved session timestamps with the existing locale options', () => {
    const toLocaleStringSpy = vi
      .spyOn(Date.prototype, 'toLocaleString')
      .mockReturnValue('4/4, 09:00');

    expect(formatSavedSessionTimestamp('2026-04-04T00:00:00.000Z')).toBe('4/4, 09:00');
    expect(toLocaleStringSpy).toHaveBeenCalledWith(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      month: 'numeric',
      day: 'numeric',
    });
  });

  it('falls back to the raw session timestamp when formatting throws', () => {
    vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation(() => {
      throw new Error('format failed');
    });

    expect(formatSavedSessionTimestamp('2026-04-04T00:00:00.000Z')).toBe('2026-04-04T00:00:00.000Z');
  });

  it('filters saved deck options by a trimmed case-insensitive query', () => {
    const options = [
      { deck: { name: 'Alpha Deck' }, value: 1 },
      { deck: { name: 'Beta Deck' }, value: 2 },
    ];

    expect(filterSavedDeckOptionsBySearch(options, '  beta ')).toEqual([
      { deck: { name: 'Beta Deck' }, value: 2 },
    ]);
    expect(filterSavedDeckOptionsBySearch(options, '')).toEqual(options);
  });
});
