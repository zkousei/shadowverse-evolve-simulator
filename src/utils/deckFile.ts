import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckState } from '../models/deckState';
import type { DeckFormat, DeckRuleConfig } from '../models/deckRule';

export type ExportableDeckCard = Omit<DeckBuilderCardData, 'related_cards'>;

export type ExportableDeckPayload = {
  deckName: string;
  rule: DeckFormat;
  identityType: DeckRuleConfig['identityType'];
  selectedClass: DeckRuleConfig['selectedClass'];
  selectedTitle: DeckRuleConfig['selectedTitle'];
  selectedClasses: DeckRuleConfig['selectedClasses'];
  mainDeck: ExportableDeckCard[];
  evolveDeck: ExportableDeckCard[];
  leaderCards: ExportableDeckCard[];
  tokenDeck: ExportableDeckCard[];
};

const toExportableDeckCard = (card: DeckBuilderCardData): ExportableDeckCard => {
  const { related_cards: omittedRelatedCards, ...exportableCard } = card;
  void omittedRelatedCards;
  return exportableCard;
};

export const buildExportableDeckPayload = (
  name: string,
  ruleConfig: DeckRuleConfig,
  deckState: DeckState
): ExportableDeckPayload => ({
  deckName: name,
  rule: ruleConfig.format,
  identityType: ruleConfig.identityType,
  selectedClass: ruleConfig.selectedClass,
  selectedTitle: ruleConfig.selectedTitle,
  selectedClasses: ruleConfig.selectedClasses,
  mainDeck: deckState.mainDeck.map(toExportableDeckCard),
  evolveDeck: deckState.evolveDeck.map(toExportableDeckCard),
  leaderCards: deckState.leaderCards.map(toExportableDeckCard),
  tokenDeck: deckState.tokenDeck.map(toExportableDeckCard),
});

export const sanitizeDeckExportFileName = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'shadowverse_deck';

  return trimmed.replace(/[^\w\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF-]/g, '_');
};

export const resolveImportedDeckName = (
  data: { deckName?: unknown },
  fileName: string
): string | null => {
  if (typeof data.deckName === 'string' && data.deckName.length > 0) {
    return data.deckName;
  }

  const nameMatch = fileName.match(/(.+)\.json$/i);
  return nameMatch ? nameMatch[1] : null;
};

export const downloadDeckJson = (
  name: string,
  payload: ExportableDeckPayload
): void => {
  const data = JSON.stringify(payload, null, 2);
  const safeName = sanitizeDeckExportFileName(name);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeName}.json`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 200);
};
