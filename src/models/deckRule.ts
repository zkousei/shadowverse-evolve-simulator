import type { CardClass } from './class';

export const DECK_FORMAT_VALUES = ['constructed', 'crossover', 'other'] as const;
export type DeckFormat = typeof DECK_FORMAT_VALUES[number];

export const DECK_IDENTITY_TYPE_VALUES = ['class', 'title'] as const;
export type DeckIdentityType = typeof DECK_IDENTITY_TYPE_VALUES[number];

export type DeckRuleConfig = {
  format: DeckFormat;
  identityType: DeckIdentityType;
  selectedClass: CardClass | null;
  selectedTitle: string | null;
};

export const createDefaultDeckRuleConfig = (): DeckRuleConfig => ({
  format: 'constructed',
  identityType: 'class',
  selectedClass: null,
  selectedTitle: null,
});

export const getImportedDeckRuleConfig = (data: Record<string, unknown>): DeckRuleConfig => {
  const format = data.rule;
  const identityType = data.identityType;

  if (format !== 'constructed' && format !== 'crossover' && format !== 'other') {
    return {
      format: 'other',
      identityType: 'class',
      selectedClass: null,
      selectedTitle: null,
    };
  }

  return {
    format,
    identityType: identityType === 'title' ? 'title' : 'class',
    selectedClass: typeof data.selectedClass === 'string' ? data.selectedClass as CardClass : null,
    selectedTitle: typeof data.selectedTitle === 'string' ? data.selectedTitle : null,
  };
};
