import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGameBoardMulliganActions } from './useGameBoardMulliganActions';

describe('useGameBoardMulliganActions', () => {
    it('starts mulligan by clearing any local selection and opening the modal', () => {
        const setMulliganOrder = vi.fn();
        const setIsMulliganModalOpen = vi.fn();
        const dispatchGameEvent = vi.fn();

        const { result } = renderHook(() =>
            useGameBoardMulliganActions({
                canInteract: true,
                mulliganOrder: [],
                setMulliganOrder,
                setIsMulliganModalOpen,
                dispatchGameEvent,
            })
        );

        act(() => {
            result.current.startMulligan();
        });

        expect(setMulliganOrder).toHaveBeenCalledWith([]);
        expect(setIsMulliganModalOpen).toHaveBeenCalledWith(true);
    });

    it('selects mulligan order by calling toggle utility', () => {
        const setMulliganOrder = vi.fn((setter) => {
            // Execute the setter to simulate the state update
            setter(['hand1']);
        });
        const setIsMulliganModalOpen = vi.fn();
        const dispatchGameEvent = vi.fn();

        const { result } = renderHook(() =>
            useGameBoardMulliganActions({
                canInteract: true,
                mulliganOrder: [],
                setMulliganOrder,
                setIsMulliganModalOpen,
                dispatchGameEvent,
            })
        );

        act(() => {
            result.current.handleMulliganOrderSelect('hand2');
        });

        expect(setMulliganOrder).toHaveBeenCalled();
    });

    it('executes mulligan, dispatches event and closes modal', () => {
        const setMulliganOrder = vi.fn();
        const setIsMulliganModalOpen = vi.fn();
        const dispatchGameEvent = vi.fn();

        const { result } = renderHook(() =>
            useGameBoardMulliganActions({
                canInteract: true,
                mulliganOrder: ['hand1', 'hand2'],
                setMulliganOrder,
                setIsMulliganModalOpen,
                dispatchGameEvent,
            })
        );

        act(() => {
            result.current.executeMulligan('host');
        });

        expect(dispatchGameEvent).toHaveBeenCalledWith({
            type: 'EXECUTE_MULLIGAN',
            actor: 'host',
            selectedIds: ['hand1', 'hand2'],
        });
        expect(setIsMulliganModalOpen).toHaveBeenCalledWith(false);
    });
});
