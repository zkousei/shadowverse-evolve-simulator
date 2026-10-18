import type { GeneratedCardCatalog, GeneratedCardDetails } from '../card/generatedCardCatalog';
import { buildCardDetailLookup, type CardDetailLookup } from '../card/cardDetails';

export type GameBoardCatalogDetails = {
  readonly version: string;
  readonly requestedIds: readonly string[];
  /** Absent from this version's index; a failed HTTP request rejects instead. */
  readonly unknownIds: readonly string[];
  readonly cards: readonly GeneratedCardDetails[];
  /** A fresh presentation lookup for this request, never a shared mutable cache. */
  readonly detailLookup: CardDetailLookup;
};

/** Independent requests against one pinned reader. No game state is installed here. */
export const createGameBoardCatalogDetails = (source: GeneratedCardCatalog) => {
  const version = source.version;
  const knownIds = new Set(source.index.map(card => card.id));
  return Object.freeze({
    version,
    async load(ids: readonly string[], options?: { includeRelated?: boolean }): Promise<GameBoardCatalogDetails> {
      const requestedIds = Object.freeze([...ids]);
      const requestedKnown = requestedIds.filter(id => knownIds.has(id));
      const unknownIds = Object.freeze([...new Set(requestedIds.filter(id => !knownIds.has(id)))]);
      // Group sharing, integrity checks, and failed-group eviction belong to
      // the pinned reader. Do not add a second cache or select a new version.
      const cards: readonly GeneratedCardDetails[] = requestedKnown.length === 0
        ? Object.freeze([])
        : options?.includeRelated
          ? await source.loadCardsWithRelated(requestedKnown)
          : await source.loadCards(requestedKnown);
      return Object.freeze({ version, requestedIds, unknownIds, cards, detailLookup: buildCardDetailLookup(cards) });
    },
  });
};
