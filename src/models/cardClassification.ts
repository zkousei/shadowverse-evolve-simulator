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
  'advance_amulet',
  'evolve_amulet',
  'evolve_spell',
] as const;

export type CardKindNormalized = typeof CARD_KIND_NORMALIZED_VALUES[number];

export const BASE_CARD_TYPE_VALUES = ['follower', 'spell', 'amulet'] as const;
export type BaseCardType = typeof BASE_CARD_TYPE_VALUES[number];

export const getBaseCardType = (cardKindNormalized?: string | null): BaseCardType | null => {
  if (!cardKindNormalized) return null;

  if (cardKindNormalized === 'follower' || cardKindNormalized.endsWith('_follower')) {
    return 'follower';
  }

  if (cardKindNormalized === 'spell' || cardKindNormalized.endsWith('_spell')) {
    return 'spell';
  }

  if (
    cardKindNormalized === 'amulet' ||
    cardKindNormalized.endsWith('_amulet') ||
    cardKindNormalized === 'token_equipment'
  ) {
    return 'amulet';
  }

  return null;
};

export const DECK_SECTION_VALUES = ['main', 'evolve', 'leader', 'token', 'neither'] as const;
export type DeckSection = typeof DECK_SECTION_VALUES[number];
