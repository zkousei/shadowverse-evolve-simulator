import type { CardClassValue } from './class';
import type { CardKindNormalized, DeckSection } from './cardClassification';

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
  card_kind_normalized?: CardKindNormalized;
  deck_section?: DeckSection;
  is_token?: boolean;
  is_evolve_card?: boolean;
  is_deck_build_legal?: boolean;
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

export const getDisplayDedupKey = (card: DeckBuilderCardData): string => [
  card.name,
  card.deck_section ?? '',
  card.type ?? '',
  card.class ?? '',
].join('::');

export const dedupeCardsByDisplayIdentity = (cards: DeckBuilderCardData[]): DeckBuilderCardData[] => {
  const seenKeys = new Set<string>();

  return cards.filter(card => {
    const key = getDisplayDedupKey(card);
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
};
