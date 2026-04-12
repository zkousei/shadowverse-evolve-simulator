import { useCallback } from 'react';
import { type DragEndEvent } from '@dnd-kit/core';
import type { PlayerRole, SyncState, TokenOption } from '../types/game';
import type { AttackTarget } from '../types/sync';
import type { CardInstance } from '../components/Card';
import type { DispatchableGameSyncEvent } from './useGameBoardLogic';
import { buildSpawnTokenInstance, buildSpawnTokens } from '../utils/gameBoardDeckActions';
import { findUnitRootCard, isEquipmentLinkTargetCard, isTokenEquipmentCard } from '../utils/gameBoardManualLink';


interface UseGameBoardFieldActionsArgs {
    gameStateRef: React.MutableRefObject<SyncState>;
    isSoloMode: boolean;
    role: PlayerRole;
    uuid: () => string;
    defaultTokenOption: React.MutableRefObject<TokenOption>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cardCatalogByIdRef: React.MutableRefObject<Record<string, any>>;
    tokenEquipmentCardIdsRef: React.MutableRefObject<Set<string>>;
    fieldLinkCardIdsRef: React.MutableRefObject<Set<string>>;
    setSearchZone: React.Dispatch<React.SetStateAction<{ id: string; title: string; } | null>>;
    resolveEvolveAutoAttachSelection: (cardId: string) => { placement: 'linked' | 'stack'; candidateCards: CardInstance[] } | null;
    executeEvolveAutoAttach: (cardId: string, actor: PlayerRole, targetCardId: string, placement: 'linked' | 'stack') => void;
    queueEvolveAutoAttachSelection: (cardId: string, actor: PlayerRole) => void;
    dispatchGameEvent: (event: DispatchableGameSyncEvent) => void;
}

