import { CLASS_VALUES, type CardClass } from '../models/class';
import type { DeckFormat, DeckIdentityType, DeckRuleConfig } from '../models/deckRule';

const parseNullableCardClass = (value: string): CardClass | null => (
  value !== '' && CLASS_VALUES.includes(value as CardClass)
    ? value as CardClass
    : null
);

export const buildDeckFormatUpdatedRuleConfig = (
  current: DeckRuleConfig,
  nextFormat: DeckFormat
): DeckRuleConfig => ({
  ...current,
  format: nextFormat,
  identityType: nextFormat === 'crossover' ? 'class' : current.identityType,
  selectedTitle: nextFormat === 'crossover' ? null : current.selectedTitle,
  selectedClasses: nextFormat === 'crossover'
    && current.selectedClasses.every(value => value === null)
    && current.selectedClass
    ? [current.selectedClass, null]
    : current.selectedClasses,
});

export const buildDeckIdentityTypeUpdatedRuleConfig = (
  current: DeckRuleConfig,
  identityType: DeckIdentityType
): DeckRuleConfig => ({
  ...current,
  identityType,
});

export const buildConstructedClassUpdatedRuleConfig = (
  current: DeckRuleConfig,
  nextValue: string
): DeckRuleConfig => ({
  ...current,
  selectedClass: parseNullableCardClass(nextValue),
});

export const buildConstructedTitleUpdatedRuleConfig = (
  current: DeckRuleConfig,
  nextValue: string
): DeckRuleConfig => ({
  ...current,
  selectedTitle: nextValue === '' ? null : nextValue,
});

export const buildCrossoverClassUpdatedRuleConfig = (
  current: DeckRuleConfig,
  index: 0 | 1,
  nextValue: string
): DeckRuleConfig => ({
  ...current,
  selectedClasses: index === 0
    ? [parseNullableCardClass(nextValue), current.selectedClasses[1]]
    : [current.selectedClasses[0], parseNullableCardClass(nextValue)],
});
