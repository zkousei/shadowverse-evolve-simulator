import React from 'react';
import type { CardInstance } from '../components/Card';
import type { PlayerRole, SyncState, TokenOption } from '../types/game';
import { buildTokenSpawnSelections, getTotalTokenSpawnCount, updateTokenSpawnCounts } from '../utils/gameBoardTokens';

type TokenSpawnDestination = 'ex' | 'field';

type TokenSpawnSelection = ReturnType<typeof buildTokenSpawnSelections>;

type UseGameBoardDialogsUiArgs = {
  canInteract: boolean;
  gameStatus: SyncState['gameStatus'];
  getCards: (zoneId: string) => CardInstance[];
  setTopDeckTargetRole: (role: PlayerRole) => void;
  getTokenOptions: (role: PlayerRole) => TokenOption[];
  spawnTokens: (
    targetRole: PlayerRole,
    selections: TokenSpawnSelection,
    destination: TokenSpawnDestination
  ) => void;
};

export const useGameBoardDialogsUi = ({
  canInteract,
  gameStatus,
  getCards,
  setTopDeckTargetRole,
  getTokenOptions,
  spawnTokens,
}: UseGameBoardDialogsUiArgs) => {
  const [isTopNInputOpen, setIsTopNInputOpen] = React.useState(false);
  const [topNValue, setTopNValue] = React.useState(3);
  const [randomDiscardValue, setRandomDiscardValue] = React.useState(1);
  const [randomDiscardTargetRole, setRandomDiscardTargetRole] = React.useState<PlayerRole | null>(null);
  const [randomDiscardActorRole, setRandomDiscardActorRole] = React.useState<PlayerRole | null>(null);
  const [tokenSpawnTargetRole, setTokenSpawnTargetRole] = React.useState<PlayerRole | null>(null);
  const [tokenSpawnCounts, setTokenSpawnCounts] = React.useState<Record<string, number>>({});
  const [tokenSpawnDestination, setTokenSpawnDestination] = React.useState<TokenSpawnDestination>('ex');
  const [showUndoConfirm, setShowUndoConfirm] = React.useState(false);

  const tokenSpawnOptions = React.useMemo(
    () => (tokenSpawnTargetRole ? getTokenOptions(tokenSpawnTargetRole) : []),
    [getTokenOptions, tokenSpawnTargetRole]
  );
  const totalTokenSpawnCount = React.useMemo(
    () => getTotalTokenSpawnCount(tokenSpawnOptions, tokenSpawnCounts),
    [tokenSpawnCounts, tokenSpawnOptions]
  );

  const openTopDeckModal = React.useCallback((targetRole: PlayerRole) => {
    if (!canInteract) return;

    setTopDeckTargetRole(targetRole);
    setIsTopNInputOpen(true);
  }, [canInteract, setTopDeckTargetRole]);

  const openRandomDiscardDialog = React.useCallback((targetRole: PlayerRole, actorRole: PlayerRole) => {
    if (!canInteract) return;
    if (gameStatus !== 'playing') return;
    if (targetRole === actorRole) return;
    if (getCards(`hand-${targetRole}`).length === 0) return;

    setRandomDiscardValue(1);
    setRandomDiscardTargetRole(targetRole);
    setRandomDiscardActorRole(actorRole);
  }, [canInteract, gameStatus, getCards]);

  const closeRandomDiscardDialog = React.useCallback(() => {
    setRandomDiscardTargetRole(null);
    setRandomDiscardActorRole(null);
  }, []);

  const openTokenSpawnModal = React.useCallback((targetRole: PlayerRole) => {
    if (!canInteract) return;

    setTokenSpawnTargetRole(targetRole);
    setTokenSpawnCounts({});
    setTokenSpawnDestination('ex');
  }, [canInteract]);

  const closeTokenSpawnModal = React.useCallback(() => {
    setTokenSpawnTargetRole(null);
  }, []);

  const handleTokenSpawn = React.useCallback(() => {
    if (!tokenSpawnTargetRole) return;

    spawnTokens(
      tokenSpawnTargetRole,
      buildTokenSpawnSelections(tokenSpawnOptions, tokenSpawnCounts),
      tokenSpawnDestination
    );
    setTokenSpawnCounts({});
    setTokenSpawnTargetRole(null);
  }, [spawnTokens, tokenSpawnCounts, tokenSpawnDestination, tokenSpawnOptions, tokenSpawnTargetRole]);

  const handleTokenSpawnCountChange = React.useCallback((cardId: string, delta: number) => {
    setTokenSpawnCounts((current) => updateTokenSpawnCounts(current, cardId, delta));
  }, []);

  const handleQuickTokenSpawn = React.useCallback((cardId: string) => {
    if (!tokenSpawnTargetRole) return;

    const tokenOption = tokenSpawnOptions.find((token) => token.cardId === cardId);
    if (!tokenOption) return;

    spawnTokens(
      tokenSpawnTargetRole,
      [{ tokenOption, count: 1 }],
      tokenSpawnDestination
    );
    setTokenSpawnCounts({});
    setTokenSpawnTargetRole(null);
  }, [spawnTokens, tokenSpawnDestination, tokenSpawnOptions, tokenSpawnTargetRole]);

  const resetDialogsForConnectionChange = React.useCallback(() => {
    setIsTopNInputOpen(false);
    setTokenSpawnTargetRole(null);
    setShowUndoConfirm(false);
  }, []);

  return {
    isTopNInputOpen,
    setIsTopNInputOpen,
    topNValue,
    setTopNValue,
    randomDiscardValue,
    setRandomDiscardValue,
    randomDiscardTargetRole,
    randomDiscardActorRole,
    tokenSpawnTargetRole,
    tokenSpawnCounts,
    tokenSpawnDestination,
    setTokenSpawnDestination,
    showUndoConfirm,
    setShowUndoConfirm,
    tokenSpawnOptions,
    totalTokenSpawnCount,
    openTopDeckModal,
    openRandomDiscardDialog,
    closeRandomDiscardDialog,
    openTokenSpawnModal,
    closeTokenSpawnModal,
    handleTokenSpawn,
    handleTokenSpawnCountChange,
    handleQuickTokenSpawn,
    resetDialogsForConnectionChange,
  };
};
