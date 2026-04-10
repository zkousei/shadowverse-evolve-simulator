import { useCallback } from 'react';
import type { PlayerRole } from '../types/game';
import type { DispatchableGameSyncEvent } from './useGameBoardLogic';
import { buildStartedMulliganState, buildClosedMulliganState, toggleMulliganOrderSelection } from '../utils/gameBoardMulligan';

interface UseGameBoardMulliganActionsArgs {
    canInteract: boolean;
    mulliganOrder: string[];
    setMulliganOrder: React.Dispatch<React.SetStateAction<string[]>>;
    setIsMulliganModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    dispatchGameEvent: (event: DispatchableGameSyncEvent) => void;
}

export function useGameBoardMulliganActions({
    canInteract,
    mulliganOrder,
    setMulliganOrder,
    setIsMulliganModalOpen,
    dispatchGameEvent,
}: UseGameBoardMulliganActionsArgs) {
    const startMulligan = useCallback(() => {
        if (!canInteract) return;
        const nextState = buildStartedMulliganState();
        setMulliganOrder(nextState.mulliganOrder);
        setIsMulliganModalOpen(nextState.isMulliganModalOpen);
    }, [canInteract, setIsMulliganModalOpen, setMulliganOrder]);

    const handleMulliganOrderSelect = useCallback((cardId: string) => {
        if (!canInteract) return;
        setMulliganOrder((prev) => toggleMulliganOrderSelection(prev, cardId));
    }, [canInteract, setMulliganOrder]);

    const executeMulligan = useCallback((targetRole?: PlayerRole) => {
        dispatchGameEvent({ type: 'EXECUTE_MULLIGAN', actor: targetRole, selectedIds: mulliganOrder });
        setIsMulliganModalOpen(buildClosedMulliganState().isMulliganModalOpen);
    }, [dispatchGameEvent, mulliganOrder, setIsMulliganModalOpen]);

    return {
        startMulligan,
        handleMulliganOrderSelect,
        executeMulligan,
    };
}
