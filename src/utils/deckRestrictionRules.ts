import { getIntrinsicDeckExceptionForCard } from '../data/intrinsicDeckExceptions';
import { getPolicyRestrictionForCard } from '../data/policyRestrictions';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { EffectiveDeckRestriction } from '../models/deckRestriction';
import type { DeckRuleConfig } from '../models/deckRule';

export const DEFAULT_COPY_LIMIT_PER_CARD = 3;

export const getEffectiveDeckRestriction = (
  card: DeckBuilderCardData,
  _targetSection: 'main' | 'evolve',
  ruleConfig: DeckRuleConfig
): EffectiveDeckRestriction => {
  if (ruleConfig.format === 'constructed' || ruleConfig.format === 'crossover') {
    const policyRestriction = getPolicyRestrictionForCard(card, ruleConfig.format);
    if (policyRestriction) {
      return {
        copyLimit: policyRestriction.status === 'banned' ? 0 : 1,
        source: policyRestriction.status === 'banned' ? 'policy-banned' : 'policy-limited',
        reason: policyRestriction.reason,
        format: ruleConfig.format,
      };
    }
  }

  const intrinsicException = getIntrinsicDeckExceptionForCard(card);
  if (intrinsicException) {
    return {
      copyLimit: intrinsicException.copyLimit,
      source: 'intrinsic',
      reason: intrinsicException.reason,
    };
  }

  return {
    copyLimit: DEFAULT_COPY_LIMIT_PER_CARD,
    source: 'default',
  };
};
