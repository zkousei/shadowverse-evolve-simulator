export type GameBoardMulliganUiState = {
  mulliganOrder: string[];
  isMulliganModalOpen: boolean;
};

export const buildStartedMulliganState = (): GameBoardMulliganUiState => ({
  mulliganOrder: [],
  isMulliganModalOpen: true,
});

export const toggleMulliganOrderSelection = (
  mulliganOrder: string[],
  cardId: string
): string[] => (
  mulliganOrder.includes(cardId)
    ? mulliganOrder.filter((id) => id !== cardId)
    : [...mulliganOrder, cardId]
);

export const buildClosedMulliganState = (): Pick<GameBoardMulliganUiState, 'isMulliganModalOpen'> => ({
  isMulliganModalOpen: false,
});
