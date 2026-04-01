import { CLASS, type CardClass } from '../models/class';
import type { CardKindNormalized, DeckSection } from '../models/cardClassification';
import { getDisplayDedupKey, type DeckBuilderCardData } from '../models/deckBuilderCard';
import type { RestrictionFormat, RestrictionSource } from '../models/deckRestriction';
import { createEmptyDeckState, type DeckState } from '../models/deckState';
import type { DeckRuleConfig } from '../models/deckRule';
import { DEFAULT_COPY_LIMIT_PER_CARD, getEffectiveDeckRestriction } from './deckRestrictionRules';
import { getGlobalIntrinsicLimit } from '../data/intrinsicDeckExceptions';

export type DeckTargetSection = 'main' | 'evolve' | 'leader' | 'token';

type DeckValidationIssueCode =
  | 'invalid-section'
  | 'limit-exceeded'
  | 'invalid-rule'
  | 'main-deck-too-small'
  | 'rule-not-configured'
  | 'invalid-leader-count'
  | 'invalid-crossover-leader-classes'
  | 'too-many-copies';

export type DeckValidationIssue = {
  code: DeckValidationIssueCode;
  deck?: DeckTargetSection;
  cardId?: string;
  expected?: number;
  actual?: number;
  dedupeKey?: string;
  restrictionSource?: RestrictionSource;
  restrictionFormat?: RestrictionFormat;
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
  'アミュレット・アドバンス': 'advance_amulet',
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
  advance_amulet: 'evolve',
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

const matchesConstructedTitleRule = (
  card: DeckBuilderCardData,
  targetSection: DeckTargetSection,
  selectedTitle: string
): boolean => {
  if (targetSection === 'token') return true;
  return card.title === selectedTitle;
};

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
      return matchesConstructedTitleRule(card, targetSection, ruleConfig.selectedTitle);
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

const getSectionCards = (deckState: DeckState, targetSection: DeckTargetSection): DeckBuilderCardData[] => {
  switch (targetSection) {
    case 'main':
      return deckState.mainDeck;
    case 'evolve':
      return deckState.evolveDeck;
    case 'leader':
      return deckState.leaderCards;
    case 'token':
      return deckState.tokenDeck;
  }
};

const getCardCopyLimit = (
  card: DeckBuilderCardData,
  targetSection: DeckTargetSection,
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG,
  deckState?: DeckState
): number => {
  if (targetSection !== 'main' && targetSection !== 'evolve') {
    return Number.POSITIVE_INFINITY;
  }

  if (deckState) {
    const globalLimit = getGlobalIntrinsicLimit(card, deckState);
    if (globalLimit !== undefined) {
      return globalLimit;
    }
  }

  return getEffectiveDeckRestriction(card, targetSection, ruleConfig).copyLimit;
};

const countCopiesInSection = (
  cards: DeckBuilderCardData[],
  targetCard: DeckBuilderCardData
): number => {
  const dedupeKey = getDisplayDedupKey(targetCard);
  return cards.filter(card => getDisplayDedupKey(card) === dedupeKey).length;
};

export const canAddCardToDeckState = (
  card: DeckBuilderCardData,
  targetSection: DeckTargetSection,
  deckState: DeckState,
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG
): boolean => {
  if (!canAddCardToSection(card, targetSection, ruleConfig)) return false;

  const copyLimit = getCardCopyLimit(card, targetSection, ruleConfig, deckState);
  if (!Number.isFinite(copyLimit)) return true;

  return countCopiesInSection(getSectionCards(deckState, targetSection), card) < copyLimit;
};

const resolveImportedCard = (
  importedCard: DeckBuilderCardData,
  cardCatalogById: Map<string, DeckBuilderCardData>
): DeckBuilderCardData => cardCatalogById.get(importedCard.id) ?? importedCard;

export const sanitizeImportedSection = (
  importedCards: DeckBuilderCardData[],
  availableCards: DeckBuilderCardData[],
  targetSection: DeckTargetSection,
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG,
  deckStateHint?: DeckState
): DeckBuilderCardData[] => {
  const cardCatalogById = new Map(availableCards.map(card => [card.id, card]));
  const limit = getDeckLimit(targetSection, ruleConfig);
  const copyCounts = new Map<string, number>();

  return importedCards
    .map(card => resolveImportedCard(card, cardCatalogById))
    .filter(card => canAddCardToSection(card, targetSection, ruleConfig))
    .filter(card => {
      const copyLimit = getCardCopyLimit(card, targetSection, ruleConfig, deckStateHint);
      if (!Number.isFinite(copyLimit)) return true;
      const dedupeKey = getDisplayDedupKey(card);
      const nextCount = (copyCounts.get(dedupeKey) ?? 0) + 1;
      copyCounts.set(dedupeKey, nextCount);
      return nextCount <= copyLimit;
    })
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

    if (deck === 'main' || deck === 'evolve') {
      const copyCounts = new Map<string, { count: number; cardId: string }>();

      cards.forEach(card => {
        const dedupeKey = getDisplayDedupKey(card);
        const current = copyCounts.get(dedupeKey);
        if (current) {
          current.count += 1;
        } else {
          copyCounts.set(dedupeKey, { count: 1, cardId: card.id });
        }
      });

      copyCounts.forEach(({ count, cardId }, dedupeKey) => {
        const representativeCard = cards.find(card => getDisplayDedupKey(card) === dedupeKey);
        const restriction = representativeCard
          ? getEffectiveDeckRestriction(representativeCard, deck, ruleConfig)
          : { copyLimit: DEFAULT_COPY_LIMIT_PER_CARD, source: 'default' as const };
        
        let copyLimit = restriction.copyLimit;
        if (representativeCard) {
          const globalLimit = getGlobalIntrinsicLimit(representativeCard, deckState);
          if (globalLimit !== undefined) {
            copyLimit = globalLimit;
          }
        }

        if (count > copyLimit) {
          issues.push({
            code: 'too-many-copies',
            deck,
            cardId,
            dedupeKey,
            expected: copyLimit,
            actual: count,
            restrictionSource: restriction.source,
            restrictionFormat: restriction.format,
          });
        }
      });
    }
  });

  if (ruleConfig.format === 'constructed' || ruleConfig.format === 'crossover') {
    if (deckState.mainDeck.length < 40) {
      issues.push({
        code: 'main-deck-too-small',
        deck: 'main',
        expected: 40,
        actual: deckState.mainDeck.length,
      });
    }

    if (!isRuleConfigured(ruleConfig)) {
      issues.push({ code: 'rule-not-configured' });
    }
  }

  if (ruleConfig.format === 'constructed' && deckState.leaderCards.length !== 1) {
    issues.push({
      code: 'invalid-leader-count',
      deck: 'leader',
      expected: 1,
      actual: deckState.leaderCards.length,
    });
  }

  if (ruleConfig.format === 'crossover') {
    if (deckState.leaderCards.length !== 2) {
      issues.push({
        code: 'invalid-leader-count',
        deck: 'leader',
        expected: 2,
        actual: deckState.leaderCards.length,
      });
    }

    if (isRuleConfigured(ruleConfig) && deckState.leaderCards.length === 2) {
      const [firstClass, secondClass] = ruleConfig.selectedClasses;
      const leaderClasses = deckState.leaderCards
        .map(card => card.class)
        .filter((value): value is CardClass => value !== undefined && value !== '-' && value !== CLASS.NEUTRAL);

      if (
        !firstClass
        || !secondClass
        || leaderClasses.length !== 2
        || !leaderClasses.includes(firstClass)
        || !leaderClasses.includes(secondClass)
      ) {
        issues.push({
          code: 'invalid-crossover-leader-classes',
          deck: 'leader',
        });
      }
    }
  }

  return issues;
};

