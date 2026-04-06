import type { CardInstance } from '../components/Card';
import type { PlayerRole, TokenOption } from '../types/game';
import { normalizeBaseCardType } from './cardType';

export type ImportableDeckCard = {
  id: string;
  name: string;
  image: string;
  deck_section?: string;
  card_kind_normalized?: string;
  type?: string;
};

export type ImportableDeckData = {
  mainDeck?: ImportableDeckCard[];
  evolveDeck?: ImportableDeckCard[];
  leaderCards?: ImportableDeckCard[];
  leaderCard?: ImportableDeckCard;
  tokenDeck?: ImportableDeckCard[];
};

type CreateId = () => string;

type TokenSelection = {
  tokenOption: TokenOption;
  count: number;
};

const buildImportedCard = (
  card: ImportableDeckCard,
  targetRole: PlayerRole,
  zone: CardInstance['zone'],
  createId: CreateId,
  overrides: Partial<CardInstance> = {}
): CardInstance => ({
  id: createId(),
  cardId: card.id,
  name: card.name,
  image: card.image,
  zone,
  owner: targetRole,
  isTapped: false,
  isFlipped: zone.startsWith('leader-') ? false : true,
  counters: { atk: 0, hp: 0 },
  genericCounter: 0,
  baseCardType: normalizeBaseCardType(card.card_kind_normalized ?? card.type),
  cardKindNormalized: card.card_kind_normalized ?? undefined,
  ...overrides,
});

export const buildImportedDeckPayload = (
  data: ImportableDeckData,
  targetRole: PlayerRole,
  createId: CreateId
): {
  cards: CardInstance[];
  tokenOptions: TokenOption[];
} => {
  const cards: CardInstance[] = [];
  const tokenOptionsById = new Map<string, TokenOption>();

  const shuffledMainDeck = [...(data.mainDeck ?? [])]
    .filter((card) => !card.deck_section || card.deck_section === 'main')
    .sort(() => Math.random() - 0.5);

  shuffledMainDeck.forEach((card) => {
    cards.push(buildImportedCard(card, targetRole, `mainDeck-${targetRole}`, createId));
  });

  (data.evolveDeck ?? [])
    .filter((card) => !card.deck_section || card.deck_section === 'evolve')
    .forEach((card) => {
      cards.push(
        buildImportedCard(card, targetRole, `evolveDeck-${targetRole}`, createId, {
          isEvolveCard: true,
        })
      );
    });

  const leaderCards = Array.isArray(data.leaderCards)
    ? data.leaderCards
    : data.leaderCard
      ? [data.leaderCard]
      : [];

  leaderCards
    .filter((card) => card.deck_section === 'leader')
    .forEach((card) => {
      cards.push(
        buildImportedCard(card, targetRole, `leader-${targetRole}`, createId, {
          isLeaderCard: true,
        })
      );
    });

  (data.tokenDeck ?? [])
    .filter((card) => card.deck_section === 'token')
    .forEach((card) => {
      if (!tokenOptionsById.has(card.id)) {
        tokenOptionsById.set(card.id, {
          cardId: card.id,
          name: card.name,
          image: card.image,
          baseCardType: normalizeBaseCardType(card.card_kind_normalized ?? card.type),
          cardKindNormalized: card.card_kind_normalized ?? undefined,
        });
      }
    });

  return {
    cards,
    tokenOptions: Array.from(tokenOptionsById.values()),
  };
};

export const buildSpawnTokenInstance = (
  targetRole: PlayerRole,
  tokenOption: TokenOption,
  destination: 'ex' | 'field',
  createId: CreateId
): CardInstance => ({
  id: createId(),
  cardId: tokenOption.cardId,
  name: tokenOption.name,
  image: tokenOption.image,
  zone: `${destination}-${targetRole}`,
  owner: targetRole,
  isTapped: false,
  isFlipped: false,
  counters: tokenOption.cardId === 'token' ? { atk: 1, hp: 1 } : { atk: 0, hp: 0 },
  genericCounter: 0,
  isTokenCard: true,
  baseCardType: tokenOption.baseCardType ?? null,
  cardKindNormalized: tokenOption.cardKindNormalized ?? undefined,
});

export const buildSpawnTokens = (
  targetRole: PlayerRole,
  tokenSelections: TokenSelection[],
  destination: 'ex' | 'field',
  createId: CreateId
): CardInstance[] => tokenSelections.flatMap(({ tokenOption, count }) => (
  Array.from(
    { length: Math.max(0, count) },
    () => buildSpawnTokenInstance(targetRole, tokenOption, destination, createId)
  )
));
