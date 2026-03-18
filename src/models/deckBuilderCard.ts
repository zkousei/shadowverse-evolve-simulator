import type { CardClassValue } from './class';

export interface DeckBuilderCardData {
  id: string; // EXP-NUM format, e.g PCS01-001
  name: string;
  image: string;
  class?: CardClassValue;
  title?: string;
  type?: string;
  subtype?: string;
  rarity?: string;
  product_name?: string;
  cost?: string; // '-' for Evolve cards
  atk?: string;
  hp?: string;
  ability_text?: string;
}

const compareJa = (left: string, right: string) => left.localeCompare(right, 'ja');

const uniqueSortedValues = (values: Array<string | undefined>, skipDash = false): string[] => (
  Array.from(
    new Set(
      values.filter((value): value is string => {
        if (!value) return false;
        if (skipDash && value === '-') return false;
        return true;
      })
    )
  ).sort(compareJa)
);

export const getAvailableExpansions = (cards: DeckBuilderCardData[]): string[] => (
  uniqueSortedValues(cards.map(card => card.id.split('-')[0]))
);

export const getAvailableRarities = (cards: DeckBuilderCardData[]): string[] => (
  uniqueSortedValues(cards.map(card => card.rarity), true)
);

export const getAvailableProductNames = (cards: DeckBuilderCardData[]): string[] => (
  uniqueSortedValues(cards.map(card => card.product_name))
);
