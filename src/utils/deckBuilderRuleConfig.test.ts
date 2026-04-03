import { describe, expect, it } from 'vitest';
import type { DeckRuleConfig } from '../models/deckRule';
import {
  buildConstructedClassUpdatedRuleConfig,
  buildConstructedTitleUpdatedRuleConfig,
  buildCrossoverClassUpdatedRuleConfig,
  buildDeckFormatUpdatedRuleConfig,
  buildDeckIdentityTypeUpdatedRuleConfig,
} from './deckBuilderRuleConfig';

const baseRuleConfig: DeckRuleConfig = {
  format: 'constructed',
  identityType: 'class',
  selectedClass: 'ロイヤル',
  selectedTitle: 'Hero Tale',
  selectedClasses: [null, null],
};

describe('deckBuilderRuleConfig', () => {
  it('switches to crossover by clearing title and seeding the first selected class', () => {
    expect(buildDeckFormatUpdatedRuleConfig(baseRuleConfig, 'crossover')).toEqual({
      format: 'crossover',
      identityType: 'class',
      selectedClass: 'ロイヤル',
      selectedTitle: null,
      selectedClasses: ['ロイヤル', null],
    });
  });

  it('preserves explicit crossover classes when changing formats', () => {
    const crossoverRuleConfig: DeckRuleConfig = {
      ...baseRuleConfig,
      format: 'crossover',
      selectedTitle: null,
      selectedClasses: ['ロイヤル', 'ウィッチ'],
    };

    expect(buildDeckFormatUpdatedRuleConfig(crossoverRuleConfig, 'other')).toEqual({
      format: 'other',
      identityType: 'class',
      selectedClass: 'ロイヤル',
      selectedTitle: null,
      selectedClasses: ['ロイヤル', 'ウィッチ'],
    });
  });

  it('updates constructed identity, class, and title selections', () => {
    expect(buildDeckIdentityTypeUpdatedRuleConfig(baseRuleConfig, 'title')).toEqual({
      ...baseRuleConfig,
      identityType: 'title',
    });
    expect(buildConstructedClassUpdatedRuleConfig(baseRuleConfig, 'ウィッチ')).toEqual({
      ...baseRuleConfig,
      selectedClass: 'ウィッチ',
    });
    expect(buildConstructedClassUpdatedRuleConfig(baseRuleConfig, '')).toEqual({
      ...baseRuleConfig,
      selectedClass: null,
    });
    expect(buildConstructedTitleUpdatedRuleConfig(baseRuleConfig, 'Dragon Tale')).toEqual({
      ...baseRuleConfig,
      selectedTitle: 'Dragon Tale',
    });
    expect(buildConstructedTitleUpdatedRuleConfig(baseRuleConfig, '')).toEqual({
      ...baseRuleConfig,
      selectedTitle: null,
    });
  });

  it('updates either crossover class without disturbing the other slot', () => {
    const crossoverRuleConfig: DeckRuleConfig = {
      ...baseRuleConfig,
      format: 'crossover',
      selectedTitle: null,
      selectedClasses: ['ロイヤル', 'ウィッチ'],
    };

    expect(buildCrossoverClassUpdatedRuleConfig(crossoverRuleConfig, 0, 'ドラゴン')).toEqual({
      ...crossoverRuleConfig,
      selectedClasses: ['ドラゴン', 'ウィッチ'],
    });
    expect(buildCrossoverClassUpdatedRuleConfig(crossoverRuleConfig, 1, '')).toEqual({
      ...crossoverRuleConfig,
      selectedClasses: ['ロイヤル', null],
    });
  });
});
