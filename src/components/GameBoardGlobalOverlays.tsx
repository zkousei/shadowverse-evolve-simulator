import React from 'react';
import type { PublicCardView } from '../types/sync';
import type { CardDetailLookup } from '../utils/cardDetails';
import GameBoardAttackLineOverlay from './GameBoardAttackLineOverlay';
import GameBoardCoinMessageOverlay from './GameBoardCoinMessageOverlay';
import GameBoardDiceOverlay from './GameBoardDiceOverlay';
import GameBoardRevealedCardsOverlay from './GameBoardRevealedCardsOverlay';
import GameBoardTransientMessage from './GameBoardTransientMessage';

type AttackLine = {
  sourcePoint: { x: number; y: number };
  targetPoint: { x: number; y: number };
};

type RevealedCardsOverlay = {
  title: string;
  cards: PublicCardView[];
  summaryLines?: string[];
};

type GameBoardGlobalOverlaysProps = {
  coinMessage: string | null;
  turnMessage: string | null;
  cardPlayMessage: string | null;
  attackMessage: string | null;
  attackLine: AttackLine | null;
  revealedCardsOverlay: RevealedCardsOverlay | null;
  cardDetailLookup: CardDetailLookup;
  isRollingDice: boolean;
  diceValue: number | null;
};

const GameBoardGlobalOverlays: React.FC<GameBoardGlobalOverlaysProps> = ({
  coinMessage,
  turnMessage,
  cardPlayMessage,
  attackMessage,
  attackLine,
  revealedCardsOverlay,
  cardDetailLookup,
  isRollingDice,
  diceValue,
}) => (
  <>
    {coinMessage && <GameBoardCoinMessageOverlay message={coinMessage} />}
    {turnMessage && <GameBoardTransientMessage message={turnMessage} tone="turn" />}
    {cardPlayMessage && <GameBoardTransientMessage message={cardPlayMessage} tone="card-play" />}
    {attackMessage && <GameBoardTransientMessage message={attackMessage} tone="attack" />}
    {attackLine && (
      <GameBoardAttackLineOverlay
        sourcePoint={attackLine.sourcePoint}
        targetPoint={attackLine.targetPoint}
      />
    )}
    {revealedCardsOverlay && (
      <GameBoardRevealedCardsOverlay
        overlay={revealedCardsOverlay}
        cardDetailLookup={cardDetailLookup}
      />
    )}
    {isRollingDice && <GameBoardDiceOverlay value={diceValue ?? 1} />}
  </>
);

export default GameBoardGlobalOverlays;
