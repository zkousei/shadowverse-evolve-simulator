import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameBoardFieldActions } from './useGameBoardFieldActions';
import { buildSyncState } from './__tests__/gameBoardTestUtils';
import type { CardInstance } from '../components/Card';
import type { TokenOption } from '../types/game';
import type { DragEndEvent } from '@dnd-kit/core';

import * as gameBoardManualLink from '../utils/gameBoardManualLink';

vi.mock('../utils/gameBoardManualLink', () => ({
  findUnitRootCard: vi.fn((_cards: CardInstance[], card: CardInstance) => card),
  isTokenEquipmentCard: vi.fn(() => false),
  isEquipmentLinkTargetCard: vi.fn(() => false),
}));

const makeCard = (overrides: Partial<CardInstance> & { id: string; zone: string; owner: string }): CardInstance => ({
  cardId: 'CARD-001',
  name: 'Test Card',
  image: '/test.png',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 0, hp: 0 },
  genericCounter: 0,
  ...overrides,
} as CardInstance);

const makeTokenOption = (overrides: Partial<TokenOption> = {}): TokenOption => ({
  cardId: 'T01',
  name: 'Token',
  image: '/token.png',
  baseCardType: null,
  ...overrides,
});

const makeDragEvent = (activeId: string, overId: string): DragEndEvent => ({
  active: { id: activeId },
  over: { id: overId },
} as unknown as DragEndEvent);

