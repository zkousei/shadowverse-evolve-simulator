import type { DeckBuilderCardData } from './deckBuilderCard';

export type DeckState<Card = DeckBuilderCardData> = {
  mainDeck: Card[];
  evolveDeck: Card[];
  leaderCards: Card[];
  tokenDeck: Card[];
};

export const createEmptyDeckState = <Card = DeckBuilderCardData>(): DeckState<Card> => ({
  mainDeck: [],
  evolveDeck: [],
  leaderCards: [],
  tokenDeck: [],
});
