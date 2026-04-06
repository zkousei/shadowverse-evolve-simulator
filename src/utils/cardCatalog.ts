import type { DeckBuilderCardData } from '../models/deckBuilderCard';

export const loadCardCatalog = async (): Promise<DeckBuilderCardData[]> => {
  const response = await fetch('/cards_detailed.json');
  return response.json();
};
