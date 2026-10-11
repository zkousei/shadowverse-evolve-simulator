import { createContext, useContext } from 'react';
import type { CardInstance } from '../components/Card';
export type BoardSelectionContextValue = {
  active: boolean;
  select: (card: CardInstance, shortcut: boolean) => boolean;
  tone: (cardId: string) => 'selected' | 'related' | undefined;
  selectAll: (zone: string) => void;
  canSelectZone: (zone: string) => boolean;
};
export const GameBoardMultiSelectionContext = createContext<BoardSelectionContextValue | null>(null);
export const useBoardMultiSelectionContext = () => useContext(GameBoardMultiSelectionContext);