const DECK_KEYS: Record<DeckTargetSection, string> = {
  main: 'deckBuilder.deckArea.mainDeck',
  evolve: 'deckBuilder.deckArea.evolveDeck',
  leader: 'deckBuilder.deckArea.leader',
  token: 'deckBuilder.deckArea.tokenDeck',
};

export type DeckValidationMessage = {
  id: string;
  params?: Record<string, string | number>;
};

const getCardNameFromDeckState = (deckState: DeckState, cardId: string): string | null => {
  const allCards = [
    ...deckState.mainDeck,
    ...deckState.evolveDeck,
    ...deckState.leaderCards,
    ...deckState.tokenDeck,
  ];

  return allCards.find(card => card.id === cardId)?.name ?? null;
};

const formatCardList = (names: string[]): string => {
  const uniqueNames = Array.from(new Set(names));
  const preview = uniqueNames.slice(0, 3).join(', ');
  return uniqueNames.length > 3 ? `${preview}, ...` : preview;
};

export const getDeckValidationMessages = (
  deckState: DeckState,
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG
): DeckValidationMessage[] => {
  const issues = validateDeckState(deckState, ruleConfig);
  const messages: DeckValidationMessage[] = [];

  issues
    .filter((issue): issue is DeckValidationIssue & { code: 'rule-not-configured' } => issue.code === 'rule-not-configured')
    .forEach(() => {
      if (ruleConfig.format === 'constructed') {
        messages.push({
          id: ruleConfig.identityType === 'title'
            ? 'deckBuilder.validation.requireTitle'
            : 'deckBuilder.validation.requireClass'
        });
      } else if (ruleConfig.format === 'crossover') {
        messages.push({ id: 'deckBuilder.validation.requireCrossoverClasses' });
      }
    });

  issues
    .filter((issue): issue is DeckValidationIssue & { code: 'main-deck-too-small'; actual: number; expected: number } => issue.code === 'main-deck-too-small' && issue.actual !== undefined && issue.expected !== undefined)
    .forEach(issue => {
      messages.push({
        id: 'deckBuilder.validation.mainDeckTooSmall',
        params: { expected: issue.expected, actual: issue.actual }
      });
    });

  issues
    .filter((issue): issue is DeckValidationIssue & { code: 'limit-exceeded'; deck: DeckTargetSection } => issue.code === 'limit-exceeded' && issue.deck !== undefined)
    .forEach(issue => {
      const deckSize = issue.deck === 'main'
        ? deckState.mainDeck.length
        : issue.deck === 'evolve'
          ? deckState.evolveDeck.length
          : issue.deck === 'leader'
            ? deckState.leaderCards.length
            : deckState.tokenDeck.length;
      messages.push({
        id: 'deckBuilder.validation.limitExceeded',
        params: { deckI18nKey: DECK_KEYS[issue.deck], actual: deckSize, expected: getDeckLimit(issue.deck, ruleConfig) }
      });
    });

  issues
    .filter((issue): issue is DeckValidationIssue & { code: 'too-many-copies'; deck: DeckTargetSection; expected: number; actual: number; cardId: string } =>
      issue.code === 'too-many-copies'
      && issue.deck !== undefined
      && issue.expected !== undefined
      && issue.actual !== undefined
      && issue.cardId !== undefined
    )
    .forEach(issue => {
      const cardName = getCardNameFromDeckState(deckState, issue.cardId);
      if (issue.restrictionSource === 'policy-banned' && issue.restrictionFormat) {
        messages.push({
          id: 'deckBuilder.validation.banned',
          params: { cardName: cardName ?? 'This card', format: issue.restrictionFormat }
        });
        return;
      }

      if (issue.restrictionSource === 'policy-limited' && issue.restrictionFormat) {
        messages.push({
          id: 'deckBuilder.validation.limited',
          params: { cardName: cardName ?? 'This card', format: issue.restrictionFormat, actual: issue.actual }
        });
        return;
      }

      messages.push({
        id: 'deckBuilder.validation.tooManyCopies',
        params: { deckI18nKey: DECK_KEYS[issue.deck], cardName: cardName ?? 'a card', actual: issue.actual, expected: issue.expected }
      });
    });

  issues
    .filter((issue): issue is DeckValidationIssue & { code: 'invalid-leader-count'; expected: number; actual: number } => issue.code === 'invalid-leader-count' && issue.expected !== undefined && issue.actual !== undefined)
    .forEach(issue => {
      messages.push({
        id: 'deckBuilder.validation.invalidLeaderCount',
        params: { format: ruleConfig.format, expected: issue.expected, actual: issue.actual }
      });
    });

  if (issues.some(issue => issue.code === 'invalid-crossover-leader-classes')) {
    const [firstClass, secondClass] = ruleConfig.selectedClasses;
    if (firstClass && secondClass) {
      messages.push({
        id: 'deckBuilder.validation.crossoverLeaderClassesInclude',
        params: { firstClass, secondClass }
      });
    } else {
      messages.push({
        id: 'deckBuilder.validation.crossoverLeaderClassesMatch'
      });
    }
  }

  (['invalid-section', 'invalid-rule'] as const).forEach(code => {
    const groupedByDeck = new Map<DeckTargetSection, string[]>();

    issues
      .filter((issue): issue is DeckValidationIssue & { deck: DeckTargetSection; cardId: string } => issue.code === code && issue.deck !== undefined && issue.cardId !== undefined)
      .forEach(issue => {
        const cardName = getCardNameFromDeckState(deckState, issue.cardId);
        if (!cardName) return;
        const current = groupedByDeck.get(issue.deck) ?? [];
        current.push(cardName);
        groupedByDeck.set(issue.deck, current);
      });

    groupedByDeck.forEach((names, deck) => {
      messages.push({
        id: code === 'invalid-section' ? 'deckBuilder.validation.invalidSection' : 'deckBuilder.validation.invalidRule',
        params: { deckI18nKey: DECK_KEYS[deck], cardList: formatCardList(names) }
      });
    });
  });

  const uniqueMessages = new Map<string, DeckValidationMessage>();
  messages.forEach(msg => {
    const key = msg.id + JSON.stringify(msg.params ?? {});
    if (!uniqueMessages.has(key)) {
      uniqueMessages.set(key, msg);
    }
  });

  return Array.from(uniqueMessages.values());
};

