/// <reference types="node" />
// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CARD_KIND_NORMALIZED_VALUES, type CardKindNormalized, type DeckSection } from '../../models/cardClassification';
import { inferDeckSection } from '../deckBuilder/deckBuilderRules';

// Exercise the actual Python definitions rather than a copied fixture.
const metadata: {
  kinds: Record<string, CardKindNormalized>;
  sections: Record<CardKindNormalized, DeckSection>;
} = JSON.parse(execFileSync('python3', ['-c', [
  'import json',
  'from tools.card_data.card_metadata import CARD_KIND_BY_TYPE, DECK_SECTION_BY_CARD_KIND',
  'print(json.dumps({"kinds": CARD_KIND_BY_TYPE, "sections": DECK_SECTION_BY_CARD_KIND}))',
].join('\n')], {
  cwd: fileURLToPath(new URL('../../../', import.meta.url)),
  encoding: 'utf8',
}));

describe('Python and application card classification parity', () => {
  it('supports exactly the same normalized card kinds', () => {
    expect(Object.values(metadata.kinds).sort()).toEqual([...CARD_KIND_NORMALIZED_VALUES].sort());
    expect(Object.keys(metadata.sections).sort()).toEqual([...CARD_KIND_NORMALIZED_VALUES].sort());
  });

  it.each(Object.entries(metadata.kinds))('classifies %s consistently', (type, kind) => {
    const card = { id: 'parity-card', name: 'Parity Card', image: '/parity.png' };
    const section = metadata.sections[kind];
    expect(section).toBeDefined();
    expect(inferDeckSection({ ...card, type })).toBe(section);
    expect(inferDeckSection({ ...card, card_kind_normalized: kind })).toBe(section);
  });
});
