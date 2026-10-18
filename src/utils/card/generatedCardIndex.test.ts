import { describe, expect, it } from 'vitest';
import { decodeGeneratedCardIndex } from './generatedCardIndex';

// Independent wire-format fixture: changes to the production field order must
// not silently change the meaning of already published rows.
const fields = ['id', 'name', 'image', 'class', 'title', 'type', 'subtype', 'rarity', 'product_name', 'cost', 'atk', 'hp', 'card_kind_normalized', 'deck_section', 'is_token', 'is_evolve_card', 'is_deck_build_legal', 'catalog_status', 'related_cards', 'detail_group'];
const required = 2 ** 19 + 3;
const wire = (): { encoding: string; fields: string[]; rows: unknown[][] } => ({ encoding: 'rows-v1', fields: [...fields], rows: [[required, 'A-1', '日本語', 'A']] });

describe('generated compact index decoding', () => {
  it.each([3, 4])('rejects unsupported schema %s even with otherwise valid compact rows', schema => {
    expect(() => decodeGeneratedCardIndex(wire(), schema)).toThrow(/compact index/);
  });

  it('restores exact values and distinguishes absent fields, empty strings and false without mutating input', () => {
    const input = wire();
    input.rows = [[required + 2 ** 2 + 2 ** 14 + 2 ** 18, 'A-1', '日本語', '', false, [{ id: 'A-1', name: 'self', future: { zero: 0 } }], 'A']];
    const before = JSON.stringify(input);
    expect(decodeGeneratedCardIndex(input, 2)).toEqual([{ id: 'A-1', name: '日本語', image: '', is_token: false, related_cards: [{ id: 'A-1', name: 'self', future: { zero: 0 } }], detail_group: 'A' }]);
    expect(JSON.stringify(input)).toBe(before);
  });
  it('accepts an empty compact catalog', () => {
    expect(decodeGeneratedCardIndex({ ...wire(), rows: [] }, 2)).toEqual([]);
  });
  it('still reads schema 1 arrays without assigning schema 2 meaning to them', () => {
    const entries = [{ id: 'A-1', name: 'old', detail_group: 'A' }];
    expect(decodeGeneratedCardIndex(entries, 1)).toBe(entries);
    expect(() => decodeGeneratedCardIndex(entries, 2)).toThrow();
    expect(() => decodeGeneratedCardIndex(wire(), 1)).toThrow();
    expect(() => decodeGeneratedCardIndex(wire(), 3)).toThrow();
  });
  it.each([
    ['wrong encoding', () => ({ ...wire(), encoding: 'unknown' })],
    ['unknown envelope field', () => ({ ...wire(), extra: true })],
    ['wrong field order', () => ({ ...wire(), fields: [...fields].reverse() })],
    ['duplicate field', () => ({ ...wire(), fields: fields.map((f, i) => i === 1 ? 'id' : f) })],
    ['unknown field', () => ({ ...wire(), fields: [...fields, 'future'] })],
    ['non-array rows', () => ({ ...wire(), rows: {} })],
    ['non-array row', () => ({ ...wire(), rows: [null] })],
    ['missing mask', () => ({ ...wire(), rows: [[]] })],
    ['boolean mask', () => ({ ...wire(), rows: [[true, 'A-1', 'A', 'A']] })],
    ['fractional mask', () => ({ ...wire(), rows: [[required + 0.5, 'A-1', 'A', 'A']] })],
    ['negative mask', () => ({ ...wire(), rows: [[-1, 'A-1', 'A', 'A']] })],
    ['extra high bit', () => ({ ...wire(), rows: [[required + 2 ** 20, 'A-1', 'A', 'A']] })],
    ['missing id', () => ({ ...wire(), rows: [[required - 1, 'A', 'A']] })],
    ['missing name', () => ({ ...wire(), rows: [[required - 2, 'A-1', 'A']] })],
    ['missing group', () => ({ ...wire(), rows: [[3, 'A-1', 'A']] })],
    ['missing value', () => ({ ...wire(), rows: [[required, 'A-1', 'A']] })],
    ['extra value', () => ({ ...wire(), rows: [[required, 'A-1', 'A', 'A', 'extra']] })],
  ])('rejects %s rather than interpreting shifted or partial data', (_label, make) => {
    expect(() => decodeGeneratedCardIndex(make(), 2)).toThrow(/compact index/);
  });
});
