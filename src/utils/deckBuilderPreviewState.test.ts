import { describe, expect, it } from 'vitest';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import {
  buildClosedPreviewUiState,
  buildDeckHoverPointerPosition,
  buildEndedDeckHoverUiState,
  buildMovedDeckHoverUiState,
  buildOpenedPreviewUiState,
  buildStartedDeckHoverUiState,
} from './deckBuilderPreviewState';

const mockCard: DeckBuilderCardData = {
  id: 'BP01-001',
  name: 'Alpha Knight',
  image: '/alpha.png',
  class: 'ロイヤル',
  title: 'Hero Tale',
  type: 'フォロワー',
  subtype: '兵士',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

describe('deckBuilderPreviewState', () => {
  it('builds preview open and close patches', () => {
    expect(buildOpenedPreviewUiState(mockCard)).toEqual({
      previewCard: mockCard,
    });
    expect(buildClosedPreviewUiState()).toEqual({
      previewCard: null,
    });
  });

  it('builds hover start, move, and end patches', () => {
    const hoverPos = buildDeckHoverPointerPosition(120, 140);

    expect(hoverPos).toEqual({ x: 120, y: 140 });
    expect(buildStartedDeckHoverUiState(mockCard, hoverPos)).toEqual({
      hoveredDeckCard: mockCard,
      hoverPos,
    });
    expect(buildMovedDeckHoverUiState({ x: 140, y: 160 })).toEqual({
      hoverPos: { x: 140, y: 160 },
    });
    expect(buildEndedDeckHoverUiState()).toEqual({
      hoveredDeckCard: null,
    });
  });
});
