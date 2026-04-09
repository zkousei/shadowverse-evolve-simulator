type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

export type GameBoardMenuAction = {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'accent';
};

export const buildRandomDiscardHandAction = (
  onClick: () => void,
  t: TranslationFn
): GameBoardMenuAction[] => [
  {
    label: t('gameBoard.zones.randomDiscardHand'),
    onClick,
    tone: 'accent',
  },
];

export const buildRevealHandAction = (
  onClick: () => void,
  t: TranslationFn
): GameBoardMenuAction[] => [
  {
    label: t('gameBoard.zones.revealHand'),
    onClick,
    tone: 'accent',
  },
];

type BuildMainDeckActionsArgs = {
  onSearch: () => void;
  onShuffle?: () => void;
  onLookTop?: () => void;
  t: TranslationFn;
};

export const buildMainDeckActions = ({
  onSearch,
  onShuffle,
  onLookTop,
  t,
}: BuildMainDeckActionsArgs): GameBoardMenuAction[] => [
  { label: t('gameBoard.zones.search'), onClick: onSearch },
  ...(onShuffle ? [{ label: t('gameBoard.zones.shuffle'), onClick: onShuffle }] : []),
  ...(onLookTop ? [{ label: t('gameBoard.zones.lookTop'), onClick: onLookTop, tone: 'accent' as const }] : []),
];
