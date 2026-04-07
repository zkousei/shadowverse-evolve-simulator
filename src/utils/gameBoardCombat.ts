import type { CardInstance } from '../components/Card';
import type { AttackTarget } from '../types/sync';
import type { CardStatLookup } from './cardStats';
import { getZoneOwner } from './soloMode';

const getOpponentRole = (owner: CardInstance['owner']): CardInstance['owner'] => (
  owner === 'host' ? 'guest' : 'host'
);

const getFieldController = (zone: string): CardInstance['owner'] | null => (
  // Borrowed cards keep their original owner, but attack controls and targets
  // should be based on which player's field currently controls the card.
  zone.startsWith('field-') ? getZoneOwner(zone) : null
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

export const canInspectCard = (card: CardInstance): boolean => (
  isInspectableZone(card.zone) && !card.isFlipped
);

export const shouldClearInspectorSelection = (
  selectedCard: CardInstance | null | undefined
): boolean => !selectedCard || !canInspectCard(selectedCard);

export const canStartAttack = (
  card: CardInstance | null | undefined,
  cardStatLookup: CardStatLookup,
  gameStatus: 'preparing' | 'playing',
  turnPlayer: CardInstance['owner']
): boolean => {
  if (!card) return false;
  if (card.isTapped || card.isFlipped || card.isLeaderCard) return false;
  if (card.baseCardType !== 'follower' && !cardStatLookup[card.cardId]) return false;
  if (gameStatus !== 'playing') return false;
  const controller = getFieldController(card.zone);
  if (!controller) return false;
  if (turnPlayer !== controller) return false;

  return true;
};

export const shouldClearAttackSource = (
  sourceCard: CardInstance | null | undefined,
  gameStatus: 'preparing' | 'playing',
  turnPlayer: CardInstance['owner']
): boolean => (
  !sourceCard
  || sourceCard.isTapped
  || sourceCard.isFlipped
  || gameStatus !== 'playing'
  || getFieldController(sourceCard.zone) !== turnPlayer
);

export const getAttackTargetFromCard = (
  attackSourceCard: CardInstance | null,
  card: CardInstance,
  cardStatLookup: CardStatLookup
): AttackTarget | null => {
  if (!attackSourceCard) return null;

  const attackController = getFieldController(attackSourceCard.zone);
  if (!attackController) return null;

  const opponentRole = getOpponentRole(attackController);

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

  const attackController = getFieldController(attackSourceCard.zone);
  if (!attackController) return false;

  const opponentRole = getOpponentRole(attackController);
  return card.zone.startsWith(`field-${opponentRole}`) && !card.isLeaderCard;
};

export const getAttackHighlightTone = (
  attackSourceCard: CardInstance | null,
  card: CardInstance,
  cardStatLookup: CardStatLookup
): 'attack-source' | 'attack-target' | undefined => {
  if (!attackSourceCard) return undefined;
  if (card.id === attackSourceCard.id) return 'attack-source';

  const attackController = getFieldController(attackSourceCard.zone);
  if (!attackController) return undefined;

  const opponentRole = getOpponentRole(attackController);

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
