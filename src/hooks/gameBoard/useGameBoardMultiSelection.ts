import { useEffect, useState } from 'react';
import type { CardInstance } from '../../components/Card';
import type { PlayerRole, SyncState } from '../../types/game';
import type { DispatchableGameSyncEvent } from './useGameBoardLogic';
import { canApplyBoardBatch, getBoardUnits, resolveBoardUnit, type BoardBatchAction, type BoardUnitTarget } from '../../utils/gameBoard/gameBoardMultiSelection';

type Args = {
  gameState: SyncState;
  role: PlayerRole;
  isSoloMode: boolean;
  available: boolean;
  blocked: boolean;
  dispatch: (event: DispatchableGameSyncEvent) => void;
};

export function useGameBoardMultiSelection({ gameState, role, isSoloMode, available, blocked, dispatch }: Args) {
  const boundary = JSON.stringify([gameState.turnPlayer, gameState.turnCount, gameState.gameStatus, available, blocked, role, isSoloMode]);
  const [selection, setSelection] = useState<{ boundary: string; enabled: boolean; targets: BoardUnitTarget[] }>({ boundary, enabled: false, targets: [] });
  const canStart = available && !blocked && gameState.gameStatus === 'playing';
  const active = selection.enabled && selection.boundary === boundary && canStart;
  const units = selection.targets.flatMap(target => {
    const unit = resolveBoardUnit(gameState.cards, target.rootId, 'host') ?? resolveBoardUnit(gameState.cards, target.rootId, 'guest');
    return unit && unit.signature === target.signature && (isSoloMode || unit.side === role) ? [unit] : [];
  });
  // Adjust only this hook's state during render: stale selections disappear in
  // the same render, and cannot return when a dialog closes or undo restores cards.
  if (selection.boundary !== boundary) {
    setSelection({ boundary, enabled: false, targets: [] });
  } else if (units.length !== selection.targets.length) {
    setSelection({ ...selection, targets: units.map(({ rootId, signature }) => ({ rootId, signature })) });
  }
  const targets = active ? units : [];
  const side = targets[0]?.side;
  const finish = () => setSelection({ boundary, enabled: false, targets: [] });
  const setSelected = (update: BoardUnitTarget[] | ((previous: BoardUnitTarget[]) => BoardUnitTarget[])) => {
    setSelection(previous => ({ boundary, enabled: true, targets: typeof update === 'function' ? update(previous.targets) : update }));
  };
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelection({ boundary, enabled: false, targets: [] });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, boundary]);

  const select = (card: CardInstance, shortcut: boolean): boolean => {
    if (!canStart || (!active && !shortcut)) return false;
    const unit = resolveBoardUnit(gameState.cards, card.id, 'host') ?? resolveBoardUnit(gameState.cards, card.id, 'guest');
    if (!unit || (!isSoloMode && unit.side !== role) || (side && side !== unit.side)) return active;
    setSelected(previous => previous.some(target => target.rootId === unit.rootId)
      ? previous.filter(target => target.rootId !== unit.rootId)
      : [...previous, { rootId: unit.rootId, signature: unit.signature }]);
    return true;
  };
  const selectAll = (zone: string) => {
    if (!active) return;
    const zoneSide = zone.split('-')[1];
    if ((zoneSide !== 'host' && zoneSide !== 'guest') || (!isSoloMode && zoneSide !== role) || (side && side !== zoneSide)) return;
    const additions = getBoardUnits(gameState.cards, zoneSide).filter(unit => gameState.cards.find(card => card.id === unit.rootId)?.zone === zone);
    setSelected([...new Map([...targets, ...additions].map(target => [target.rootId, { rootId: target.rootId, signature: target.signature }])).values()]);
  };
  const canRun = (action: BoardBatchAction) => active && canApplyBoardBatch(gameState.cards, targets, action);
  const run = (action: BoardBatchAction) => {
    if (!canRun(action) || !side) return;
    dispatch({ type: 'BOARD_BATCH', actor: side, targets: targets.map(({ rootId, signature }) => ({ rootId, signature })), action,
      turnCount: gameState.turnCount, turnPlayer: gameState.turnPlayer });
    if (action === 'cemetery' || action === 'banish') finish();
  };
  const tone = (cardId: string): 'selected' | 'related' | undefined => {
    const unit = targets.find(unit => unit.memberIds.includes(cardId));
    return unit ? unit.rootId === cardId ? 'selected' : 'related' : undefined;
  };
  return { active, canStart, targets, side, select, selectAll, canRun, run, tone,
    start: () => { if (canStart) setSelected([]); },
    clear: () => setSelected([]), finish };
}