describe('useGameBoardFieldActions (Pure Hook)', () => {
  const defaultArgs = {
    gameStateRef: { current: buildSyncState() },
    isSoloMode: false,
    role: 'host' as const,
    uuid: () => 'mock-uuid',
    defaultTokenOption: { current: makeTokenOption() },
    cardCatalogByIdRef: { current: {} as Record<string, unknown> },
    tokenEquipmentCardIdsRef: { current: new Set<string>() },
    fieldLinkCardIdsRef: { current: new Set<string>() },
    setSearchZone: vi.fn(),
    resolveEvolveAutoAttachSelection: vi.fn(),
    executeEvolveAutoAttach: vi.fn(),
    queueEvolveAutoAttachSelection: vi.fn(),
    dispatchGameEvent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gameBoardManualLink.findUnitRootCard).mockImplementation((_cards, card) => card);
    vi.mocked(gameBoardManualLink.isTokenEquipmentCard).mockReturnValue(false);
    vi.mocked(gameBoardManualLink.isEquipmentLinkTargetCard).mockReturnValue(false);
  });

  // ─── 1. handleSendToCemetery ─────────────────────────────────────
  it('dispatches SEND_TO_CEMETERY', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handleSendToCemetery('card-1');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'SEND_TO_CEMETERY',
      actor: undefined,
      cardId: 'card-1',
    });
  });

  it('uses card owner as actor in solo mode for handleSendToCemetery', () => {
    const gameState = buildSyncState({
      cards: [makeCard({ id: 'card-1', zone: 'field-host', owner: 'guest' })],
    });
    const { result } = renderHook(() => useGameBoardFieldActions({
      ...defaultArgs,
      isSoloMode: true,
      gameStateRef: { current: gameState },
    }));
    result.current.handleSendToCemetery('card-1');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'SEND_TO_CEMETERY',
      actor: 'guest',
      cardId: 'card-1',
    });
  });

  // ─── 2. handleModifyCounter & handleModifyGenericCounter ─────────
  it('dispatches MODIFY_COUNTER', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handleModifyCounter('card-1', 'atk', 2, 'host');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'MODIFY_COUNTER',
      actor: 'host',
      cardId: 'card-1',
      stat: 'atk',
      delta: 2,
    });
  });

  it('dispatches MODIFY_GENERIC_COUNTER', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handleModifyGenericCounter('card-1', 1, 'host');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'MODIFY_GENERIC_COUNTER',
      actor: 'host',
      cardId: 'card-1',
      delta: 1,
    });
  });

  // ─── 3. toggleTap ────────────────────────────────────────────────
  it('dispatches TOGGLE_TAP', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.toggleTap('card-1');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'TOGGLE_TAP',
      cardId: 'card-1',
    });
  });

  // ─── 4. spawnToken ───────────────────────────────────────────────
  it('dispatches SPAWN_TOKEN with generated token', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.spawnToken('host');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'SPAWN_TOKEN',
      actor: 'host',
      token: expect.objectContaining({ cardId: 'T01', zone: 'ex-host' }),
    });
  });

  // ─── 5. spawnTokens ──────────────────────────────────────────────
  it('dispatches SPAWN_TOKENS_BATCH for multiple tokens', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.spawnTokens('host', [
      { tokenOption: makeTokenOption(), count: 2 },
    ]);

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'SPAWN_TOKENS_BATCH',
      actor: 'host',
      tokens: expect.arrayContaining([
        expect.objectContaining({ cardId: 'T01' }),
        expect.objectContaining({ cardId: 'T01' }),
      ]),
    });
  });

  it('treats a single token batch as a single SPAWN_TOKEN action', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.spawnTokens('host', [
      { tokenOption: makeTokenOption(), count: 1 },
    ]);

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'SPAWN_TOKEN',
      actor: 'host',
      token: expect.objectContaining({ cardId: 'T01' }),
    });
  });

  it('does nothing when spawnTokens is called with only zero counts', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.spawnTokens('host', [
      { tokenOption: makeTokenOption(), count: 0 },
    ]);

    expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
  });

  // ─── 6. handleReturnEvolve ───────────────────────────────────────
  it('dispatches RETURN_EVOLVE', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handleReturnEvolve('card-1');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'RETURN_EVOLVE',
      actor: undefined,
      cardId: 'card-1',
    });
  });

  // ─── 7. handleFlipCard ───────────────────────────────────────────
  it('dispatches TOGGLE_FLIP', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handleFlipCard('card-1', 'host');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'TOGGLE_FLIP',
      actor: 'host',
      cardId: 'card-1',
    });
  });

  // ─── 8. handleSendToBottom ────────────────────────────────────────
  it('dispatches SEND_TO_BOTTOM', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handleSendToBottom('card-1');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'SEND_TO_BOTTOM',
      actor: undefined,
      cardId: 'card-1',
    });
  });

  // ─── 9. handleBanish ─────────────────────────────────────────────
  it('dispatches BANISH_CARD', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handleBanish('card-1');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'BANISH_CARD',
      actor: undefined,
      cardId: 'card-1',
    });
  });

  // ─── 10. handlePlayToField ───────────────────────────────────────
  it('dispatches PLAY_TO_FIELD', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handlePlayToField('card-1', 'host');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'PLAY_TO_FIELD',
      actor: 'host',
      cardId: 'card-1',
    });
  });

  // ─── 11. handleDeclareAttack ─────────────────────────────────────
  it('dispatches ATTACK_DECLARATION', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handleDeclareAttack('card-1', { type: 'leader', player: 'guest' }, 'host');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'ATTACK_DECLARATION',
      actor: 'host',
      attackerCardId: 'card-1',
      target: { type: 'leader', player: 'guest' },
    });
  });

  // ─── 12. handleSetRevealHandsMode ────────────────────────────────
  it('dispatches SET_REVEAL_HANDS_MODE', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handleSetRevealHandsMode(true);

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'SET_REVEAL_HANDS_MODE',
      enabled: true,
    });
  });

  // ─── 13. handleSetEndStop ────────────────────────────────────────
  it('dispatches SET_END_STOP', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handleSetEndStop(true);

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'SET_END_STOP',
      enabled: true,
    });
  });

  // ─── 14. handleShuffleDeck ───────────────────────────────────────
  it('dispatches SHUFFLE_DECK', () => {
    const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
    result.current.handleShuffleDeck('host');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'SHUFFLE_DECK',
      actor: 'host',
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // handleExtractCard – auto-attach branching
  // ═══════════════════════════════════════════════════════════════════
  describe('handleExtractCard', () => {
    it('dispatches EXTRACT_CARD and clears search zone for normal extraction', () => {
      const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
      result.current.handleExtractCard('card-1', 'hand-host', 'host', true);

      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
        type: 'EXTRACT_CARD',
        actor: 'host',
        cardId: 'card-1',
        destination: 'hand-host',
        revealToOpponent: true,
      });
      expect(defaultArgs.setSearchZone).toHaveBeenCalledWith(null);
    });

    it('dispatches EXTRACT_CARD when dest is field but source is NOT evolveDeck', () => {
      const gameState = buildSyncState({
        cards: [makeCard({ id: 'card-1', zone: 'hand-host', owner: 'host' })],
      });
      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleExtractCard('card-1', 'field-host', 'host');

      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXTRACT_CARD', cardId: 'card-1' }),
      );
    });

    it('auto-attaches via executeEvolveAutoAttach when single candidate exists', () => {
      const gameState = buildSyncState({
        cards: [makeCard({ id: 'evo-1', zone: 'evolveDeck-host', owner: 'host' })],
      });
      const mockResult = {
        placement: 'stack' as const,
        candidateCards: [makeCard({ id: 'unit-1', zone: 'field-host', owner: 'host' })],
      };
      defaultArgs.resolveEvolveAutoAttachSelection.mockReturnValue(mockResult);

      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleExtractCard('evo-1', 'field-host', 'host');

      expect(defaultArgs.executeEvolveAutoAttach).toHaveBeenCalledWith(
        'evo-1', 'host', 'unit-1', 'stack',
      );
      expect(defaultArgs.setSearchZone).toHaveBeenCalledWith(null);
      expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
    });

    it('queues selection when multiple candidates exist', () => {
      const gameState = buildSyncState({
        cards: [makeCard({ id: 'evo-1', zone: 'evolveDeck-host', owner: 'host' })],
      });
      const mockResult = {
        placement: 'stack' as const,
        candidateCards: [
          makeCard({ id: 'unit-1', zone: 'field-host', owner: 'host' }),
          makeCard({ id: 'unit-2', zone: 'field-host', owner: 'host' }),
        ],
      };
      defaultArgs.resolveEvolveAutoAttachSelection.mockReturnValue(mockResult);

      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleExtractCard('evo-1', 'field-host', 'host');

      expect(defaultArgs.queueEvolveAutoAttachSelection).toHaveBeenCalledWith('evo-1', 'host');
      expect(defaultArgs.setSearchZone).toHaveBeenCalledWith(null);
      expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
    });

    it('falls through to EXTRACT_CARD when no auto-attach target on field', () => {
      const gameState = buildSyncState({
        cards: [makeCard({ id: 'evo-1', zone: 'evolveDeck-host', owner: 'host' })],
      });
      defaultArgs.resolveEvolveAutoAttachSelection.mockReturnValue(null);

      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleExtractCard('evo-1', 'field-host', 'host');

      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXTRACT_CARD', cardId: 'evo-1' }),
      );
    });

    it('falls through to EXTRACT_CARD when resolveEvolveAutoAttachSelection returns 0 candidates', () => {
      const gameState = buildSyncState({
        cards: [makeCard({ id: 'evo-1', zone: 'evolveDeck-host', owner: 'host' })],
      });
      defaultArgs.resolveEvolveAutoAttachSelection.mockReturnValue({
        placement: 'stack' as const,
        candidateCards: [],
      });

      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleExtractCard('evo-1', 'field-host', 'host');

      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXTRACT_CARD', cardId: 'evo-1' }),
      );
    });

    it('does NOT auto-attach when destination does not start with field-', () => {
      const gameState = buildSyncState({
        cards: [makeCard({ id: 'evo-1', zone: 'evolveDeck-host', owner: 'host' })],
      });
      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleExtractCard('evo-1', 'ex-host', 'host');

      expect(defaultArgs.resolveEvolveAutoAttachSelection).not.toHaveBeenCalled();
      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXTRACT_CARD', destination: 'ex-host' }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // handleDragEnd – all branching paths
  // ═══════════════════════════════════════════════════════════════════
  describe('handleDragEnd', () => {
    it('dispatches MOVE_CARD for simple moves', () => {
      const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
      result.current.handleDragEnd(makeDragEvent('card-1', 'field-host'));

      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
        type: 'MOVE_CARD',
        actor: undefined,
        cardId: 'card-1',
        overId: 'field-host',
      });
    });

    it('uses card owner as actor in solo mode', () => {
      const gameState = buildSyncState({
        cards: [makeCard({ id: 'card-1', zone: 'field-host', owner: 'guest' })],
      });
      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        isSoloMode: true,
        gameStateRef: { current: gameState },
      }));
      result.current.handleDragEnd(makeDragEvent('card-1', 'ex-host'));

      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
        type: 'MOVE_CARD',
        actor: 'guest',
        cardId: 'card-1',
        overId: 'ex-host',
      });
    });

    it('dispatches LINK_CARD_TO_FIELD for configured field-link cards', () => {
      const fieldLinkCardIds = new Set(['SPECIAL-001']);
      const gameState = buildSyncState({
        cards: [
          makeCard({ id: 'card-1', cardId: 'SPECIAL-001', zone: 'field-host', owner: 'host' }),
          makeCard({ id: 'target-1', zone: 'field-host', owner: 'host' }),
        ],
      });
      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
        fieldLinkCardIdsRef: { current: fieldLinkCardIds },
      }));
      result.current.handleDragEnd(makeDragEvent('card-1', 'target-1'));

      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
        type: 'LINK_CARD_TO_FIELD',
        actor: 'host',
        cardId: 'card-1',
        parentCardId: 'target-1',
      });
    });

    it('dispatches LINK_CARD_TO_FIELD for token equipment moved to a unit', () => {
      const gameState = buildSyncState({
        cards: [
          makeCard({ id: 'equip-1', cardId: 'EQUIP-001', zone: 'ex-host', owner: 'host' }),
          makeCard({ id: 'unit-1', zone: 'field-host', owner: 'host' }),
        ],
      });
      vi.mocked(gameBoardManualLink.isTokenEquipmentCard).mockReturnValue(true);
      vi.mocked(gameBoardManualLink.isEquipmentLinkTargetCard).mockReturnValue(true);

      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleDragEnd(makeDragEvent('equip-1', 'unit-1'));

      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
        type: 'LINK_CARD_TO_FIELD',
        actor: 'host',
        cardId: 'equip-1',
        parentCardId: 'unit-1',
      });
    });

    it('resolves to root card when linking equipment to an evolved unit', () => {
      const rootCard = makeCard({ id: 'root-unit', zone: 'field-host', owner: 'host' });
      const evolvedCard = makeCard({
        id: 'evolved-unit', zone: 'field-host', owner: 'host',
        attachedTo: 'root-unit', isEvolveCard: true,
      } as Partial<CardInstance> & { id: string; zone: string; owner: string });
      const equipCard = makeCard({ id: 'equip-1', cardId: 'EQUIP-001', zone: 'ex-host', owner: 'host' });

      const gameState = buildSyncState({ cards: [equipCard, rootCard, evolvedCard] });

      vi.mocked(gameBoardManualLink.isTokenEquipmentCard).mockReturnValue(true);
      vi.mocked(gameBoardManualLink.isEquipmentLinkTargetCard).mockReturnValue(true);
      vi.mocked(gameBoardManualLink.findUnitRootCard).mockReturnValue(rootCard);

      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleDragEnd(makeDragEvent('equip-1', 'evolved-unit'));

      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
        type: 'LINK_CARD_TO_FIELD',
        actor: 'host',
        cardId: 'equip-1',
        parentCardId: 'root-unit',
      });
    });

    it('does NOT link equipment when isEquipmentLinkTargetCard returns false', () => {
      const gameState = buildSyncState({
        cards: [
          makeCard({ id: 'equip-1', cardId: 'EQUIP-001', zone: 'ex-host', owner: 'host' }),
          makeCard({ id: 'amulet-1', zone: 'field-host', owner: 'host' }),
        ],
      });
      vi.mocked(gameBoardManualLink.isTokenEquipmentCard).mockReturnValue(true);
      vi.mocked(gameBoardManualLink.isEquipmentLinkTargetCard).mockReturnValue(false);

      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleDragEnd(makeDragEvent('equip-1', 'amulet-1'));

      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'MOVE_CARD' }),
      );
    });

    it('auto-attaches evolve card from evolveDeck when single candidate exists', () => {
      const gameState = buildSyncState({
        cards: [makeCard({ id: 'evo-1', zone: 'evolveDeck-host', owner: 'host' })],
      });
      const mockResult = {
        placement: 'stack' as const,
        candidateCards: [makeCard({ id: 'unit-1', zone: 'field-host', owner: 'host' })],
      };
      defaultArgs.resolveEvolveAutoAttachSelection.mockReturnValue(mockResult);

      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleDragEnd(makeDragEvent('evo-1', 'field-host'));

      expect(defaultArgs.executeEvolveAutoAttach).toHaveBeenCalledWith(
        'evo-1', 'host', 'unit-1', 'stack',
      );
      expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
    });

    it('queues selection for evolve drag when multiple candidates exist', () => {
      const gameState = buildSyncState({
        cards: [makeCard({ id: 'evo-1', zone: 'evolveDeck-host', owner: 'host' })],
      });
      const mockResult = {
        placement: 'stack' as const,
        candidateCards: [
          makeCard({ id: 'unit-1', zone: 'field-host', owner: 'host' }),
          makeCard({ id: 'unit-2', zone: 'field-host', owner: 'host' }),
        ],
      };
      defaultArgs.resolveEvolveAutoAttachSelection.mockReturnValue(mockResult);

      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleDragEnd(makeDragEvent('evo-1', 'field-host'));

      expect(defaultArgs.queueEvolveAutoAttachSelection).toHaveBeenCalledWith('evo-1', 'host');
      expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
    });

    it('falls through to MOVE_CARD when evolveDeck card has no auto-attach targets', () => {
      const gameState = buildSyncState({
        cards: [makeCard({ id: 'evo-1', zone: 'evolveDeck-host', owner: 'host' })],
      });
      defaultArgs.resolveEvolveAutoAttachSelection.mockReturnValue(null);

      const { result } = renderHook(() => useGameBoardFieldActions({
        ...defaultArgs,
        gameStateRef: { current: gameState },
      }));
      result.current.handleDragEnd(makeDragEvent('evo-1', 'field-host'));

      expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'MOVE_CARD', cardId: 'evo-1' }),
      );
    });

    it('does not dispatch when over is null', () => {
      const { result } = renderHook(() => useGameBoardFieldActions(defaultArgs));
      result.current.handleDragEnd({ active: { id: 'card-1' }, over: null } as unknown as DragEndEvent);

      expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
    });
  });
});
