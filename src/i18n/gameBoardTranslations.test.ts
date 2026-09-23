import { describe, expect, it } from 'vitest';
import jaTranslations from './ja/translation.json';

describe('game board translations', () => {
  it('keeps Japanese deck-top control labels short for narrow control panels', () => {
    expect(jaTranslations.gameBoard.zones.draw).toBe('ドロー');
    expect(jaTranslations.gameBoard.zones.mill).toBe('トップ墓場');
    expect(jaTranslations.gameBoard.zones.topToEx).toBe('トップEX');
    expect(jaTranslations.gameBoard.zones.topToBanish).toBe('トップ消滅');
    expect(jaTranslations.gameBoard.zones.topDestinationCemetery).toBe('墓場');
    expect(jaTranslations.gameBoard.zones.topDestinationEx).toBe('EX');
    expect(jaTranslations.gameBoard.zones.topDestinationBanish).toBe('消滅');
    expect(jaTranslations.gameBoard.zones.spawnToken).toBe('トークン');
  });
});
