import { describe, expect, it } from 'vitest';
import {
  buildClosedMulliganState,
  buildStartedMulliganState,
  toggleMulliganOrderSelection
} from './gameBoardMulligan';

describe('gameBoardMulligan', () => {
  it('starts mulligan by clearing order and opening the modal', () => {
    expect(buildStartedMulliganState()).toEqual({
      mulliganOrder: [],
      isMulliganModalOpen: true,
    });
  });

  it('toggles mulligan selection while preserving selection order', () => {
    expect(toggleMulliganOrderSelection([], 'hand-1')).toEqual(['hand-1']);
    expect(toggleMulliganOrderSelection(['hand-1'], 'hand-2')).toEqual(['hand-1', 'hand-2']);
    expect(toggleMulliganOrderSelection(['hand-1', 'hand-2'], 'hand-1')).toEqual(['hand-2']);
  });

  it('preserves the current behavior of allowing more than four selections', () => {
    expect(
      toggleMulliganOrderSelection(['h1', 'h2', 'h3', 'h4'], 'h5')
    ).toEqual(['h1', 'h2', 'h3', 'h4', 'h5']);
  });

  it('closes the mulligan modal without mutating the stored order', () => {
    expect(buildClosedMulliganState()).toEqual({
      isMulliganModalOpen: false,
    });
  });
});
