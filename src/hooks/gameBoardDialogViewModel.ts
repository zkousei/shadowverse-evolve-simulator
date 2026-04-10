import { getPlayerLabel } from '../utils/soloMode';
import { filterSavedDeckOptionsBySearch } from '../utils/gameBoardPresentation';
import { getTotalTokenSpawnCount } from '../utils/gameBoardTokens';
import type { LegalSavedDeckOption } from '../utils/gameBoardSavedDecks';
import type { PlayerRole, TokenOption } from '../types/game';

type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

type BuildSavedDeckPickerViewModelArgs = {
  savedDeckOptions: LegalSavedDeckOption[];
  savedDeckSearch: string;
  savedDeckImportTargetRole: PlayerRole | null;
  isSoloMode: boolean;
  role: PlayerRole;
  t: TranslationFn;
};

export const buildSavedDeckPickerViewModel = ({
  savedDeckOptions,
  savedDeckSearch,
  savedDeckImportTargetRole,
  isSoloMode,
  role,
  t,
}: BuildSavedDeckPickerViewModelArgs) => ({
  filteredSavedDeckOptions: filterSavedDeckOptionsBySearch(savedDeckOptions, savedDeckSearch),
  savedDeckPickerTargetLabel: savedDeckImportTargetRole
    ? getPlayerLabel(
        savedDeckImportTargetRole,
        isSoloMode,
        t('common.labels.self'),
        t('common.labels.opponent'),
        role,
        t('common.labels.player1'),
        t('common.labels.player2')
      )
    : null,
});

type BuildTokenSpawnViewModelArgs = {
  tokenSpawnTargetRole: PlayerRole | null;
  tokenSpawnCounts: Record<string, number>;
  getTokenOptions: (role: PlayerRole) => TokenOption[];
};

export const buildTokenSpawnViewModel = ({
  tokenSpawnTargetRole,
  tokenSpawnCounts,
  getTokenOptions,
}: BuildTokenSpawnViewModelArgs) => {
  const tokenSpawnOptions = tokenSpawnTargetRole ? getTokenOptions(tokenSpawnTargetRole) : [];

  return {
    tokenSpawnOptions,
    totalTokenSpawnCount: getTotalTokenSpawnCount(tokenSpawnOptions, tokenSpawnCounts),
  };
};
