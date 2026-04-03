import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { DEFAULT_DECK_NAME } from './deckStorage';

export const DECK_SORT_VALUES = ['added', 'cost', 'id'] as const;
export type DeckSortMode = typeof DECK_SORT_VALUES[number];

export type DeckDisplayGroup = {
  card: DeckBuilderCardData;
  count: number;
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
