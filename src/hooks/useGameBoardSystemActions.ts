import { useCallback } from 'react';
import type { PlayerRole } from '../types/game';
import type { DispatchableGameSyncEvent } from './useGameBoardLogic';

interface UseGameBoardSystemActionsArgs {
    canInteract: boolean;
    canUndoTurn: boolean;
    isRollingDice: boolean;
    showTimedTurnMessage: (msg: string, durationMs: number) => void;
    t: (key: string) => string;
    dispatchGameEvent: (event: DispatchableGameSyncEvent) => void;
}

export function useGameBoardSystemActions({
    canInteract,
    canUndoTurn,
    isRollingDice,
    showTimedTurnMessage,
    t,
    dispatchGameEvent,
}: UseGameBoardSystemActionsArgs) {
    const handleStatChange = useCallback((playerKey: 'host' | 'guest', stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo', delta: number) => {
        dispatchGameEvent({ type: 'MODIFY_PLAYER_STAT', playerKey, stat, delta });
    }, [dispatchGameEvent]);

    const setPhase = useCallback((newPhase: 'Start' | 'Main' | 'End') => {
        dispatchGameEvent({ type: 'SET_PHASE', phase: newPhase });
    }, [dispatchGameEvent]);

    const endTurn = useCallback((actor?: PlayerRole) => {
        dispatchGameEvent({ type: 'END_TURN', actor });
    }, [dispatchGameEvent]);

    const handleUndoTurn = useCallback(() => {
        if (!canUndoTurn) return;
        dispatchGameEvent({ type: 'UNDO_LAST_TURN' });
    }, [canUndoTurn, dispatchGameEvent]);

    const handleSetInitialTurnOrder = useCallback((forcedStarter?: 'host' | 'guest') => {
        const isHostFirst = forcedStarter ? (forcedStarter === 'host') : (Math.random() > 0.5);
        const starter = isHostFirst ? 'host' : 'guest';
        dispatchGameEvent({ type: 'SET_INITIAL_TURN_ORDER', starter, manual: Boolean(forcedStarter) });
    }, [dispatchGameEvent]);

    const handlePureCoinFlip = useCallback(() => {
        dispatchGameEvent({ type: 'FLIP_SHARED_COIN' });
    }, [dispatchGameEvent]);

    const handleRollDice = useCallback(() => {
        if (isRollingDice) return;
        dispatchGameEvent({ type: 'ROLL_SHARED_DIE' });
    }, [dispatchGameEvent, isRollingDice]);

    const handleStartGame = useCallback(() => {
        if (!canInteract) return;
        dispatchGameEvent({ type: 'START_GAME' });
        showTimedTurnMessage(t('gameBoard.alerts.gameStart'), 2500);
    }, [canInteract, dispatchGameEvent, showTimedTurnMessage, t]);

    const handleToggleReady = useCallback((targetRole?: PlayerRole) => {
        dispatchGameEvent({ type: 'TOGGLE_READY', actor: targetRole });
    }, [dispatchGameEvent]);

    const handleDrawInitialHand = useCallback((targetRole?: PlayerRole) => {
        dispatchGameEvent({ type: 'DRAW_INITIAL_HAND', actor: targetRole });
    }, [dispatchGameEvent]);

    return {
        handleStatChange,
        setPhase,
        endTurn,
        handleUndoTurn,
        handleSetInitialTurnOrder,
        handlePureCoinFlip,
        handleRollDice,
        handleStartGame,
        handleToggleReady,
        handleDrawInitialHand,
    };
}
