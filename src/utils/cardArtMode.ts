export type CardArtMode = 'official' | 'dummy';

export const getCardArtMode = (): CardArtMode => (
  import.meta.env.VITE_CARD_ART_MODE === 'dummy' ? 'dummy' : 'official'
);

export const isDummyCardArtEnabled = (): boolean => getCardArtMode() === 'dummy';
