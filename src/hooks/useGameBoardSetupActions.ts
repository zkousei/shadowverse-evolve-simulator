import type { PlayerRole, SyncState } from '../types/game';
import type { DispatchableGameSyncEvent } from './useGameBoardLogic';
import { buildImportedDeckPayload, type ImportableDeckData } from '../utils/gameBoardDeckActions';
import { canImportDeck } from '../utils/gameRules';

interface UseGameBoardSetupActionsArgs {
    canInteract: boolean;
    gameState: SyncState;
    role: PlayerRole;
    uuid: () => string;
    dispatchGameEvent: (event: DispatchableGameSyncEvent) => void;
    setShowResetConfirm: (show: boolean) => void;
    t: (key: string) => string;
}

export function useGameBoardSetupActions({
    canInteract,
    gameState,
    role,
    uuid,
    dispatchGameEvent,
    setShowResetConfirm,
    t,
}: UseGameBoardSetupActionsArgs) {
    const confirmResetGame = () => {
        setShowResetConfirm(false);
        dispatchGameEvent({ type: 'RESET_GAME' });
    };

    const importDeckData = (data: ImportableDeckData, targetRole: PlayerRole = role) => {
        const payload = buildImportedDeckPayload(data, targetRole, uuid);

        dispatchGameEvent({
            type: 'IMPORT_DECK',
            actor: targetRole,
            cards: payload.cards,
            tokenOptions: payload.tokenOptions,
        });
    };

    const handleDeckUpload = (event: React.ChangeEvent<HTMLInputElement>, targetRole: PlayerRole = role) => {
        if (!canInteract) {
            event.target.value = '';
            return;
        }
        if (!canImportDeck(gameState, targetRole)) {
            event.target.value = '';
            return;
        }
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = '';
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string) as ImportableDeckData;
                importDeckData(data, targetRole);
            } catch {
                alert(t('deckBuilder.alerts.importFailed'));
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
