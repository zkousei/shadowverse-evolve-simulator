import type { CardKindNormalized, DeckSection } from '../models/cardClassification';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { createEmptyDeckState, type DeckState } from '../models/deckState';

export type DeckTargetSection = 'main' | 'evolve' | 'leader' | 'token';

type DeckValidationIssueCode = 'invalid-section' | 'limit-exceeded';

export type DeckValidationIssue = {
  code: DeckValidationIssueCode;
  deck: DeckTargetSection;
  cardId?: string;
};

const TYPE_TO_CARD_KIND: Record<string, CardKindNormalized> = {
  'フォロワー': 'follower',
  'フォロワー・エボルヴ': 'evolve_follower',
  'スペル': 'spell',
  'アミュレット': 'amulet',
  'リーダー': 'leader',
  EP: 'ep',
  SEP: 'sep',
  'フォロワー・トークン': 'token_follower',
  'スペル・トークン': 'token_spell',
  'アミュレット・トークン': 'token_amulet',
  'イクイップメント・トークン': 'token_equipment',
  'フォロワー・アドバンス': 'advance_follower',
  'スペル・アドバンス': 'advance_spell',
  'アミュレット・エボルヴ': 'evolve_amulet',
  'スペル・エボルヴ': 'evolve_spell',
};

const CARD_KIND_TO_DECK_SECTION: Record<CardKindNormalized, DeckSection> = {
  follower: 'main',
  spell: 'main',
  amulet: 'main',
  evolve_follower: 'evolve',
  evolve_amulet: 'evolve',
  evolve_spell: 'evolve',
  advance_follower: 'evolve',
  advance_spell: 'evolve',
  leader: 'leader',
  token_follower: 'token',
  token_spell: 'token',
  token_amulet: 'token',
  token_equipment: 'token',
  ep: 'neither',
  sep: 'neither',
};

export const DECK_LIMITS: Record<DeckTargetSection, number> = {
  main: 50,
  evolve: 10,
  leader: 1,
  token: Number.POSITIVE_INFINITY,
};

export const inferDeckSection = (card: DeckBuilderCardData): DeckSection | undefined => {
  if (card.deck_section) return card.deck_section;

  if (card.is_token) return 'token';
  if (card.is_evolve_card) return 'evolve';

  const cardKind = card.card_kind_normalized ?? (card.type ? TYPE_TO_CARD_KIND[card.type] : undefined);
  return cardKind ? CARD_KIND_TO_DECK_SECTION[cardKind] : undefined;
};

export const getAllowedSections = (card: DeckBuilderCardData): DeckTargetSection[] => {
  const section = inferDeckSection(card);

  if (section === 'main' || section === 'evolve' || section === 'leader' || section === 'token') {
    return [section];
  }

  return [];
};

export const canAddCardToSection = (
  card: DeckBuilderCardData,
  targetSection: DeckTargetSection
): boolean => getAllowedSections(card).includes(targetSection);

const resolveImportedCard = (
  importedCard: DeckBuilderCardData,
  cardCatalogById: Map<string, DeckBuilderCardData>
): DeckBuilderCardData => cardCatalogById.get(importedCard.id) ?? importedCard;

export const sanitizeImportedSection = (
  importedCards: DeckBuilderCardData[],
  availableCards: DeckBuilderCardData[],
  targetSection: DeckTargetSection
): DeckBuilderCardData[] => {
  const cardCatalogById = new Map(availableCards.map(card => [card.id, card]));

  return importedCards
    .map(card => resolveImportedCard(card, cardCatalogById))
    .filter(card => canAddCardToSection(card, targetSection))
    .slice(0, Number.isFinite(DECK_LIMITS[targetSection]) ? DECK_LIMITS[targetSection] : undefined);
};

export const validateDeckState = (
  deckState: DeckState
): DeckValidationIssue[] => {
  const issues: DeckValidationIssue[] = [];

  const sectionCards: Record<DeckTargetSection, DeckBuilderCardData[]> = {
    main: deckState.mainDeck,
    evolve: deckState.evolveDeck,
    leader: deckState.leaderCard ? [deckState.leaderCard] : [],
    token: deckState.tokenDeck,
  };

  (Object.keys(sectionCards) as DeckTargetSection[]).forEach(deck => {
    const cards = sectionCards[deck];

    if (Number.isFinite(DECK_LIMITS[deck]) && cards.length > DECK_LIMITS[deck]) {
      issues.push({ code: 'limit-exceeded', deck });
    }

    cards.forEach(card => {
      if (!canAddCardToSection(card, deck)) {
        issues.push({ code: 'invalid-section', deck, cardId: card.id });
      }
    });
  });

  return issues;
};

export const sanitizeImportedDeckState = (
  importedDeck: Partial<DeckState>,
  availableCards: DeckBuilderCardData[]
): DeckState => {
  const leaderCards = sanitizeImportedSection(
    importedDeck.leaderCard ? [importedDeck.leaderCard] : [],
    availableCards,
    'leader'
  );

  return {
    ...createEmptyDeckState(),
    mainDeck: sanitizeImportedSection(importedDeck.mainDeck ?? [], availableCards, 'main'),
    evolveDeck: sanitizeImportedSection(importedDeck.evolveDeck ?? [], availableCards, 'evolve'),
    leaderCard: leaderCards[0] ?? null,
    tokenDeck: sanitizeImportedSection(importedDeck.tokenDeck ?? [], availableCards, 'token'),
  };
};
