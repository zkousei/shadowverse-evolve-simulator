import type { SavedDeckRecordV1 } from './deckStorage';

export type SavedDeckPresentationTranslator = (
  key: string,
  params?: Record<string, string | number>
) => string;

const countSectionCards = (
  section: SavedDeckRecordV1['sections'][keyof SavedDeckRecordV1['sections']]
): number => section.reduce((total, ref) => total + ref.count, 0);

export const formatSavedDeckRuleSummary = (
  deck: SavedDeckRecordV1,
  t: SavedDeckPresentationTranslator
): string => {
  if (deck.ruleConfig.format === 'constructed') {
    if (deck.ruleConfig.identityType === 'title' && deck.ruleConfig.selectedTitle) {
      return t('gameBoard.deckRules.constructedTitle', { title: deck.ruleConfig.selectedTitle });
    }

    return t('gameBoard.deckRules.constructedClass', {
      class: deck.ruleConfig.selectedClass ?? t('gameBoard.deckRules.unselected'),
    });
  }

  if (deck.ruleConfig.format === 'crossover') {
    const [firstClass, secondClass] = deck.ruleConfig.selectedClasses;
    return t('gameBoard.deckRules.crossover', {
      firstClass: firstClass ?? '?',
      secondClass: secondClass ?? '?',
    });
  }

  return t('gameBoard.deckRules.other');
};

export const formatSavedDeckCountSummary = (
  deck: SavedDeckRecordV1,
  t: SavedDeckPresentationTranslator
): string => (
  [
    `${t('gameBoard.deckRules.main')} ${countSectionCards(deck.sections.main)}`,
    `${t('gameBoard.deckRules.evolve')} ${countSectionCards(deck.sections.evolve)}`,
    `${t('gameBoard.deckRules.leader')} ${countSectionCards(deck.sections.leader)}`,
    `${t('gameBoard.deckRules.token')} ${countSectionCards(deck.sections.token)}`,
  ].join(' / ')
);
