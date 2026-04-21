import {
  getBoardDensityForViewportWidth,
  getLayoutProfileForViewportWidth,
  type GameBoardLayoutInputProfile,
  type GameBoardLayoutProfile,
} from '../pages/gameBoardLayout';
import {
  getInputProfileForViewportWidth,
  type GameBoardInputProfile,
} from './gameBoardInputProfile';
import type { GameBoardBoardDensity } from './gameBoardBoardDensity';

type MatchMediaResult = {
  matches: boolean;
};

type MatchMediaFn = (query: string) => MatchMediaResult;

const POINTER_COARSE_QUERY = '(pointer: coarse)';
const ANY_POINTER_COARSE_QUERY = '(any-pointer: coarse)';
const HOVER_HOVER_QUERY = '(hover: hover)';
const ANY_HOVER_HOVER_QUERY = '(any-hover: hover)';

export type GameBoardEnvironment = {
  inputProfile: GameBoardInputProfile;
  layoutProfile: GameBoardLayoutProfile;
  boardDensity: GameBoardBoardDensity;
};

type ResolveBoardEnvironmentArgs = {
  viewportWidth: number;
  viewportHeight: number;
  matchMediaFn?: MatchMediaFn;
};

const resolveEnvironmentInputProfile = (
  viewportWidth: number,
  matchMediaFn?: MatchMediaFn
): GameBoardInputProfile => {
  if (!matchMediaFn || viewportWidth < 900) {
    return getInputProfileForViewportWidth(viewportWidth, matchMediaFn);
  }

  const hasPrimaryCoarsePointer = matchMediaFn(POINTER_COARSE_QUERY).matches;
  const hasAnyCoarsePointer = matchMediaFn(ANY_POINTER_COARSE_QUERY).matches;
  const hasPrimaryHover = matchMediaFn(HOVER_HOVER_QUERY).matches;
  const hasAnyHover = matchMediaFn(ANY_HOVER_HOVER_QUERY).matches;

  if (hasPrimaryCoarsePointer) {
    return 'coarse';
  }

  if (!hasPrimaryHover && !hasAnyHover && hasAnyCoarsePointer) {
    return 'coarse';
  }

  return getInputProfileForViewportWidth(viewportWidth, matchMediaFn);
};

export const resolveBoardEnvironment = ({
  viewportWidth,
  viewportHeight,
  matchMediaFn,
}: ResolveBoardEnvironmentArgs): GameBoardEnvironment => {
  const inputProfile = resolveEnvironmentInputProfile(viewportWidth, matchMediaFn);
  const layoutProfile = getLayoutProfileForViewportWidth(
    viewportWidth,
    inputProfile as GameBoardLayoutInputProfile
  );
  const boardDensity = getBoardDensityForViewportWidth(
    viewportWidth,
    viewportHeight,
    inputProfile as GameBoardLayoutInputProfile
  );

  return {
    inputProfile,
    layoutProfile,
    boardDensity,
  };
};
