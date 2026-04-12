import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameBoardMulliganActions } from './useGameBoardMulliganActions';
import * as gameBoardMulligan from '../utils/gameBoardMulligan';

vi.mock('../utils/gameBoardMulligan', () => ({
    buildStartedMulliganState: vi.fn(),
    buildClosedMulliganState: vi.fn(),
    toggleMulliganOrderSelection: vi.fn(),
}));

describe('useGameBoardMulliganActions (Pure Hook)', () => {
    const defaultArgs = {
        canInteract: true,
        mulliganOrder: [] as string[],
        setMulliganOrder: vi.fn(),
        setIsMulliganModalOpen: vi.fn(),
        dispatchGameEvent: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('startMulligan opens modal and sets initial order', () => {
        vi.mocked(gameBoardMulligan.buildStartedMulliganState).mockReturnValue({
            mulliganOrder: [],
            isMulliganModalOpen: true,
        });

        const { result } = renderHook(() => useGameBoardMulliganActions(defaultArgs));
        result.current.startMulligan();

        expect(defaultArgs.setMulliganOrder).toHaveBeenCalledWith([]);
        expect(defaultArgs.setIsMulliganModalOpen).toHaveBeenCalledWith(true);
    });

    it('startMulligan aborts if cannot interact', () => {
        const { result } = renderHook(() => useGameBoardMulliganActions({ ...defaultArgs, canInteract: false }));
        result.current.startMulligan();

        expect(defaultArgs.setIsMulliganModalOpen).not.toHaveBeenCalled();
    });

    it('handleMulliganOrderSelect toggles selection', () => {
        vi.mocked(gameBoardMulligan.toggleMulliganOrderSelection).mockReturnValue(['card-1']);

        const { result } = renderHook(() => useGameBoardMulliganActions(defaultArgs));
        result.current.handleMulliganOrderSelect('card-1');

        expect(defaultArgs.setMulliganOrder).toHaveBeenCalled();
        const stateUpdater = vi.mocked(defaultArgs.setMulliganOrder).mock.calls[0][0] as (prev: string[]) => string[];
        const nextState = stateUpdater([]);

        expect(nextState).toEqual(['card-1']);
    });

    it('handleMulliganOrderSelect aborts if cannot interact', () => {
        const { result } = renderHook(() => useGameBoardMulliganActions({ ...defaultArgs, canInteract: false }));
        result.current.handleMulliganOrderSelect('card-1');

        expect(defaultArgs.setMulliganOrder).not.toHaveBeenCalled();
    });

    it('executeMulligan dispatches EXECUTE_MULLIGAN and closes modal', () => {
        vi.mocked(gameBoardMulligan.buildClosedMulliganState).mockReturnValue({
            isMulliganModalOpen: false,
        });

        const { result } = renderHook(() => useGameBoardMulliganActions({
            ...defaultArgs,
            mulliganOrder: ['card-1', 'card-2']
        }));
        result.current.executeMulligan('guest');

        expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
            type: 'EXECUTE_MULLIGAN',
            actor: 'guest',
            selectedIds: ['card-1', 'card-2']
        });
        expect(defaultArgs.setIsMulliganModalOpen).toHaveBeenCalledWith(false);
    });
});
