import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import type { GeneratedCardCatalog, GeneratedCardDetails } from '../card/generatedCardCatalog';
import type { SavedDeckSections } from '../deck/deckStorage';

export class UnknownSavedDeckCardsError extends Error {
  readonly cardIds: readonly string[];
  constructor(cardIds: readonly string[]) {
    super('Saved deck contains unknown card IDs');
    this.name = 'UnknownSavedDeckCardsError';
    this.cardIds = Object.freeze([...cardIds]);
  }
}

// Import payloads are mutable. Do not expose frozen reader data or replace
// missing details with summaries. All model-owned nested fields are copied.
const toImportCard = ({ related_cards, faces, ...card }: GeneratedCardDetails): DeckBuilderCardData => ({
  ...card, image: card.image ?? '',
  ...(related_cards ? { related_cards: related_cards.map(ref => ({ ...ref })) } : {}),
  ...(faces ? { faces: faces.map(face => ({ ...face })) } : {}),
});

/** One pinned source, no storage access, game mutation, or automatic retry.
 * The caller owns record revalidation and cancellation before committing.
 */
export const createGameBoardSavedDeckReader = (source: GeneratedCardCatalog) => {
  const knownIds = new Set(source.index.map(card => card.id));
  return Object.freeze({
    version: source.version,
    async loadCards(deck: { sections: SavedDeckSections }): Promise<DeckBuilderCardData[]> {
      // Snapshot IDs before awaiting. Counts/order are restored by the existing
      // saved-deck restorer, not expanded into duplicate detail requests here.
      const requested = [...new Set((['main', 'evolve', 'leader', 'token'] as const)
        .flatMap(section => deck.sections[section].map(ref => ref.cardId)))];
      const unknownIds = requested.filter(id => !knownIds.has(id));
      if (unknownIds.length) throw new UnknownSavedDeckCardsError(unknownIds);
      if (!requested.length) return [];
      // The verified reader owns full reference traversal, group sharing,
      // integrity checks, and failed-group eviction. Never mix versions.
      return (await source.loadCardsWithRelated(requested)).map(toImportCard);
    },
  });
};
