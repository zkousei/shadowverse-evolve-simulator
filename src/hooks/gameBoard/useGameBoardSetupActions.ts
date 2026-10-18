import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { PlayerRole, SyncState } from '../../types/game';
import type { DispatchableGameSyncEvent } from './useGameBoardLogic';
import { buildImportedDeckPayload, type ImportableDeckData } from '../../utils/gameBoard/gameBoardDeckActions';
import { canImportDeck } from '../../utils/gameBoard/gameRules';

interface UseGameBoardSetupActionsArgs {
    canInteract: boolean;
    gameState: SyncState;
    gameStateRef?: RefObject<SyncState>;
    role: PlayerRole;
    uuid: () => string;
    dispatchGameEvent: (event: DispatchableGameSyncEvent) => void;
    setShowResetConfirm: (show: boolean) => void;
    t: (key: string) => string;
}

export function useGameBoardSetupActions({
    canInteract,
    gameState,
    gameStateRef,
    role,
    uuid,
    dispatchGameEvent,
    setShowResetConfirm,
    t,
}: UseGameBoardSetupActionsArgs) {
    const latest = useRef({ canInteract, gameState, gameStateRef, role, uuid, dispatchGameEvent, setShowResetConfirm, t });
    const pendingReads = useRef(new Map<PlayerRole, { context: string }>());
    const mounted = useRef(false);
    useLayoutEffect(() => {
        const reads = pendingReads.current;
        mounted.current = true;
        return () => { mounted.current = false; reads.clear(); };
    }, []);
    useLayoutEffect(() => {
        const changedRole = latest.current.role !== role;
        latest.current = { canInteract, gameState, gameStateRef, role, uuid, dispatchGameEvent, setShowResetConfirm, t };
        if (changedRole || !canInteract) {
            pendingReads.current.clear();
            return;
        }
        const state = gameStateRef?.current ?? gameState;
        for (const [target, request] of pendingReads.current) {
            if (!canImportDeck(state, target) || getDeckImportContext(state, target) !== request.context) {
                pendingReads.current.delete(target);
            }
        }
    }, [canInteract, gameState, gameStateRef, role, uuid, dispatchGameEvent, setShowResetConfirm, t]);

    const confirmResetGame = () => {
        pendingReads.current.clear();
        latest.current.setShowResetConfirm(false);
        latest.current.dispatchGameEvent({ type: 'RESET_GAME' });
    };

    const importDeckData = (data: ImportableDeckData, targetRole?: PlayerRole) => {
        const current = latest.current;
        const target = targetRole ?? current.role;
        pendingReads.current.delete(target);
        const payload = buildImportedDeckPayload(data, target, current.uuid);

        current.dispatchGameEvent({
            type: 'IMPORT_DECK',
            actor: target,
            cards: payload.cards,
            tokenOptions: payload.tokenOptions,
        });
    };

    const handleDeckUpload = (event: React.ChangeEvent<HTMLInputElement>, targetRole?: PlayerRole) => {
        const current = latest.current;
        const target = targetRole ?? current.role;
        const state = current.gameStateRef?.current ?? current.gameState;
        if (!mounted.current || !current.canInteract || !canImportDeck(state, target)) {
            event.target.value = '';
            return;
        }
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = '';
        const request = { context: getDeckImportContext(state, target) };
        pendingReads.current.set(target, request);
        const reader = new FileReader();
        reader.onload = (e) => {
            const active = latest.current;
            const currentState = active.gameStateRef?.current ?? active.gameState;
            if (!mounted.current || pendingReads.current.get(target) !== request || !active.canInteract ||
                !canImportDeck(currentState, target) || getDeckImportContext(currentState, target) !== request.context) {
                if (pendingReads.current.get(target) === request) pendingReads.current.delete(target);
                return;
            }
            try {
                const data = JSON.parse(e.target?.result as string) as ImportableDeckData;
                importDeckData(data, target);
            } catch {
                alert(latest.current.t('deckBuilder.alerts.importFailed'));
            } finally {
                if (pendingReads.current.get(target) === request) pendingReads.current.delete(target);
            }
        };
        reader.readAsText(file);
    };

    return {
        confirmResetGame,
        importDeckData,
        handleDeckUpload,
    };
}
// Other players' imports/revisions and presentation-only image/name updates
// must not cancel this player's file read. Avoid serializing custom image data.
const getDeckImportContext = (state: SyncState, target: PlayerRole): string => JSON.stringify({
    cards: state.cards.filter(card => card.owner === target).map(({ image, name, ...card }) => {
        void image; void name;
        return card;
    }),
    tokenOptions: state.tokenOptions[target].map(({ image, name, ...token }) => {
        void image; void name;
        return token;
    }),
});
