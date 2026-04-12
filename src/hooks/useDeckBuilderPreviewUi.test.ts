import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDeckBuilderPreviewUi } from './useDeckBuilderPreviewUi';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';

describe('useDeckBuilderPreviewUi', () => {
  const mockCard = { id: 'card-1', name: 'Test Card' } as DeckBuilderCardData;

  it('opens and closes preview', () => {
    const { result } = renderHook(() => useDeckBuilderPreviewUi());

    act(() => {
      result.current.handleOpenPreview(mockCard);
    });
    expect(result.current.previewCard).toEqual(mockCard);

    act(() => {
      result.current.handleClosePreview();
    });
    expect(result.current.previewCard).toBeNull();
  });

  it('handles deck card hover interactions', () => {
    const { result } = renderHook(() => useDeckBuilderPreviewUi());
    const mockEvent = { clientX: 100, clientY: 200 } as React.MouseEvent<HTMLDivElement>;

    act(() => {
      result.current.handleDeckCardMouseEnter(mockCard, mockEvent);
    });
    expect(result.current.hoveredDeckCard).toEqual(mockCard);
    expect(result.current.hoverPos).toEqual({ x: 100, y: 200 });

    act(() => {
      const moveEvent = { clientX: 150, clientY: 250 } as React.MouseEvent<HTMLDivElement>;
      result.current.handleDeckCardMouseMove(moveEvent);
    });
    expect(result.current.hoverPos).toEqual({ x: 150, y: 250 });

    act(() => {
      result.current.handleDeckCardMouseLeave();
    });
    expect(result.current.hoveredDeckCard).toBeNull();
  });

  it('closes preview on Escape key press', () => {
    const { result } = renderHook(() => useDeckBuilderPreviewUi());

    act(() => {
      result.current.handleOpenPreview(mockCard);
    });
    expect(result.current.previewCard).toEqual(mockCard);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.previewCard).toBeNull();
  });
});
