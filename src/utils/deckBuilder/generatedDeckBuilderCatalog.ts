import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import type { SavedDeckSections } from '../deck/deckStorage';
import type { GeneratedCardCatalog, GeneratedCardDetails } from '../card/generatedCardCatalog';

const toCard = ({ related_cards, faces, ...card }: GeneratedCardDetails): DeckBuilderCardData => ({
  ...card, image: card.image ?? '',
  ...(related_cards ? { related_cards: related_cards.map(ref => ({ ...ref })) } : {}),
  ...(faces ? { faces: faces.map(face => ({ ...face })) } : {}),
});

/** Summaries are for catalog views only; only verified details enter this cache. */
export const createGeneratedDeckBuilderCatalog = (source: GeneratedCardCatalog) => {
  const known = new Map<string, DeckBuilderCardData>();
  let knownSnapshot: DeckBuilderCardData[] = [];
  const byId = new Map(source.index.map(card => [card.id, card]));
  const ids = new Set(byId.keys());
  const remember = (cards: readonly GeneratedCardDetails[]) => {
    const complete = cards.map(toCard);
    let changed = false;
    for (const card of complete) {
      if (!known.has(card.id)) { known.set(card.id, card); changed = true; }
    }
    if (changed) knownSnapshot = [...known.values()];
    return cards;
  };
  const catalog: GeneratedCardCatalog = {
    version: source.version, index: source.index,
    loadCards: async requested => remember(await source.loadCards(requested)),
    loadCardsWithRelated: async requested => remember(await source.loadCardsWithRelated(requested)),
  };
  return {
    catalog,
    summaries: source.index.map(({ detail_group, related_cards, ...card }): DeckBuilderCardData => {
      void detail_group;
      return { ...card, image: card.image ?? '',
        ...(related_cards ? { related_cards: related_cards.map(ref => ({ ...ref })) } : {}) };
    }),
    knownCards: () => knownSnapshot,
    hasAvailable(requested: readonly string[]): boolean {
      const queue = [...new Set(requested)];
      const seen = new Set(queue);
      for (let i = 0; i < queue.length; i++) {
        if (!known.has(queue[i])) return false;
        for (const ref of byId.get(queue[i])?.related_cards ?? []) {
          if (ids.has(ref.id) && !seen.has(ref.id)) { seen.add(ref.id); queue.push(ref.id); }
        }
      }
      return true;
    },
    async loadAvailable(requested: readonly string[]): Promise<DeckBuilderCardData[]> {
      // Unknown IDs retain the existing import/restore policy; they are not
      // mistaken for failed HTTP requests or replaced by partial summaries.
      const available = [...new Set(requested.filter(id => ids.has(id)))];
      if (available.length === 0) return [];
      const cards = await catalog.loadCardsWithRelated(available);
      return cards.map(card => known.get(card.id)!);
    },
  };
};

export const getSavedCatalogIds = (...records: Array<{ sections: SavedDeckSections } | null>): string[] =>
  records.flatMap(record => record ? Object.values(record.sections).flatMap(section => section.map(ref => ref.cardId)) : []);

export const getImportedCatalogIds = (input: unknown): string[] => {
  if (!input || typeof input !== 'object') return [];
  const data = input as Record<string, unknown>;
  const cards = ['mainDeck', 'evolveDeck', 'leaderCards', 'tokenDeck', 'leader']
    .flatMap(key => Array.isArray(data[key]) ? data[key] : []);
  if (data.leaderCard) cards.push(data.leaderCard);
  return cards.flatMap(value => {
    if (!value || typeof value !== 'object') return [];
    const card = value as Record<string, unknown>;
    return [card.id, ...(Array.isArray(card.related_cards)
      ? card.related_cards.map(ref => ref && typeof ref === 'object' ? (ref as Record<string, unknown>).id : null) : [])]
      .filter((id): id is string => typeof id === 'string');
  });
};
