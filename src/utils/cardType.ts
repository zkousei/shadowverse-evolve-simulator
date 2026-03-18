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

export const isMainDeckSpellCard = (
  card: { isEvolveCard?: boolean; baseCardType?: RuntimeBaseCardType | null } | null | undefined
): boolean => Boolean(card && !card.isEvolveCard && card.baseCardType === 'spell');

