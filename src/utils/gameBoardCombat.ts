import type { CardInstance } from '../components/Card';
import type { AttackTarget } from '../types/sync';
import type { CardStatLookup } from './cardStats';

const getOpponentRole = (owner: CardInstance['owner']): CardInstance['owner'] => (
  owner === 'host' ? 'guest' : 'host'
);

export const isInspectableZone = (zone: string): boolean => (
  zone.startsWith('hand-')
  || zone.startsWith('field-')
  || zone.startsWith('ex-')
  || zone.startsWith('cemetery-')
  || zone.startsWith('banish-')
  || zone.startsWith('evolveDeck-')
  || zone.startsWith('leader-')
);

export const getAttackTargetFromCard = (
  attackSourceCard: CardInstance | null,
  card: CardInstance,
  cardStatLookup: CardStatLookup
): AttackTarget | null => {
  if (!attackSourceCard) return null;

  const opponentRole = getOpponentRole(attackSourceCard.owner);

  if (card.zone === `leader-${opponentRole}`) {
    return { type: 'leader', player: opponentRole };
  }

  if (
    card.zone.startsWith(`field-${opponentRole}`)
    && !card.isLeaderCard
    && (Boolean(cardStatLookup[card.cardId]) || card.isTokenCard)
  ) {
    return { type: 'card', cardId: card.id };
  }

  return null;
};

export const shouldDisableQuickActionsForAttackTarget = (
  attackSourceCard: CardInstance | null,
  card: CardInstance
): boolean => {
  if (!attackSourceCard) return false;

  const opponentRole = getOpponentRole(attackSourceCard.owner);
  return card.zone.startsWith(`field-${opponentRole}`) && !card.isLeaderCard;
};

export const getAttackHighlightTone = (
  attackSourceCard: CardInstance | null,
  card: CardInstance,
  cardStatLookup: CardStatLookup
): 'attack-source' | 'attack-target' | undefined => {
  if (!attackSourceCard) return undefined;
  if (card.id === attackSourceCard.id) return 'attack-source';

  const opponentRole = getOpponentRole(attackSourceCard.owner);

  if (card.zone === `leader-${opponentRole}`) return 'attack-target';

  if (
    card.zone.startsWith(`field-${opponentRole}`)
    && !card.isLeaderCard
    && (card.baseCardType === 'follower' || Boolean(cardStatLookup[card.cardId]))
  ) {
    return 'attack-target';
  }

  return undefined;
};
