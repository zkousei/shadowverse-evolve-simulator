import type { DeckBuilderCardData } from '../models/deckBuilderCard';

const RELEASED_CARD_CATALOG_PATH = '/cards_detailed.json';
const PREVIEW_CARD_CATALOG_PATH = '/cards_preview.json';

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

export const loadCardCatalog = async (): Promise<DeckBuilderCardData[]> => {
  const [releasedResponse, previewResponse] = await Promise.all([
    fetch(RELEASED_CARD_CATALOG_PATH),
    fetch(PREVIEW_CARD_CATALOG_PATH),
  ]);
  const [releasedCards, previewCards] = await Promise.all([
    releasedResponse.json() as Promise<DeckBuilderCardData[]>,
    previewResponse.json() as Promise<DeckBuilderCardData[]>,
  ]);

  return mergeCardCatalogs(releasedCards, previewCards);
};
