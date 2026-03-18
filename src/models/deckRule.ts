import { CONSTRUCTED_CLASS_VALUES, type CardClass } from './class';

export const DECK_FORMAT_VALUES = ['constructed', 'crossover', 'other'] as const;
export type DeckFormat = typeof DECK_FORMAT_VALUES[number];

export const DECK_IDENTITY_TYPE_VALUES = ['class', 'title'] as const;
export type DeckIdentityType = typeof DECK_IDENTITY_TYPE_VALUES[number];

export type DeckRuleConfig = {
  format: DeckFormat;
  identityType: DeckIdentityType;
  selectedClass: CardClass | null;
  selectedTitle: string | null;
  selectedClasses: [CardClass | null, CardClass | null];
};

export const createDefaultDeckRuleConfig = (): DeckRuleConfig => ({
  format: 'constructed',
  identityType: 'class',
  selectedClass: null,
  selectedTitle: null,
  selectedClasses: [null, null],
});

const parseConstructedClass = (value: unknown): CardClass | null => (
  typeof value === 'string' && CONSTRUCTED_CLASS_VALUES.includes(value as CardClass)
    ? value as CardClass
    : null
);

const parseSelectedClasses = (value: unknown): [CardClass | null, CardClass | null] => {
  if (!Array.isArray(value)) return [null, null];

  return [
    parseConstructedClass(value[0]),
    parseConstructedClass(value[1]),
  ];
};

export const getImportedDeckRuleConfig = (data: Record<string, unknown>): DeckRuleConfig => {
  const format = data.rule;
  const identityType = data.identityType;

  if (format !== 'constructed' && format !== 'crossover' && format !== 'other') {
    return {
      format: 'other',
      identityType: 'class',
      selectedClass: null,
      selectedTitle: null,
      selectedClasses: [null, null],
    };
  }

  return {
    format,
    identityType: identityType === 'title' ? 'title' : 'class',
    selectedClass: parseConstructedClass(data.selectedClass),
    selectedTitle: typeof data.selectedTitle === 'string' ? data.selectedTitle : null,
    selectedClasses: parseSelectedClasses(data.selectedClasses),
  };
};
