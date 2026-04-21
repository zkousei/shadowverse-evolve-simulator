import { isTabletViewportWidth } from '../pages/gameBoardLayout';

export type GameBoardInputProfile = 'fine' | 'coarse';

type MatchMediaResult = {
  matches: boolean;
};

type MatchMediaFn = (query: string) => MatchMediaResult;

const POINTER_COARSE_QUERY = '(pointer: coarse)';

export const getInputProfileForViewportWidth = (
  viewportWidth: number,
  matchMediaFn?: MatchMediaFn
): GameBoardInputProfile => {
  if (!isTabletViewportWidth(viewportWidth)) {
    return 'fine';
  }

  if (!matchMediaFn) {
    return 'fine';
  }

  return matchMediaFn(POINTER_COARSE_QUERY).matches ? 'coarse' : 'fine';
};

export const resolveInputProfile = (viewportWidth: number): GameBoardInputProfile => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return getInputProfileForViewportWidth(viewportWidth);
  }

  return getInputProfileForViewportWidth(viewportWidth, window.matchMedia.bind(window));
};
