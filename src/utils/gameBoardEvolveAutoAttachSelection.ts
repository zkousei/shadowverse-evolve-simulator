import type { CardInstance } from '../components/Card';
import type { PlayerRole } from '../types/game';

export type PendingGameBoardEvolveAutoAttachSelection = {
  sourceCardId: string;
  actor: PlayerRole;
};

export type ResolvedGameBoardEvolveAutoAttachSelection = {
  sourceCard: CardInstance;
  candidateCards: CardInstance[];
  placement: 'stack' | 'linked';
};

export type GameBoardEvolveAutoAttachSelection = {
  actor: PlayerRole;
  sourceCard: CardInstance;
  candidateCards: CardInstance[];
  placement: 'stack' | 'linked';
};

export const buildGameBoardEvolveAutoAttachSelection = ({
  pendingSelection,
  cards,
  resolveSelection,
}: {
  pendingSelection: PendingGameBoardEvolveAutoAttachSelection | null;
  cards: CardInstance[];
  resolveSelection: (
    cardId: string,
    cards: CardInstance[]
  ) => ResolvedGameBoardEvolveAutoAttachSelection | null;
}): GameBoardEvolveAutoAttachSelection | null => {
  if (!pendingSelection) return null;

  const resolvedSelection = resolveSelection(pendingSelection.sourceCardId, cards);
  const sourceCard = resolvedSelection?.sourceCard;
  if (!sourceCard || sourceCard.zone !== `evolveDeck-${pendingSelection.actor}`) return null;

  const candidateCards = resolvedSelection?.candidateCards ?? [];
  if (candidateCards.length === 0) return null;

  return {
    actor: pendingSelection.actor,
    sourceCard,
    candidateCards,
    placement: resolvedSelection.placement,
  };
};
