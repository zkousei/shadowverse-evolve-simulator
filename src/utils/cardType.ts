import { getBaseCardType, type BaseCardType } from '../models/cardClassification';

export type RuntimeBaseCardType = BaseCardType;

export const normalizeBaseCardType = (value?: string | null): RuntimeBaseCardType | null => {
  if (!value) return null;

  const normalizedByKind = getBaseCardType(value);
  if (normalizedByKind) return normalizedByKind;

  if (value.includes('フォロワー')) return 'follower';
  if (value.includes('スペル')) return 'spell';
  if (value.includes('アミュレット')) return 'amulet';

  return null;
};

export const isAdvanceKind = (cardKindNormalized?: string | null): boolean => (
  Boolean(cardKindNormalized?.startsWith('advance_'))
);

export const isPureEvolveCard = (
  card: { isEvolveCard?: boolean; cardKindNormalized?: string | null } | null | undefined
): boolean => Boolean(card?.isEvolveCard && !isAdvanceKind(card.cardKindNormalized));

export const isMainDeckSpellCard = (
  card: { isEvolveCard?: boolean; baseCardType?: RuntimeBaseCardType | null } | null | undefined
): boolean => Boolean(card && !card.isEvolveCard && card.baseCardType === 'spell');
