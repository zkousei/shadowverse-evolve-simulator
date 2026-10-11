import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGameBoardMultiSelection } from './useGameBoardMultiSelection';
import { initialState } from '../../types/game';
import type { CardInstance } from '../../components/Card';
const card = (id: string, overrides: Partial<CardInstance> = {}): CardInstance => ({ id, cardId: id, name: id, image: '', zone: 'field-host', owner: 'host', baseCardType: 'follower', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 }, ...overrides });
const args = () => ({ gameState: { ...initialState, gameStatus: 'playing' as const, cards: [card('a'), card('b'), card('c', { zone: 'field-guest', owner: 'guest' })] }, role: 'host' as const, isSoloMode: true, available: true, blocked: false, dispatch: vi.fn() });

describe('useGameBoardMultiSelection', () => {
  it('keeps one side selected, supports zone selection and sends one event for all targets', () => {
    const props = args();
    const { result } = renderHook(() => useGameBoardMultiSelection(props));
    act(() => result.current.select(props.gameState.cards[0], true));
    act(() => result.current.selectAll('field-host'));
    act(() => result.current.select(props.gameState.cards[2], false));
    expect(result.current.targets).toHaveLength(2);
    act(() => result.current.run('hp-'));
    expect(props.dispatch).toHaveBeenCalledOnce();
    expect(props.dispatch.mock.calls[0][0]).toMatchObject({ type: 'BOARD_BATCH', actor: 'host', action: 'hp-', targets: expect.any(Array) });
    expect(result.current.targets).toHaveLength(2);
    act(() => result.current.run('cemetery'));
    expect(result.current.active).toBe(false);
  });
  it('invalidates changed units but preserves selection after numerical updates', () => {
    const props = args();
    const { result, rerender } = renderHook(p => useGameBoardMultiSelection(p), { initialProps: props });
    act(() => result.current.select(props.gameState.cards[0], true));
    rerender({ ...props, gameState: { ...props.gameState, cards: props.gameState.cards.map(c => ({ ...c, counters: { atk: 1, hp: 0 } })) } });
    expect(result.current.targets).toHaveLength(1);
    rerender({ ...props, gameState: { ...props.gameState, cards: props.gameState.cards.map(c => c.id === 'a' ? { ...c, zone: 'ex-host' } : c) } });
    expect(result.current.targets).toHaveLength(0);
  });
  it('clears on turn boundaries, dialogs, lost permission and Escape', () => {
    const props = args();
    const { result, rerender } = renderHook(p => useGameBoardMultiSelection(p), { initialProps: props });
    act(() => result.current.select(props.gameState.cards[0], true));
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(result.current.active).toBe(false);
    act(() => result.current.select(props.gameState.cards[0], true));
    rerender({ ...props, blocked: true });
    expect(result.current.active).toBe(false);
    rerender(props);
    act(() => result.current.select(props.gameState.cards[0], true));
    rerender({ ...props, gameState: { ...props.gameState, turnPlayer: 'guest' } });
    expect(result.current.targets).toHaveLength(0);
    rerender(props);
    act(() => result.current.select(props.gameState.cards[0], true));
    rerender({ ...props, available: false });
    expect(result.current.active).toBe(false);
  });
  it('rejects opponent selection in network play and distinguishes roots from related cards', () => {
    const props = args();
    props.isSoloMode = false;
    props.gameState.cards.push(card('e', { attachedTo: 'a', isEvolveCard: true }));
    const { result } = renderHook(() => useGameBoardMultiSelection(props));
    act(() => result.current.select(props.gameState.cards[2], true));
    expect(result.current.targets).toHaveLength(0);
    act(() => result.current.select(props.gameState.cards[3], true));
    expect(result.current.tone('a')).toBe('selected');
    expect(result.current.tone('e')).toBe('related');
  });
});
