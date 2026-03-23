import { getDisplayDedupKey, type DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckState } from '../models/deckState';

export type IntrinsicDeckException = {
  key: string;
  copyLimit: number;
  reason: string;
};

const createExceptionKey = (
  name: string,
  deckSection: 'main' | 'evolve',
  type: string,
  cardClass: string
): string => [name, deckSection, type, cardClass].join('::');

export const INTRINSIC_DECK_EXCEPTIONS: IntrinsicDeckException[] = [
  {
    key: createExceptionKey('開催大成功！', 'evolve', 'スペル・エボルヴ', 'ニュートラル'),
    copyLimit: 10,
    reason: 'Card text allows up to 10 copies in the evolve deck.',
  },
  {
    key: createExceptionKey('聖なる夜に重なるキセキ', 'evolve', 'スペル・エボルヴ', 'ニュートラル'),
    copyLimit: 10,
    reason: 'Card text allows up to 10 copies in the evolve deck.',
  },
  {
    key: createExceptionKey('1日の終わりに', 'evolve', 'スペル・エボルヴ', 'ニュートラル'),
    copyLimit: 10,
    reason: 'Card text allows up to 10 copies in the evolve deck.',
  },
  {
    key: createExceptionKey('開幕ッ！大農耕時代ッ！', 'evolve', 'スペル・エボルヴ', 'ニュートラル'),
    copyLimit: 10,
    reason: 'Card text allows up to 10 copies in the evolve deck.',
  },
  {
    key: createExceptionKey('合宿ッ！農家体験ッ！', 'evolve', 'スペル・エボルヴ', 'ニュートラル'),
    copyLimit: 10,
    reason: 'Card text allows up to 10 copies in the evolve deck.',
  },
  {
    key: createExceptionKey('ラピッドファイア', 'main', 'スペル', 'ウィッチ'),
    copyLimit: 6,
    reason: 'Card text allows up to 6 copies in the deck.',
  },
  {
    key: createExceptionKey('ドライブポイント', 'evolve', 'スペル・エボルヴ', 'ニュートラル'),
    copyLimit: 10,
    reason: 'Card text allows up to 10 copies in the evolve deck.',
  },
  {
    key: createExceptionKey('オニオン軍団', 'main', 'フォロワー', 'ウィッチ'),
    copyLimit: 50,
    reason: 'Card text allows up to 50 copies in the deck.',
  },
  {
    key: createExceptionKey('にんじん', 'evolve', 'スペル・エボルヴ', 'ニュートラル'),
    copyLimit: 10,
    reason: 'Card text allows up to 10 copies in the evolve deck.',
  },
];

const INTRINSIC_DECK_EXCEPTION_BY_KEY = new Map(
  INTRINSIC_DECK_EXCEPTIONS.map(exception => [exception.key, exception])
);

export const getIntrinsicDeckExceptionForCard = (
  card: DeckBuilderCardData
): IntrinsicDeckException | undefined => INTRINSIC_DECK_EXCEPTION_BY_KEY.get(getDisplayDedupKey(card));

export const getIntrinsicCopyLimitForCard = (
  card: DeckBuilderCardData
): number | undefined => getIntrinsicDeckExceptionForCard(card)?.copyLimit;

export const getGlobalIntrinsicLimit = (
  card: DeckBuilderCardData,
  deckState: DeckState
): number | undefined => {
  const hasCutthroatTrigger = deckState.mainDeck.some(c => c.name === '機鋒の咎人・カットスロート');

  if (hasCutthroatTrigger && !card.name.includes('カットスロート')) {
    return 1;
  }

  return undefined;
};
