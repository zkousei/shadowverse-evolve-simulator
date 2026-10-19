import type { CardInstance } from '../../../components/Card';

export const importDeckCards = (
  cards: CardInstance[],
  role: 'host' | 'guest',
  importedCards: CardInstance[]
): CardInstance[] => {
  const otherPlayersCards = cards.filter(c => c.owner !== role);
  return [...otherPlayersCards, ...importedCards];
};

export const spawnTokenCard = (
  cards: CardInstance[],
  token: CardInstance
): CardInstance[] => [...cards, token];

export const spawnTokenCards = (
  cards: CardInstance[],
  tokens: CardInstance[]
): CardInstance[] => [...cards, ...tokens];