export function useGameBoardFieldActions({
    gameStateRef,
    isSoloMode,
    role,
    uuid,
    defaultTokenOption,
    cardCatalogByIdRef,
    tokenEquipmentCardIdsRef,
    fieldLinkCardIdsRef,
    setSearchZone,
    resolveEvolveAutoAttachSelection,
    executeEvolveAutoAttach,
    queueEvolveAutoAttachSelection,
    dispatchGameEvent,
}: UseGameBoardFieldActionsArgs) {

    const getSoloCardMoveActor = useCallback((cardId: string): PlayerRole | undefined => {
        if (!isSoloMode) return undefined;
        return gameStateRef.current.cards.find(card => card.id === cardId)?.owner;
    }, [gameStateRef, isSoloMode]);

    const handleExtractCard = useCallback((
        cardId: string,
        customDestination?: string,
        targetRole?: PlayerRole,
        revealToOpponent = false
    ) => {
        const actor = targetRole ?? role;

        if (customDestination?.startsWith(`field-${actor}`)) {
            const sourceCard = gameStateRef.current.cards.find(card => card.id === cardId);
            if (sourceCard?.zone === `evolveDeck-${actor}`) {
                const resolvedSelection = resolveEvolveAutoAttachSelection(cardId);
                if (resolvedSelection?.candidateCards.length === 1) {
                    executeEvolveAutoAttach(
                        cardId,
                        actor,
                        resolvedSelection.candidateCards[0].id,
                        resolvedSelection.placement
                    );
                    setSearchZone(null);
                    return;
                }

                if (resolvedSelection && resolvedSelection.candidateCards.length > 1) {
                    queueEvolveAutoAttachSelection(cardId, actor);
                    setSearchZone(null);
                    return;
                }
            }
        }

        dispatchGameEvent({ type: 'EXTRACT_CARD', actor, cardId, destination: customDestination, revealToOpponent });
        setSearchZone(null);
    }, [dispatchGameEvent, executeEvolveAutoAttach, gameStateRef, queueEvolveAutoAttachSelection, resolveEvolveAutoAttachSelection, role, setSearchZone]);

    const spawnToken = useCallback((
        targetRole: PlayerRole = role,
        tokenOption?: TokenOption,
        destination: 'ex' | 'field' = 'ex'
    ) => {
        const selectedToken = tokenOption ?? defaultTokenOption.current;
        const newCard = buildSpawnTokenInstance(targetRole, selectedToken, destination, uuid);
        dispatchGameEvent({ type: 'SPAWN_TOKEN', actor: targetRole, token: newCard });
    }, [defaultTokenOption, dispatchGameEvent, role, uuid]);

    const spawnTokens = useCallback((
        targetRole: PlayerRole = role,
        tokenSelections: Array<{ tokenOption: TokenOption; count: number }>,
        destination: 'ex' | 'field' = 'ex'
    ) => {
        const tokens = buildSpawnTokens(targetRole, tokenSelections, destination, uuid);

        if (tokens.length === 0) return;
        if (tokens.length === 1) {
            dispatchGameEvent({ type: 'SPAWN_TOKEN', actor: targetRole, token: tokens[0] });
            return;
        }

        dispatchGameEvent({ type: 'SPAWN_TOKENS_BATCH', actor: targetRole, tokens });
    }, [dispatchGameEvent, role, uuid]);

    const handleModifyCounter = useCallback((cardId: string, stat: 'atk' | 'hp', delta: number, actor?: PlayerRole) => {
        dispatchGameEvent({ type: 'MODIFY_COUNTER', actor, cardId, stat, delta });
    }, [dispatchGameEvent]);

    const handleModifyGenericCounter = useCallback((cardId: string, delta: number, actor?: PlayerRole) => {
        dispatchGameEvent({ type: 'MODIFY_GENERIC_COUNTER', actor, cardId, delta });
    }, [dispatchGameEvent]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;
        const cardId = active.id as string;
        const overId = over.id as string;

        const sourceCard = gameStateRef.current.cards.find(card => card.id === cardId);
        const overCard = gameStateRef.current.cards.find(card => card.id === overId);
        const overRootCard = overCard ? findUnitRootCard(gameStateRef.current.cards, overCard) : undefined;
        const overCatalogCard = overRootCard ? cardCatalogByIdRef.current[overRootCard.cardId] : undefined;

        const isEquipmentManualLink =
            Boolean(
                sourceCard &&
                overRootCard &&
                cardId !== overId &&
                isTokenEquipmentCard(sourceCard, tokenEquipmentCardIdsRef.current) &&
                (sourceCard.zone === `field-${sourceCard.owner}` || sourceCard.zone === `ex-${sourceCard.owner}`) &&
                overRootCard.zone === `field-${sourceCard.owner}` &&
                overRootCard.owner === sourceCard.owner &&
                isEquipmentLinkTargetCard(overRootCard, overCatalogCard)
            );

        if (
            sourceCard &&
            overCard &&
            cardId !== overId &&
            (
                (
                    fieldLinkCardIdsRef.current.has(sourceCard.cardId) &&
                    overCard.zone === `field-${sourceCard.owner}` &&
                    overCard.owner === sourceCard.owner
                ) ||
                isEquipmentManualLink
            )
        ) {
            dispatchGameEvent({
                type: 'LINK_CARD_TO_FIELD',
                actor: sourceCard.owner,
                cardId,
                parentCardId: overRootCard?.id ?? overId,
            });
            return;
        }

        if (
            sourceCard &&
            sourceCard.zone === `evolveDeck-${sourceCard.owner}` &&
            overId === `field-${sourceCard.owner}`
        ) {
            const resolvedSelection = resolveEvolveAutoAttachSelection(cardId);
            if (resolvedSelection?.candidateCards.length === 1) {
                executeEvolveAutoAttach(
                    cardId,
                    sourceCard.owner,
                    resolvedSelection.candidateCards[0].id,
                    resolvedSelection.placement
                );
                return;
            }

            if (resolvedSelection && resolvedSelection.candidateCards.length > 1) {
                queueEvolveAutoAttachSelection(cardId, sourceCard.owner);
                return;
            }
        }

        dispatchGameEvent({
            type: 'MOVE_CARD',
            actor: isSoloMode ? sourceCard?.owner : undefined,
            cardId,
            overId,
        });
    }, [cardCatalogByIdRef, dispatchGameEvent, executeEvolveAutoAttach, fieldLinkCardIdsRef, gameStateRef, isSoloMode, queueEvolveAutoAttachSelection, resolveEvolveAutoAttachSelection, tokenEquipmentCardIdsRef]);

    const toggleTap = useCallback((cardId: string) => {
        dispatchGameEvent({ type: 'TOGGLE_TAP', cardId });
    }, [dispatchGameEvent]);

    const handleFlipCard = useCallback((cardId: string, targetRole?: PlayerRole) => {
        dispatchGameEvent({ type: 'TOGGLE_FLIP', actor: targetRole, cardId });
    }, [dispatchGameEvent]);

    const handleSendToBottom = useCallback((cardId: string) => {
        dispatchGameEvent({ type: 'SEND_TO_BOTTOM', actor: getSoloCardMoveActor(cardId), cardId });
    }, [dispatchGameEvent, getSoloCardMoveActor]);

    const handleBanish = useCallback((cardId: string) => {
        dispatchGameEvent({ type: 'BANISH_CARD', actor: getSoloCardMoveActor(cardId), cardId });
    }, [dispatchGameEvent, getSoloCardMoveActor]);

    const handlePlayToField = useCallback((cardId: string, targetRole?: PlayerRole) => {
        dispatchGameEvent({ type: 'PLAY_TO_FIELD', actor: targetRole ?? getSoloCardMoveActor(cardId), cardId });
    }, [dispatchGameEvent, getSoloCardMoveActor]);

    const handleDeclareAttack = useCallback((
        attackerCardId: string,
        target: AttackTarget,
        targetRole?: PlayerRole
    ) => {
        dispatchGameEvent({ type: 'ATTACK_DECLARATION', actor: targetRole, attackerCardId, target });
    }, [dispatchGameEvent]);

    const handleSetRevealHandsMode = useCallback((enabled: boolean) => {
        dispatchGameEvent({ type: 'SET_REVEAL_HANDS_MODE', enabled });
    }, [dispatchGameEvent]);

    const handleSetEndStop = useCallback((enabled: boolean) => {
        dispatchGameEvent({ type: 'SET_END_STOP', enabled });
    }, [dispatchGameEvent]);

    const handleSendToCemetery = useCallback((cardId: string) => {
        dispatchGameEvent({ type: 'SEND_TO_CEMETERY', actor: getSoloCardMoveActor(cardId), cardId });
    }, [dispatchGameEvent, getSoloCardMoveActor]);

    const handleReturnEvolve = useCallback((cardId: string) => {
        dispatchGameEvent({ type: 'RETURN_EVOLVE', actor: getSoloCardMoveActor(cardId), cardId });
    }, [dispatchGameEvent, getSoloCardMoveActor]);

    const handleShuffleDeck = useCallback((targetRole?: PlayerRole) => {
        dispatchGameEvent({ type: 'SHUFFLE_DECK', actor: targetRole });
    }, [dispatchGameEvent]);

    return {
        handleExtractCard,
        spawnToken,
        spawnTokens,
        handleModifyCounter,
        handleModifyGenericCounter,
        handleDragEnd,
        toggleTap,
        handleFlipCard,
        handleSendToBottom,
        handleBanish,
        handlePlayToField,
        handleDeclareAttack,
        handleSetRevealHandsMode,
        handleSetEndStop,
        handleSendToCemetery,
        handleReturnEvolve,
        handleShuffleDeck,
    };
}
