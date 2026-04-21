import type { GameBoardInputProfile } from './gameBoardInputProfile';

export type GameBoardCardSize = {
  width: number;
  height: number;
};

export const desktopCardSize: GameBoardCardSize = {
  width: 100,
  height: 140,
};

export const coarseCardSize: GameBoardCardSize = {
  width: 76,
  height: 106,
};

export const getCardSizeForInputProfile = (inputProfile: GameBoardInputProfile): GameBoardCardSize => (
  inputProfile === 'coarse' ? coarseCardSize : desktopCardSize
);

export const getFieldZoneGapForInputProfile = (inputProfile: GameBoardInputProfile): string => (
  inputProfile === 'coarse' ? '0.36rem' : '1.9rem'
);

export const getExZoneGapForInputProfile = (inputProfile: GameBoardInputProfile): string => (
  inputProfile === 'coarse' ? '0.36rem' : '1rem'
);

export const getStackAttachmentOffsetForInputProfile = (inputProfile: GameBoardInputProfile): { top: number; left: number } => (
  inputProfile === 'coarse'
    ? { top: 14, left: 10 }
    : { top: 20, left: 15 }
);

export const getLinkedCardOffsetForInputProfile = (inputProfile: GameBoardInputProfile): { top: number; left: number; paddingBottom: number } => (
  inputProfile === 'coarse'
    ? { top: 14, left: 10, paddingBottom: 16 }
    : { top: 20, left: 15, paddingBottom: 24 }
);

export const getRequiredFieldWidthForCardCount = (
  cardCount: number,
  inputProfile: GameBoardInputProfile,
  rootFontSizePx = 16
): number => {
  const normalizedCardCount = Math.max(0, cardCount);
  if (normalizedCardCount <= 0) return 0;

  const cardSize = getCardSizeForInputProfile(inputProfile);
  const gapRem = inputProfile === 'coarse' ? 0.36 : 1.9;
  const gapPx = gapRem * rootFontSizePx;
  const horizontalPaddingPx = 16;

  return (cardSize.width * normalizedCardCount)
    + (gapPx * Math.max(0, normalizedCardCount - 1))
    + horizontalPaddingPx;
};
