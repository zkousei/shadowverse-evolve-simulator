import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import CardArtwork from './CardArtwork';
import { getBaseCardType } from '../models/cardClassification';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { CardDetail } from '../utils/cardDetails';
import type { DeckTargetSection } from '../utils/deckBuilderRules';

const ADD_ACTIONS: Record<
  DeckTargetSection,
  {
    background: string;
    titleKey: string;
    label: string;
    showPlus: boolean;
  }
> = {
  main: {
    background: 'var(--accent-primary)',
    titleKey: 'deckBuilder.addActions.mainTitle',
    label: '',
    showPlus: true,
  },
  evolve: {
    background: 'var(--accent-secondary)',
    titleKey: 'deckBuilder.addActions.evolveTitle',
    label: 'EVO',
    showPlus: true,
  },
  leader: {
    background: '#f59e0b',
    titleKey: 'deckBuilder.addActions.leaderTitle',
    label: 'LEAD',
    showPlus: false,
  },
  token: {
    background: 'var(--vivid-green-cyan)',
    titleKey: 'deckBuilder.addActions.tokenTitle',
    label: 'TOKEN',
    showPlus: false,
  },
};

type DeckBuilderLibraryCardProps = {
  card: DeckBuilderCardData;
  detail?: CardDetail;
  allowedSections: DeckTargetSection[];
  canAddToSection: (section: DeckTargetSection) => boolean;
  onOpenPreview: (card: DeckBuilderCardData) => void;
  onAddToSection: (card: DeckBuilderCardData, section: DeckTargetSection) => void;
};

const DeckBuilderLibraryCard: React.FC<DeckBuilderLibraryCardProps> = ({
  card,
  detail,
  allowedSections,
  canAddToSection,
  onOpenPreview,
  onAddToSection,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="glass-panel"
      style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
    >
      <button
        type="button"
        aria-label={t('deckBuilder.preview.openAria', { name: card.name })}
        title={t('deckBuilder.preview.openTitle', { name: card.name })}
        onClick={() => onOpenPreview(card)}
        style={{
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          lineHeight: 0,
        }}
      >
        <CardArtwork
          image={card.image}
          alt={card.name}
          detail={detail}
          baseCardType={getBaseCardType(card.card_kind_normalized)}
          isLeaderCard={card.deck_section === 'leader'}
          isTokenCard={card.deck_section === 'token' || card.is_token}
          isEvolveCard={card.is_evolve_card}
          style={{ width: '100%', borderRadius: '4px' }}
          draggable={false}
        />
      </button>

      <p
        style={{
          fontSize: '0.75rem',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={card.name}
      >
        {card.name}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {allowedSections.map((section) => {
          const action = ADD_ACTIONS[section];
          const canAdd = canAddToSection(section);

          return (
            <button
              key={section}
              type="button"
              onClick={() => onAddToSection(card, section)}
              disabled={!canAdd}
              style={{
                flex: section === 'token' ? '1 1 100%' : 1,
                padding: '0.25rem',
                background: canAdd ? action.background : 'var(--bg-surface-elevated)',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                opacity: canAdd ? 1 : 0.5,
                cursor: canAdd ? 'pointer' : 'not-allowed',
              }}
              title={t(action.titleKey)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {action.showPlus && <Plus size={16} color="#fff" />}
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DeckBuilderLibraryCard;
