import type { DeckBuilderCardData, RelatedCardReference } from './deckBuilderCard';

/** Shared rule inputs available in full cards and the generated index.
 * Image, ability text, faces, and stats are not needed to validate a deck.
 * This type must never be used as a complete import or presentation card.
 */
export type DeckRuleCard = Readonly<Pick<DeckBuilderCardData,
  'id' | 'name' | 'class' | 'title' | 'type' | 'card_kind_normalized' |
  'deck_section' | 'is_token' | 'is_evolve_card'
> & { related_cards?: readonly Readonly<RelatedCardReference>[] }>;
