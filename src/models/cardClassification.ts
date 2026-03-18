export const CARD_KIND_NORMALIZED_VALUES = [
  'follower',
  'evolve_follower',
  'spell',
  'amulet',
  'leader',
  'ep',
  'sep',
  'token_follower',
  'token_spell',
  'token_amulet',
  'token_equipment',
  'advance_follower',
  'advance_spell',
  'evolve_amulet',
  'evolve_spell',
] as const;

export type CardKindNormalized = typeof CARD_KIND_NORMALIZED_VALUES[number];

export const DECK_SECTION_VALUES = ['main', 'evolve', 'leader', 'token', 'neither'] as const;
export type DeckSection = typeof DECK_SECTION_VALUES[number];
