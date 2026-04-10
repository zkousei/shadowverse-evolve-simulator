import React from 'react';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import {
  type DeckBuilderPreviewUiStatePatch,
  buildClosedPreviewUiState,
  buildDeckHoverPointerPosition,
  buildEndedDeckHoverUiState,
  buildMovedDeckHoverUiState,
  buildOpenedPreviewUiState,
  buildStartedDeckHoverUiState,
} from '../utils/deckBuilderPreviewState';

export const useDeckBuilderPreviewUi = () => {
  const [previewCard, setPreviewCard] = React.useState<DeckBuilderCardData | null>(null);
  const [hoveredDeckCard, setHoveredDeckCard] = React.useState<DeckBuilderCardData | null>(null);
  const [hoverPos, setHoverPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const applyDeckBuilderPreviewUiState = React.useCallback((state: DeckBuilderPreviewUiStatePatch) => {
    if (state.previewCard !== undefined) {
      setPreviewCard(state.previewCard);
    }
    if (state.hoveredDeckCard !== undefined) {
      setHoveredDeckCard(state.hoveredDeckCard);
    }
    if (state.hoverPos !== undefined) {
      setHoverPos(state.hoverPos);
    }
  }, []);

  React.useEffect(() => {
    if (!previewCard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        applyDeckBuilderPreviewUiState(buildClosedPreviewUiState());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyDeckBuilderPreviewUiState, previewCard]);

  const handleOpenPreview = React.useCallback((card: DeckBuilderCardData) => {
    applyDeckBuilderPreviewUiState(buildOpenedPreviewUiState(card));
  }, [applyDeckBuilderPreviewUiState]);

  const handleClosePreview = React.useCallback(() => {
    applyDeckBuilderPreviewUiState(buildClosedPreviewUiState());
  }, [applyDeckBuilderPreviewUiState]);

  const handleDeckCardMouseEnter = React.useCallback((
    card: DeckBuilderCardData,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    applyDeckBuilderPreviewUiState(
      buildStartedDeckHoverUiState(
        card,
        buildDeckHoverPointerPosition(event.clientX, event.clientY)
      )
    );
  }, [applyDeckBuilderPreviewUiState]);

  const handleDeckCardMouseMove = React.useCallback((
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    applyDeckBuilderPreviewUiState(
      buildMovedDeckHoverUiState(
        buildDeckHoverPointerPosition(event.clientX, event.clientY)
      )
    );
  }, [applyDeckBuilderPreviewUiState]);

  const handleDeckCardMouseLeave = React.useCallback(() => {
    applyDeckBuilderPreviewUiState(buildEndedDeckHoverUiState());
  }, [applyDeckBuilderPreviewUiState]);

  return {
    previewCard,
    hoveredDeckCard,
    hoverPos,
    handleOpenPreview,
    handleClosePreview,
    handleDeckCardMouseEnter,
    handleDeckCardMouseMove,
    handleDeckCardMouseLeave,
  };
};
