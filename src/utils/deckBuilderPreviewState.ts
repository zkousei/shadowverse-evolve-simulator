import type { DeckBuilderCardData } from '../models/deckBuilderCard';

export type DeckHoverPointerPosition = {
  x: number;
  y: number;
};

export type DeckBuilderPreviewUiStatePatch = {
  previewCard?: DeckBuilderCardData | null;
  hoveredDeckCard?: DeckBuilderCardData | null;
  hoverPos?: DeckHoverPointerPosition;
};

export const buildDeckHoverPointerPosition = (
  x: number,
  y: number
): DeckHoverPointerPosition => ({ x, y });

export const buildOpenedPreviewUiState = (
  card: DeckBuilderCardData
): DeckBuilderPreviewUiStatePatch => ({
  previewCard: card,
});

export const buildClosedPreviewUiState = (): DeckBuilderPreviewUiStatePatch => ({
  previewCard: null,
});

export const buildStartedDeckHoverUiState = (
  card: DeckBuilderCardData,
  hoverPos: DeckHoverPointerPosition
): DeckBuilderPreviewUiStatePatch => ({
  hoveredDeckCard: card,
  hoverPos,
});

export const buildMovedDeckHoverUiState = (
  hoverPos: DeckHoverPointerPosition
): DeckBuilderPreviewUiStatePatch => ({
  hoverPos,
});

export const buildEndedDeckHoverUiState = (): DeckBuilderPreviewUiStatePatch => ({
  hoveredDeckCard: null,
});
