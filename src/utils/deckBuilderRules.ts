import { CLASS, type CardClass } from '../models/class';
import type { CardKindNormalized, DeckSection } from '../models/cardClassification';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { createEmptyDeckState, type DeckState } from '../models/deckState';
import type { DeckRuleConfig } from '../models/deckRule';

export type DeckTargetSection = 'main' | 'evolve' | 'leader' | 'token';

type DeckValidationIssueCode = 'invalid-section' | 'limit-exceeded' | 'invalid-rule';

export type DeckValidationIssue = {
  code: DeckValidationIssueCode;
  deck: DeckTargetSection;
  cardId?: string;
};

const DEFAULT_RULE_CONFIG: DeckRuleConfig = {
  format: 'other',
  identityType: 'class',
  selectedClass: null,
  selectedTitle: null,
  selectedClasses: [null, null],
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

export const DECK_LIMITS: Record<'main' | 'evolve' | 'token', number> = {
  main: 50,
  evolve: 10,
  token: Number.POSITIVE_INFINITY,
};

export const getDeckLimit = (
  targetSection: DeckTargetSection,
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG
): number => {
  if (targetSection === 'leader') {
    return ruleConfig.format === 'crossover' ? 2 : 1;
  }

  return DECK_LIMITS[targetSection];
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

export const isRuleConfigured = (ruleConfig: DeckRuleConfig): boolean => {
  if (ruleConfig.format === 'other') return true;
  if (ruleConfig.format === 'crossover') {
    const [firstClass, secondClass] = ruleConfig.selectedClasses;
    return firstClass !== null && secondClass !== null && firstClass !== secondClass;
  }

  if (ruleConfig.identityType === 'class') return ruleConfig.selectedClass !== null;
  return ruleConfig.selectedTitle !== null;
};

const matchesConstructedClassRule = (
  card: DeckBuilderCardData,
  targetSection: DeckTargetSection,
  selectedClass: CardClass
): boolean => {
  if (targetSection === 'token') return true;
  return card.class === selectedClass || card.class === CLASS.NEUTRAL;
};

const matchesConstructedTitleRule = (card: DeckBuilderCardData, selectedTitle: string): boolean => (
  card.title === selectedTitle
);

const matchesCrossoverClassRule = (
  card: DeckBuilderCardData,
  targetSection: DeckTargetSection,
  selectedClasses: [CardClass, CardClass]
): boolean => {
  if (targetSection === 'token') return true;
  if (!card.class || card.class === '-') return false;
  if (targetSection === 'leader') return selectedClasses.includes(card.class);
  return selectedClasses.includes(card.class) || card.class === CLASS.NEUTRAL;
};

export const isCardAllowedInSectionByRule = (
  card: DeckBuilderCardData,
  targetSection: DeckTargetSection,
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG
): boolean => {
  if (ruleConfig.format === 'other') return true;
  if (!isRuleConfigured(ruleConfig)) return false;

  if (ruleConfig.format === 'constructed') {
    if (ruleConfig.identityType === 'class' && ruleConfig.selectedClass) {
      return matchesConstructedClassRule(card, targetSection, ruleConfig.selectedClass);
    }

    if (ruleConfig.identityType === 'title' && ruleConfig.selectedTitle) {
      return matchesConstructedTitleRule(card, ruleConfig.selectedTitle);
    }

    return false;
  }

  const [firstClass, secondClass] = ruleConfig.selectedClasses;
  if (!firstClass || !secondClass) return false;
  return matchesCrossoverClassRule(card, targetSection, [firstClass, secondClass]);
};

export const isCardAllowedByRule = (
  card: DeckBuilderCardData,
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG
): boolean => {
  const targetSection = inferDeckSection(card);
  if (!targetSection || targetSection === 'neither') return false;
  return isCardAllowedInSectionByRule(card, targetSection, ruleConfig);
};

export const canAddCardToSection = (
  card: DeckBuilderCardData,
  targetSection: DeckTargetSection,
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG
): boolean => (
  getAllowedSections(card).includes(targetSection)
  && isCardAllowedInSectionByRule(card, targetSection, ruleConfig)
);

const resolveImportedCard = (
  importedCard: DeckBuilderCardData,
  cardCatalogById: Map<string, DeckBuilderCardData>
): DeckBuilderCardData => cardCatalogById.get(importedCard.id) ?? importedCard;

export const sanitizeImportedSection = (
  importedCards: DeckBuilderCardData[],
  availableCards: DeckBuilderCardData[],
  targetSection: DeckTargetSection,
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG
): DeckBuilderCardData[] => {
  const cardCatalogById = new Map(availableCards.map(card => [card.id, card]));
  const limit = getDeckLimit(targetSection, ruleConfig);

  return importedCards
    .map(card => resolveImportedCard(card, cardCatalogById))
    .filter(card => canAddCardToSection(card, targetSection, ruleConfig))
    .slice(0, Number.isFinite(limit) ? limit : undefined);
};

export const validateDeckState = (
  deckState: DeckState,
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG
): DeckValidationIssue[] => {
  const issues: DeckValidationIssue[] = [];
  const shouldValidateRule = ruleConfig.format !== 'other' && isRuleConfigured(ruleConfig);

  const sectionCards: Record<DeckTargetSection, DeckBuilderCardData[]> = {
    main: deckState.mainDeck,
    evolve: deckState.evolveDeck,
    leader: deckState.leaderCards,
    token: deckState.tokenDeck,
  };

  (Object.keys(sectionCards) as DeckTargetSection[]).forEach(deck => {
    const cards = sectionCards[deck];
    const deckLimit = getDeckLimit(deck, ruleConfig);

    if (Number.isFinite(deckLimit) && cards.length > deckLimit) {
      issues.push({ code: 'limit-exceeded', deck });
    }

    cards.forEach(card => {
      if (!getAllowedSections(card).includes(deck)) {
        issues.push({ code: 'invalid-section', deck, cardId: card.id });
      } else if (shouldValidateRule && !isCardAllowedInSectionByRule(card, deck, ruleConfig)) {
        issues.push({ code: 'invalid-rule', deck, cardId: card.id });
      }
    });
  });

  return issues;
};

type ImportedDeckState = Partial<DeckState> & {
  leaderCard?: DeckBuilderCardData | null;
};

const getImportedLeaderCards = (importedDeck: ImportedDeckState): DeckBuilderCardData[] => {
  if (Array.isArray(importedDeck.leaderCards)) return importedDeck.leaderCards;
  if (importedDeck.leaderCard) return [importedDeck.leaderCard];
  return [];
};

export const sanitizeImportedDeckState = (
  importedDeck: ImportedDeckState,
  availableCards: DeckBuilderCardData[],
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG
): DeckState => {
  const leaderCards = sanitizeImportedSection(
    getImportedLeaderCards(importedDeck),
    availableCards,
    'leader',
    ruleConfig
  );

  return {
    ...createEmptyDeckState(),
    mainDeck: sanitizeImportedSection(importedDeck.mainDeck ?? [], availableCards, 'main', ruleConfig),
    evolveDeck: sanitizeImportedSection(importedDeck.evolveDeck ?? [], availableCards, 'evolve', ruleConfig),
    leaderCards,
    tokenDeck: sanitizeImportedSection(importedDeck.tokenDeck ?? [], availableCards, 'token', ruleConfig),
  };
};
