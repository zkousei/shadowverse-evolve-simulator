import type { PlayerRole } from '../types/game';

type CanEditSearchedEvolveDeckArgs = {
  searchZoneId?: string | null;
  isSoloMode: boolean;
  isSpectator: boolean;
  searchTargetRole: PlayerRole;
  role: PlayerRole;
};

export const canEditSearchedEvolveDeck = ({
  searchZoneId,
  isSoloMode,
  isSpectator,
  searchTargetRole,
  role,
}: CanEditSearchedEvolveDeckArgs): boolean => (
  Boolean(searchZoneId?.startsWith('evolveDeck-')) &&
  !isSpectator &&
  (isSoloMode || searchTargetRole === role)
);
