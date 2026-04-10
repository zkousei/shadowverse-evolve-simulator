import { useCallback } from 'react';
import type { PlayerRole, SyncState } from '../types/game';
import type { SharedUiEffect } from '../types/sync';
import type { CardInstance } from '../components/Card';
import * as CardLogic from '../utils/cardLogic';
import type { DispatchableGameSyncEvent } from './useGameBoardLogic';
import { canLookAtTopDeck } from '../utils/gameBoardInteraction';
import { buildHandRevealEffect } from '../utils/cardReveal';

interface UseGameBoardCardActionsArgs {
    canInteract: boolean;
    gameStatus: SyncState['gameStatus'];
    gameStateCards: CardInstance[];
    lastUndoableCardMoveState: SyncState['lastUndoableCardMoveState'];
    lastUndoableCardMoveActor: PlayerRole | null | undefined;
    networkHasUndoableCardMove?: boolean;
    isSoloMode: boolean;
    isHost: boolean;
    role: PlayerRole;
    playSharedUiEffect: (effect: SharedUiEffect) => void;
    sendSharedUiEffect: (effect: SharedUiEffect) => void;
    dispatchGameEvent: (event: DispatchableGameSyncEvent) => void;
    setTopDeckTargetRole: (targetRole: PlayerRole) => void;
    setTopDeckCards: (cards: CardInstance[]) => void;
}

export function useGameBoardCardActions({
    canInteract,
    gameStatus,
    gameStateCards,
    lastUndoableCardMoveState,
    lastUndoableCardMoveActor,
    networkHasUndoableCardMove,
    isSoloMode,
    isHost,
    role,
    playSharedUiEffect,
    sendSharedUiEffect,
    dispatchGameEvent,
    setTopDeckTargetRole,
    setTopDeckCards,
}: UseGameBoardCardActionsArgs) {
    const drawCard = useCallback((targetRole?: PlayerRole) => {
        dispatchGameEvent({ type: 'DRAW_CARD', actor: targetRole });
    }, [dispatchGameEvent]);

    const millCard = useCallback((targetRole?: PlayerRole) => {
        dispatchGameEvent({ type: 'MILL_CARD', actor: targetRole });
    }, [dispatchGameEvent]);

    const moveTopCardToEx = useCallback((targetRole?: PlayerRole) => {
        dispatchGameEvent({ type: 'MOVE_TOP_CARD_TO_EX', actor: targetRole });
    }, [dispatchGameEvent]);

    const discardRandomHandCards = useCallback((targetRole: PlayerRole, count: number, actor: PlayerRole = role) => {
        if (!Number.isFinite(count)) return;
        const normalizedCount = Math.floor(count);
        if (normalizedCount <= 0) return;
        dispatchGameEvent({
            type: 'DISCARD_RANDOM_HAND_CARDS',
            actor,
            target: targetRole,
            count: normalizedCount,
        });
    }, [dispatchGameEvent, role]);

    const revealHand = useCallback(() => {
        if (isSoloMode || !canInteract || gameStatus !== 'playing') return;
        const effect = buildHandRevealEffect(gameStateCards, role);
        if (!effect) return;

        playSharedUiEffect(effect);
        sendSharedUiEffect(effect);
    }, [canInteract, gameStateCards, gameStatus, isSoloMode, playSharedUiEffect, role, sendSharedUiEffect]);

    const handleLookAtTop = useCallback((n: number, targetRole: PlayerRole = role) => {
        if (!canLookAtTopDeck({ canInteract, gameStatus })) return;
        const myDeck = gameStateCards.filter(c => c.zone === `mainDeck-${targetRole}`);
        setTopDeckTargetRole(targetRole);
        setTopDeckCards(myDeck.slice(0, n));
    }, [canInteract, gameStatus, gameStateCards, role, setTopDeckCards, setTopDeckTargetRole]);

    const handleResolveTopDeck = useCallback((results: CardLogic.TopDeckResult[], targetRole?: PlayerRole) => {
        dispatchGameEvent({ type: 'RESOLVE_TOP_DECK', actor: targetRole, results });
        setTopDeckCards([]);
    }, [dispatchGameEvent, setTopDeckCards]);

    const handleUndoCardMove = useCallback(() => {
        const canUndo = isSoloMode || isHost
            ? !!lastUndoableCardMoveState
            : !!(networkHasUndoableCardMove ?? lastUndoableCardMoveState);
        if (!canUndo) return;
        const undoActor = isSoloMode
            ? lastUndoableCardMoveActor ?? role
            : role;
        dispatchGameEvent({ type: 'UNDO_CARD_MOVE', actor: undoActor });
    }, [dispatchGameEvent, isHost, isSoloMode, lastUndoableCardMoveActor, lastUndoableCardMoveState, networkHasUndoableCardMove, role]);

    return {
        drawCard,
        millCard,
        moveTopCardToEx,
        discardRandomHandCards,
        revealHand,
        handleLookAtTop,
        handleResolveTopDeck,
        handleUndoCardMove,
    };
}
