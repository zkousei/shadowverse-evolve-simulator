import type { DeckBuilderCardData, RelatedCardReference } from '../../models/deckBuilderCard';

/** Rule inputs available in both the full catalog and the generated index.
 * Ability text and faces belong to complete details, not this contract.
 */
export type GameBoardCatalogRuleCard = Readonly<Pick<DeckBuilderCardData,
  'id' | 'name' | 'title' | 'card_kind_normalized' | 'deck_section' | 'atk' | 'hp'
> & { related_cards?: readonly Readonly<RelatedCardReference>[] }>;
