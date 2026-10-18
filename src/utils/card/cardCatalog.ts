import type { DeckBuilderCardData } from '../../models/deckBuilderCard';

/** Pure compatibility reference for generated-catalog parity tests. No HTTP loading. */
export const mergeCardCatalogs = (
  releasedCards: DeckBuilderCardData[],
  previewCards: DeckBuilderCardData[],
): DeckBuilderCardData[] => {
  const releasedIds = new Set(releasedCards.map(card => card.id));
  const releasedCatalog = releasedCards.map(card => ({
    ...card,
    catalog_status: 'released' as const,
  }));
  const previewCatalog = previewCards
    .filter(card => !releasedIds.has(card.id))
    .map(card => ({
      ...card,
      catalog_status: 'preview' as const,
    }));

  return [...releasedCatalog, ...previewCatalog];
};
