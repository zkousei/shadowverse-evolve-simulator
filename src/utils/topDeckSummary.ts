import type { CardInstance } from '../components/Card';
import type { PlayerRole } from '../types/game';
import type { SharedUiEffect } from '../types/sync';
import type { TopDeckResult } from './cardLogic';

export const buildTopDeckSummaryEffect = (
  cards: CardInstance[],
  actor: PlayerRole,
  results: TopDeckResult[]
): Extract<SharedUiEffect, { type: 'LOOK_TOP_RESOLVED' }> | null => {
  if (results.length === 0) return null;

  const getCardName = (cardId: string) => cards.find(card => card.id === cardId)?.name ?? 'Unknown Card';

  return {
    type: 'LOOK_TOP_RESOLVED',
    actor,
    totalCount: results.length,
    topCount: results.filter(result => result.action === 'top').length,
    bottomCount: results.filter(result => result.action === 'bottom').length,
    handCount: results.filter(result => result.action === 'hand').length,
    revealedHandCards: results.filter(result => result.action === 'revealedHand').map(result => getCardName(result.cardId)),
    fieldCards: results.filter(result => result.action === 'field').map(result => getCardName(result.cardId)),
    exCards: results.filter(result => result.action === 'ex').map(result => getCardName(result.cardId)),
    cemeteryCards: results.filter(result => result.action === 'cemetery').map(result => getCardName(result.cardId)),
  };
};