type ImportedDeckState = Partial<DeckState> & {
  leaderCard?: DeckBuilderCardData | null;
};

const getImportedLeaderCards = (importedDeck: ImportedDeckState): DeckBuilderCardData[] => {
  if (Array.isArray(importedDeck.leaderCards)) return importedDeck.leaderCards;
  if (importedDeck.leaderCard) return [importedDeck.leaderCard];
  return [];
};

const getRelatedTokenIdentityKey = (card: Pick<DeckBuilderCardData, 'id' | 'name'>): string => {
  const normalizedName = card.name.trim();
  return normalizedName.length > 0 ? `name:${normalizedName}` : `id:${card.id}`;
};

export const appendRelatedTokensToDeckState = (
  deckState: DeckState,
  availableCards: DeckBuilderCardData[],
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG
): DeckState => {
  if (availableCards.length === 0) return deckState;

  const cardCatalogById = new Map(availableCards.map(card => [card.id, card]));
  const tokenIdentityKeys = new Set(deckState.tokenDeck.map(getRelatedTokenIdentityKey));
  const tokensToAppend: DeckBuilderCardData[] = [];

  [
    ...deckState.mainDeck,
    ...deckState.evolveDeck,
    ...deckState.leaderCards,
  ].forEach(card => {
    (card.related_cards ?? []).forEach(relatedCard => {
      const relatedToken = cardCatalogById.get(relatedCard.id);
      if (!relatedToken) return;
      if (inferDeckSection(relatedToken) !== 'token') return;
      if (!canAddCardToSection(relatedToken, 'token', ruleConfig)) return;

      const tokenIdentityKey = getRelatedTokenIdentityKey(relatedToken);
      if (tokenIdentityKeys.has(tokenIdentityKey)) return;

      tokenIdentityKeys.add(tokenIdentityKey);
      tokensToAppend.push(relatedToken);
    });
  });

  if (tokensToAppend.length === 0) return deckState;

  return {
    ...deckState,
    tokenDeck: [...deckState.tokenDeck, ...tokensToAppend],
  };
};

