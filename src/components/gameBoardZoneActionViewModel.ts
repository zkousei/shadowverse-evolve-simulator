import {
  buildMainDeckActions,
  buildRandomDiscardHandAction,
  buildRevealHandAction,
  type GameBoardMenuAction,
} from './gameBoardMenuActions';

type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

type ZoneActionsConfig = {
  menuId: string;
  actionsLabel: string;
  actions: GameBoardMenuAction[];
};

export const buildRandomDiscardHandZoneActions = (
  playerRole: string,
  onClick: () => void,
  t: TranslationFn
): ZoneActionsConfig => ({
  menuId: `hand-random-discard-${playerRole}`,
  actionsLabel: t('gameBoard.board.actions'),
  actions: buildRandomDiscardHandAction(onClick, t),
});

export const buildRevealHandZoneActions = (
  playerRole: string,
  onClick: () => void,
  t: TranslationFn
): ZoneActionsConfig => ({
  menuId: `hand-reveal-${playerRole}`,
  actionsLabel: t('gameBoard.board.actions'),
  actions: buildRevealHandAction(onClick, t),
});

type BuildMainDeckZoneActionsArgs = {
  playerRole: string;
  onSearch: () => void;
  onShuffle?: () => void;
  onLookTop?: () => void;
  t: TranslationFn;
};

export const buildMainDeckZoneActions = ({
  playerRole,
  onSearch,
  onShuffle,
  onLookTop,
  t,
}: BuildMainDeckZoneActionsArgs): ZoneActionsConfig => ({
  menuId: `mainDeck-${playerRole}`,
  actionsLabel: t('gameBoard.board.actions'),
  actions: buildMainDeckActions({
    onSearch,
    onShuffle,
    onLookTop,
    t,
  }),
});
