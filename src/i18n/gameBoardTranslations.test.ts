import { describe, expect, it } from 'vitest';
import jaTranslations from './ja/translation.json';

describe('game board translations', () => {
  it('keeps Japanese deck-top control labels short for narrow control panels', () => {
    expect(jaTranslations.gameBoard.zones.draw).toBe('カードを引く');
    expect(jaTranslations.gameBoard.zones.mill).toBe('デッキトップを 墓場');
    expect(jaTranslations.gameBoard.zones.topToEx).toBe('デッキトップを EX');
    expect(jaTranslations.gameBoard.zones.spawnToken).toBe('トークンを生成');
  });
});
