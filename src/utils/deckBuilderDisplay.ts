import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { BASE_CARD_TYPE_VALUES, getBaseCardType, type BaseCardType } from '../models/cardClassification';
import { DEFAULT_DECK_NAME } from './deckStorage';

export const DECK_SORT_VALUES = ['added', 'cost', 'id'] as const;
export type DeckSortMode = typeof DECK_SORT_VALUES[number];
export const DECK_HOVER_PREVIEW_WIDTH = 220;
export const DECK_HOVER_PREVIEW_MAX_HEIGHT = 320;
export const DECK_HOVER_PREVIEW_OFFSET = 16;
export const DECK_HOVER_PREVIEW_VIEWPORT_PADDING = 8;

export type DeckDisplayGroup = {
  card: DeckBuilderCardData;
  count: number;
};

export type DeckBaseCardTypeCounts = Record<BaseCardType, number>;

type Point = {
  x: number;
  y: number;
};

export type DeckHoverPreviewPosition = {
  left: number;
  top: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

const getCardCostSortValue = (card: DeckBuilderCardData): number => {
  if (!card.cost || card.cost === '-') return Number.POSITIVE_INFINITY;
  const parsed = Number.parseInt(card.cost, 10);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

export const sortDeckCardsForDisplay = (
  cards: DeckBuilderCardData[],
  sortMode: DeckSortMode
): DeckBuilderCardData[] => {
  if (sortMode === 'added') return cards;

  return [...cards].sort((left, right) => {
    if (sortMode === 'cost') {
      const costDiff = getCardCostSortValue(left) - getCardCostSortValue(right);
      if (costDiff !== 0) return costDiff;
    }

    return left.id.localeCompare(right.id, 'ja');
  });
};

export const groupDeckCardsForDisplay = (cards: DeckBuilderCardData[]): DeckDisplayGroup[] => {
  const groups: DeckDisplayGroup[] = [];

  cards.forEach(card => {
    const existingGroup = groups.find(group => group.card.id === card.id);
    if (existingGroup) {
      existingGroup.count += 1;
      return;
    }

    groups.push({ card, count: 1 });
  });

  return groups;
};

export const getDeckBaseCardTypeCounts = (groups: DeckDisplayGroup[]): DeckBaseCardTypeCounts => {
  const counts = Object.fromEntries(
    BASE_CARD_TYPE_VALUES.map(cardType => [cardType, 0])
  ) as DeckBaseCardTypeCounts;

  groups.forEach(({ card, count }) => {
    const baseCardType = getBaseCardType(card.card_kind_normalized);
    if (baseCardType) {
      counts[baseCardType] += count;
    }
  });

  return counts;
};

export const parseNullableStat = (value?: string): number | null => {
  if (!value || value === '-') return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const formatSavedDeckUpdatedAt = (value: string, locale?: string): string => {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const resolveDeckName = (value: string): string => value.trim() || DEFAULT_DECK_NAME;

export const getDeckHoverPreviewPosition = (
  hoverPos: Point,
  viewport: ViewportSize
): DeckHoverPreviewPosition => ({
  left: Math.max(
    DECK_HOVER_PREVIEW_VIEWPORT_PADDING,
    Math.min(
      hoverPos.x + DECK_HOVER_PREVIEW_OFFSET,
      viewport.width - DECK_HOVER_PREVIEW_WIDTH - DECK_HOVER_PREVIEW_VIEWPORT_PADDING
    )
  ),
  top: Math.max(
    DECK_HOVER_PREVIEW_VIEWPORT_PADDING,
    Math.min(
      hoverPos.y + DECK_HOVER_PREVIEW_OFFSET,
      viewport.height - DECK_HOVER_PREVIEW_MAX_HEIGHT - DECK_HOVER_PREVIEW_VIEWPORT_PADDING
    )
  ),
});
