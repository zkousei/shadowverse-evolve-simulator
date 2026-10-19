/**
 * Pure logic for card state transitions.
 * This file serves as a unified facade for card logic modules.
 */

export type {
  MoveCardOptions,
  DropResolution,
} from './logic/cardMovement';

export type {
  TopDeckResult,
} from './logic/cardDeckOps';

export {
  getDeckZone,
  resolveMoveDestination,
  moveCardToEnd,
  moveCardToFront,
  resolveDrop,
  applyDrop,
  sendCardToBottom,
  banishCard,
  sendCardToCemetery,
  returnEvolveCard,
  playCardToField,
  extractCard,
  extractCardToFieldAttachment,
  linkCardToField,
} from './logic/cardMovement';

export {
  drawCard,
  shuffleDeck,
  millCard,
  moveTopCardToEx,
  moveTopCardToBanish,
  discardRandomHandCards,
  drawInitialHand,
  executeMulligan,
  resolveTopDeckResults,
} from './logic/cardDeckOps';

export {
  modifyCardCounter,
  modifyGenericCounter,
  toggleTapStack,
  tapStack,
  toggleFlip,
  modifyPlayerStatValue,
} from './logic/cardCounters';

export {
  importDeckCards,
  spawnTokenCard,
  spawnTokenCards,
} from './logic/cardTokens';

export {
  applyStateWithGuards,
  normalizeCardsForGameState,
} from './logic/cardGuards';
