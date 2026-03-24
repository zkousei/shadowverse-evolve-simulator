import { describe, expect, it, vi } from 'vitest';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import {
  DeckLogImportError,
  convertDeckLogResponse,
  extractDeckLogCode,
  fetchDeckLogImport,
  getDeckLogRuleConfig,
} from './decklogImport';

const availableCards: DeckBuilderCardData[] = [
  {
    id: 'BP01-001',
    name: 'Alpha Knight',
    image: '/alpha.png',
    class: 'エルフ',
    type: 'フォロワー',
    card_kind_normalized: 'follower',
    deck_section: 'main',
  },
  {
    id: 'EV01-001',
    name: 'Beta Evolve',
    image: '/beta.png',
    class: 'エルフ',
    type: 'フォロワー・エボルヴ',
    card_kind_normalized: 'evolve_follower',
    deck_section: 'evolve',
    is_evolve_card: true,
  },
  {
    id: 'LDR01-001',
    name: 'Leader Luna',
    image: '/leader.png',
    class: 'エルフ',
    type: 'リーダー',
    card_kind_normalized: 'leader',
    deck_section: 'leader',
  },
];

describe('extractDeckLogCode', () => {
  it('accepts a raw deck code', () => {
    expect(extractDeckLogCode('7h9k2')).toBe('7H9K2');
  });

  it('extracts a deck code from a DeckLog URL', () => {
    expect(extractDeckLogCode('https://decklog.bushiroad.com/view/7H9K2')).toBe('7H9K2');
  });

  it('extracts a deck code from a DeckLog URL with query parameters', () => {
    expect(extractDeckLogCode('https://decklog.bushiroad.com/view/7H9K2?from=share#top')).toBe('7H9K2');
  });

  it('rejects invalid input', () => {
    expect(extractDeckLogCode('hello world')).toBeNull();
  });
});

describe('getDeckLogRuleConfig', () => {
  it('maps other-format decks', () => {
    expect(getDeckLogRuleConfig('O', 'none')).toMatchObject({ format: 'other' });
  });

  it('maps crossover class pairs', () => {
    expect(getDeckLogRuleConfig('X', 'エルフ/ロイヤル')).toEqual({
      format: 'crossover',
      identityType: 'class',
      selectedClass: null,
      selectedTitle: null,
      selectedClasses: ['エルフ', 'ロイヤル'],
    });
  });

  it('falls back to null for unrecognized crossover classes', () => {
    expect(getDeckLogRuleConfig('X', 'エルフ/Unknown')).toEqual({
      format: 'crossover',
      identityType: 'class',
      selectedClass: null,
      selectedTitle: null,
      selectedClasses: ['エルフ', null],
    });
  });

  it('maps constructed class decks', () => {
    expect(getDeckLogRuleConfig('N', 'エルフ')).toMatchObject({
      format: 'constructed',
      identityType: 'class',
      selectedClass: 'エルフ',
    });
  });

  it('maps constructed title decks', () => {
    expect(getDeckLogRuleConfig('N', 'プリンセスコネクト！Re:Dive')).toMatchObject({
      format: 'constructed',
      identityType: 'title',
      selectedTitle: 'プリンセスコネクト！Re:Dive',
    });
  });
});

describe('convertDeckLogResponse', () => {
  it('expands deck counts into importable deck sections', () => {
    const result = convertDeckLogResponse({
      id: 1,
      title: 'DeckLog Elf',
      game_title_id: 6,
      deck_param1: 'N',
      deck_param2: 'エルフ',
      list: [
        { card_number: 'BP01-001', name: 'Alpha Knight', num: 2, card_kind: '・フォロワー・', img: 'BP01/bp01_001.png', custom_param: { class_name: 'エルフ' } },
      ],
      sub_list: [
        { card_number: 'EV01-001', name: 'Beta Evolve', num: 1, card_kind: '・フォロワー・エボルヴ・', img: 'EV01/ev01_001.png', custom_param: { class_name: 'エルフ' } },
      ],
      p_list: [
        { card_number: 'LDR01-001', name: 'Leader Luna', num: 1, card_kind: '・リーダー・', img: 'LDR01/ldr01_001.png', custom_param: { class_name: 'エルフ' } },
      ],
    }, availableCards);

    expect(result.deckName).toBe('DeckLog Elf');
    expect(result.ruleConfig).toMatchObject({ format: 'constructed', selectedClass: 'エルフ' });
    expect(result.deckState.mainDeck).toHaveLength(2);
    expect(result.deckState.evolveDeck).toHaveLength(1);
    expect(result.deckState.leaderCards).toHaveLength(1);
    expect(result.missingCardIds).toEqual([]);
  });

  it('collects missing card ids', () => {
    const result = convertDeckLogResponse({
      id: 1,
      title: 'Missing Deck',
      game_title_id: 6,
      list: [
        { card_number: 'UNKNOWN-001', name: 'Unknown', num: 1, card_kind: '・フォロワー・' },
      ],
    }, availableCards);

    expect(result.missingCardIds).toEqual(['UNKNOWN-001']);
  });

  it('uses a fallback deck name and normalizes missing optional card fields', () => {
    const result = convertDeckLogResponse({
      id: 1,
      title: '   ',
      game_title_id: 6,
      list: [
        { card_number: 'BP01-001', name: 'Alpha Knight', num: 1, card_kind: '・フォロワー・' },
      ],
    }, availableCards);

    expect(result.deckName).toBe('DeckLog Import');
    expect(result.deckState.mainDeck[0]).toMatchObject({
      id: 'BP01-001',
      name: 'Alpha Knight',
      image: '',
      type: 'フォロワー',
    });
  });

  it('rejects non-SVE decks', () => {
    expect(() => convertDeckLogResponse({
      id: 1,
      title: 'Wrong Game',
      game_title_id: 1,
    }, availableCards)).toThrowError(DeckLogImportError);
  });
});

describe('fetchDeckLogImport', () => {
  it('rejects invalid input before calling the API', async () => {
    const fetchMock = vi.fn();

    await expect(fetchDeckLogImport('not a code', availableCards, fetchMock as unknown as typeof fetch))
      .rejects.toMatchObject({ code: 'invalid-input' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws a not-found error for empty API responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    });

    await expect(fetchDeckLogImport('7H9K2', availableCards, fetchMock as unknown as typeof fetch))
      .rejects.toMatchObject({ code: 'not-found' });
  });

  it('surfaces network fetch failures', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(fetchDeckLogImport('7H9K2', availableCards, fetchMock as unknown as typeof fetch))
      .rejects.toMatchObject({ code: 'fetch-failed' });
  });

  it('includes proxy error details when the API responds with a failure payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: vi.fn().mockResolvedValue({ error: 'Failed to reach DeckLog' }),
    });

    await expect(fetchDeckLogImport('7H9K2', availableCards, fetchMock as unknown as typeof fetch))
      .rejects.toMatchObject({
        code: 'fetch-failed',
        message: 'DeckLog responded with 502. Failed to reach DeckLog',
      });
  });

  it('rejects invalid JSON payloads', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    });

    await expect(fetchDeckLogImport('7H9K2', availableCards, fetchMock as unknown as typeof fetch))
      .rejects.toMatchObject({ code: 'invalid-response' });
  });

  it('rejects unexpected payload shapes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ title: 'missing id' }),
    });

    await expect(fetchDeckLogImport('7H9K2', availableCards, fetchMock as unknown as typeof fetch))
      .rejects.toMatchObject({ code: 'invalid-response' });
  });
});
