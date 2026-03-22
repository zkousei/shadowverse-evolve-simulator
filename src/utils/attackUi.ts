import type { PlayerRole } from '../types/game';
import type { AttackTarget, AttackTargetView, SharedUiEffect } from '../types/sync';
import type { CardInstance } from '../components/Card';
import { getSharedActorLabel } from './sharedRandom';

export const canDeclareAttack = (
  cards: CardInstance[],
  actor: PlayerRole,
  attackerCardId: string,
  target: AttackTarget,
  turnPlayer: PlayerRole,
  gameStatus: 'preparing' | 'playing'
): boolean => {
  if (gameStatus !== 'playing') return false;
  if (turnPlayer !== actor) return false;

  const attacker = cards.find(card => card.id === attackerCardId);
  if (!attacker) return false;
  if (attacker.owner !== actor) return false;
  if (attacker.isLeaderCard) return false;
  if (attacker.isFlipped) return false;
  if (attacker.isTapped) return false;
  if (!attacker.zone.startsWith(`field-${actor}`)) return false;

  const opponent = actor === 'host' ? 'guest' : 'host';
  if (target.type === 'leader') {
    return target.player === opponent;
  }

  const targetCard = cards.find(card => card.id === target.cardId);
  if (!targetCard) return false;
  if (targetCard.owner !== opponent) return false;
  if (targetCard.isLeaderCard) return false;
  return targetCard.zone.startsWith(`field-${opponent}`);
};

export const buildAttackDeclaredEffect = (
  cards: CardInstance[],
  actor: PlayerRole,
  attackerCardId: string,
  target: AttackTarget
): SharedUiEffect | null => {
  const attacker = cards.find(card => card.id === attackerCardId);
  if (!attacker) return null;

  let targetView: AttackTargetView | null = null;
  if (target.type === 'leader') {
    targetView = { type: 'leader', player: target.player };
  } else {
    const targetCard = cards.find(card => card.id === target.cardId);
    if (!targetCard) return null;
    targetView = {
      type: 'card',
      cardId: targetCard.id,
      player: targetCard.owner,
      name: targetCard.name,
      isTokenCard: targetCard.isTokenCard,
    };
  }

  if (!targetView) return null;

  return {
    type: 'ATTACK_DECLARED',
    actor,
    attackerCardId,
    attackerName: attacker.name,
    target: targetView,
  };
};

const getAttackTargetLabel = (
  target: AttackTargetView,
  viewerRole: PlayerRole,
  isSoloMode: boolean,
  t: any
): string => {
  if (target.type === 'card') {
    const ownerLabel = getSharedActorLabel(target.player, viewerRole, isSoloMode, t);
    return `${ownerLabel} ${target.name}`;
  }

  const leaderOwnerLabel = getSharedActorLabel(target.player, viewerRole, isSoloMode, t);
  return t('gameBoard.modals.shared.messages.leaderLabel', { owner: leaderOwnerLabel });
};

export const formatAttackEffect = (
  effect: Extract<SharedUiEffect, { type: 'ATTACK_DECLARED' }>,
  viewerRole: PlayerRole,
  isSoloMode: boolean,
  t: any
): { announcement: string; history: string } => {
  const attackerOwnerLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
  const targetLabel = getAttackTargetLabel(effect.target, viewerRole, isSoloMode, t);

  return {
    announcement: t('gameBoard.modals.shared.messages.attackAnnouncement', { attacker: `${attackerOwnerLabel} ${effect.attackerName}`, target: targetLabel }),
    history: t('gameBoard.modals.shared.messages.attackHistory', { attacker: effect.attackerName, target: targetLabel }),
  };
};
