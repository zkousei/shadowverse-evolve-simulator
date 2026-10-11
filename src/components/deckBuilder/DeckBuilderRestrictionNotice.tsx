import { useTranslation } from 'react-i18next';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import type { DeckRuleConfig } from '../../models/deckRule';
import { getEffectiveDeckRestriction } from '../../utils/deck/deckRestrictionRules';
import type { DeckTargetSection } from '../../utils/deckBuilder/deckBuilderRules';

type Props = {
  card: DeckBuilderCardData;
  section: DeckTargetSection;
  deckRuleConfig?: DeckRuleConfig;
};

const DeckBuilderRestrictionNotice = ({ card, section, deckRuleConfig }: Props) => {
  const { t } = useTranslation();
  if (!deckRuleConfig || (section !== 'main' && section !== 'evolve')) return null;
  const restriction = getEffectiveDeckRestriction(card, section, deckRuleConfig);
  if (restriction.source !== 'policy-banned' && restriction.source !== 'policy-limited') return null;
  const banned = restriction.source === 'policy-banned';
  const description = t(`deckBuilder.restriction.${banned ? 'bannedDescription' : 'limitedDescription'}`, {
    format: t(`deckBuilder.deckRule.formats.${deckRuleConfig.format}`),
    section: t(`deckBuilder.deckArea.${section === 'main' ? 'mainDeck' : 'evolveDeck'}`),
    limit: restriction.copyLimit,
  });

  return (
    <span title={description} style={{
      display: 'inline-block', padding: '2px 6px', borderRadius: '4px', lineHeight: 1.4,
      background: banned ? '#7f1d1d' : '#713f12', color: banned ? '#fecaca' : '#fef08a',
      border: `1px solid ${banned ? '#f87171' : '#facc15'}`,
      fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {t(`deckBuilder.restriction.${banned ? 'banned' : 'limited'}`, { limit: restriction.copyLimit })}
    </span>
  );
};

export default DeckBuilderRestrictionNotice;