export const sanitizeImportedDeckState = (
  importedDeck: ImportedDeckState,
  availableCards: DeckBuilderCardData[],
  ruleConfig: DeckRuleConfig = DEFAULT_RULE_CONFIG
): DeckState => {
  const cardCatalogById = new Map(availableCards.map(card => [card.id, card]));
  
  const tempDeckState: DeckState = {
    mainDeck: (importedDeck.mainDeck ?? []).map(c => resolveImportedCard(c, cardCatalogById)),
    evolveDeck: (importedDeck.evolveDeck ?? []).map(c => resolveImportedCard(c, cardCatalogById)),
    leaderCards: (getImportedLeaderCards(importedDeck)).map(c => resolveImportedCard(c, cardCatalogById)),
    tokenDeck: (importedDeck.tokenDeck ?? []).map(c => resolveImportedCard(c, cardCatalogById)),
  };

  const leaderCards = sanitizeImportedSection(
    getImportedLeaderCards(importedDeck),
    availableCards,
    'leader',
    ruleConfig,
    tempDeckState
  );

  return appendRelatedTokensToDeckState({
    ...createEmptyDeckState(),
    mainDeck: sanitizeImportedSection(importedDeck.mainDeck ?? [], availableCards, 'main', ruleConfig, tempDeckState),
    evolveDeck: sanitizeImportedSection(importedDeck.evolveDeck ?? [], availableCards, 'evolve', ruleConfig, tempDeckState),
    leaderCards,
    tokenDeck: sanitizeImportedSection(importedDeck.tokenDeck ?? [], availableCards, 'token', ruleConfig, tempDeckState),
  }, availableCards, ruleConfig);
};
