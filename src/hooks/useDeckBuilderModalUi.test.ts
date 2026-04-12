import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useDeckBuilderModalUi } from './useDeckBuilderModalUi';

describe('useDeckBuilderModalUi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useDeckBuilderModalUi());

    expect(result.current.showResetDeckDialog).toBe(false);
    expect(result.current.saveFeedback).toBeNull();
    expect(result.current.isDeckLogImportOpen).toBe(false);
  });

  it('updates state via applyDeckBuilderModalUiState', () => {
    const { result } = renderHook(() => useDeckBuilderModalUi());

    act(() => {
      result.current.applyDeckBuilderModalUiState({
        showResetDeckDialog: true,
        deckLogInput: 'test-log',
      });
    });

    expect(result.current.showResetDeckDialog).toBe(true);
    expect(result.current.deckLogInput).toBe('test-log');
  });

  it('clears saveFeedback after timeout', () => {
    const { result } = renderHook(() => useDeckBuilderModalUi());

    act(() => {
      result.current.setSaveFeedback({ kind: 'success', message: 'Saved!' });
    });
    expect(result.current.saveFeedback).toEqual({ kind: 'success', message: 'Saved!' });

    act(() => {
      vi.advanceTimersByTime(2400);
    });

    expect(result.current.saveFeedback).toBeNull();
  });
});
