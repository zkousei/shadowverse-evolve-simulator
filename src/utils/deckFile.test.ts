import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckRuleConfig } from '../models/deckRule';
import {
  buildExportableDeckPayload,
  downloadDeckJson,
  resolveImportedDeckName,
  sanitizeDeckExportFileName,
} from './deckFile';

const baseCard: DeckBuilderCardData = {
  id: 'BP01-001',
  name: 'Alpha Knight',
  image: '/alpha.png',
  catalog_status: 'preview',
  class: 'ロイヤル',
  title: 'Hero Tale',
  type: 'フォロワー',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  related_cards: [{ id: 'TK01-001', name: 'Knight Token' }],
  faces: [
    {
      side: 'front',
      name: 'Alpha Knight',
      image: '/alpha-front.png',
      type: 'フォロワー',
      card_kind_normalized: 'follower',
      deck_section: 'main',
    },
    {
      side: 'back',
      name: 'Alpha Knight Back',
      image: '/alpha-back.png',
      type: 'フォロワー',
      card_kind_normalized: 'follower',
      deck_section: 'main',
    },
  ],
};

const ruleConfig: DeckRuleConfig = {
  format: 'crossover',
  identityType: 'class',
  selectedClass: null,
  selectedTitle: null,
  selectedClasses: ['ロイヤル', 'ウィッチ'],
};

describe('deckFile', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('builds an exportable payload without catalog-only metadata', () => {
    const payload = buildExportableDeckPayload('My Deck', ruleConfig, {
      mainDeck: [baseCard],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    });

    expect(payload).toMatchObject({
      deckName: 'My Deck',
      rule: 'crossover',
      selectedClasses: ['ロイヤル', 'ウィッチ'],
    });
    expect(payload.mainDeck[0]).toMatchObject({
      id: 'BP01-001',
      name: 'Alpha Knight',
      deck_section: 'main',
    });
    expect(payload.mainDeck[0]).not.toHaveProperty('related_cards');
    expect(payload.mainDeck[0]).not.toHaveProperty('faces');
    expect(payload.mainDeck[0]).not.toHaveProperty('catalog_status');
  });

  it('sanitizes export file names and preserves supported characters', () => {
    expect(sanitizeDeckExportFileName('  Royal Deck  ')).toBe('Royal_Deck');
    expect(sanitizeDeckExportFileName('Deck:*?<>|Name')).toBe('Deck______Name');
    expect(sanitizeDeckExportFileName('開催大成功！-Test')).toBe('開催大成功！-Test');
    expect(sanitizeDeckExportFileName('   ')).toBe('shadowverse_deck');
  });

  it('resolves imported deck names from payload first and falls back to the file name', () => {
    expect(resolveImportedDeckName({ deckName: 'Imported Deck' }, 'Fallback.json')).toBe('Imported Deck');
    expect(resolveImportedDeckName({}, 'Fallback Name.json')).toBe('Fallback Name');
    expect(resolveImportedDeckName({ deckName: '' }, 'Fallback Name.json')).toBe('Fallback Name');
    expect(resolveImportedDeckName({}, 'not-json.txt')).toBeNull();
  });

  it('downloads export payloads as json files', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:deck-file');
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });

    const payload = buildExportableDeckPayload('Alpha', ruleConfig, {
      mainDeck: [baseCard],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    });

    downloadDeckJson('Alpha:? Deck', payload);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const anchor = document.body.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('download')).toBe('Alpha___Deck.json');

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    const exported = JSON.parse(await blob.text());
    expect(exported.mainDeck[0].name).toBe('Alpha Knight');

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:deck-file');
    expect(document.body.querySelector('a')).toBeNull();
  });
});
