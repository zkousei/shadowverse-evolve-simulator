import type { GameBoardInputProfile } from './gameBoardInputProfile';
import type { GameBoardBoardDensity } from './gameBoardBoardDensity';

export type GameBoardCardSize = {
  width: number;
  height: number;
};

export const desktopCardSize: GameBoardCardSize = {
  width: 100,
  height: 140,
};

export const overviewDesktopCardSize: GameBoardCardSize = {
  width: 88,
  height: 123,
};

export const coarseCardSize: GameBoardCardSize = {
  width: 76,
  height: 106,
};

export const getCardSizeForInputProfile = (
  inputProfile: GameBoardInputProfile,
  boardDensity: GameBoardBoardDensity = 'standard'
): GameBoardCardSize => (
  inputProfile === 'coarse'
    ? coarseCardSize
    : boardDensity === 'overview'
      ? overviewDesktopCardSize
      : desktopCardSize
);

export const getFieldZoneGapForInputProfile = (
  inputProfile: GameBoardInputProfile,
  boardDensity: GameBoardBoardDensity = 'standard'
): string => (
  inputProfile === 'coarse'
    ? '0.36rem'
    : boardDensity === 'overview'
      ? '1.05rem'
      : '1.9rem'
);

export const getExZoneGapForInputProfile = (
  inputProfile: GameBoardInputProfile,
  boardDensity: GameBoardBoardDensity = 'standard'
): string => (
  inputProfile === 'coarse'
    ? '0.36rem'
    : boardDensity === 'overview'
      ? '0.5rem'
      : '1rem'
);

export const getStackAttachmentOffsetForInputProfile = (
  inputProfile: GameBoardInputProfile,
  boardDensity: GameBoardBoardDensity = 'standard'
): { top: number; left: number } => (
  inputProfile === 'coarse'
    ? { top: 14, left: 10 }
    : boardDensity === 'overview'
      ? { top: 16, left: 12 }
    : { top: 20, left: 15 }
);

export const getLinkedCardOffsetForInputProfile = (
  inputProfile: GameBoardInputProfile,
  boardDensity: GameBoardBoardDensity = 'standard'
): { top: number; left: number; paddingBottom: number } => (
  inputProfile === 'coarse'
    ? { top: 14, left: 10, paddingBottom: 16 }
    : boardDensity === 'overview'
      ? { top: 16, left: 12, paddingBottom: 18 }
    : { top: 20, left: 15, paddingBottom: 24 }
);

export const getRequiredFieldWidthForCardCount = (
  cardCount: number,
  inputProfile: GameBoardInputProfile,
  rootFontSizePx = 16,
  boardDensity: GameBoardBoardDensity = 'standard'
): number => {
  const normalizedCardCount = Math.max(0, cardCount);
  if (normalizedCardCount <= 0) return 0;

  const cardSize = getCardSizeForInputProfile(inputProfile, boardDensity);
  const gapRem = inputProfile === 'coarse'
    ? 0.36
    : boardDensity === 'overview'
      ? 1.05
      : 1.9;
  const gapPx = gapRem * rootFontSizePx;
  const horizontalPaddingPx = 16;

  return (cardSize.width * normalizedCardCount)
    + (gapPx * Math.max(0, normalizedCardCount - 1))
    + horizontalPaddingPx;
};
