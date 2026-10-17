import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { GeneratedCardCatalog, GeneratedCardDetails } from '../utils/card/generatedCardCatalog';

/** Page fixtures preserve the real summary/detail boundary without Python or HTTP. */
export const generatedCatalogFixture = (cards: DeckBuilderCardData[]): GeneratedCardCatalog => {
  const byId = new Map(cards.map(card => [card.id, card]));
  const load = async (ids: readonly string[]) => ids.map(id => {
    const card = byId.get(id);
    if (!card) throw new Error(`Unknown fixture card: ${id}`);
    return card;
  }) as unknown as readonly GeneratedCardDetails[];
  return {
    version: 'fixture-version',
    index: cards.map(({ ability_text, faces, ...card }) => {
      void ability_text; void faces;
      return { ...card, detail_group: card.id.split('-')[0] };
    }),
    loadCards: load,
    async loadCardsWithRelated(ids) {
      const requested = [...new Set(ids)];
      const seen = new Set(requested);
      for (let i = 0; i < requested.length; i++) {
        for (const related of byId.get(requested[i])?.related_cards ?? []) {
          if (byId.has(related.id) && !seen.has(related.id)) { requested.push(related.id); seen.add(related.id); }
        }
      }
      return load(requested);
    },
  };
};
