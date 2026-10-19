import React from 'react';
import type { CardInstance } from '../Card';
import { useTranslation } from 'react-i18next';
import CardArtwork from '../CardArtwork';
import {
  buildCardDetailPresentation,
  formatAbilityText,
  resolveSelectedCardFaceDetail,
  type CardDetailLookup,
} from '../../utils/card/cardDetails';
import {
  HOVER_PREVIEW_WIDTH,
  HOVER_PREVIEW_HEIGHT,
} from './topDeckHoverPosition';

export interface TopDeckHoverPreviewProps {
  card: CardInstance;
  cardDetailLookup?: CardDetailLookup;
  left: number;
  top: number;
}

export const TopDeckHoverPreview: React.FC<TopDeckHoverPreviewProps> = ({
  card,
  cardDetailLookup = {},
  left,
  top,
}) => {
  const { t } = useTranslation();
  const detail = resolveSelectedCardFaceDetail(cardDetailLookup[card.cardId], card.selectedFaceSide);
  const presentation = buildCardDetailPresentation(detail);
  const displayName = detail?.name || card.name;

  return (
    <div
      data-testid="top-deck-hover-preview"
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 7000,
        pointerEvents: 'none',
        width: `${HOVER_PREVIEW_WIDTH}px`,
        maxHeight: `${HOVER_PREVIEW_HEIGHT}px`,
        overflow: 'hidden',
        background: 'rgba(15, 23, 42, 0.96)',
        border: '1px solid rgba(148, 163, 184, 0.35)',
        borderRadius: '12px',
        padding: '0.75rem',
        boxShadow: '0 18px 45px rgba(0,0,0,0.5)',
        color: '#e5e7eb',
      }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <CardArtwork
          image={detail?.image || card.image}
          alt={displayName}
          detail={detail ?? undefined}
          baseCardType={card.baseCardType}
          isLeaderCard={card.isLeaderCard}
          isTokenCard={card.isTokenCard}
          isEvolveCard={card.isEvolveCard}
          style={{
            width: '96px',
            height: '134px',
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
            flexShrink: 0,
          }}
          draggable={false}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.35, color: '#f8fafc' }}>
            {displayName}
          </div>
          {presentation.primaryMeta && (
            <div style={{ color: '#cbd5e1', fontSize: '0.73rem', marginTop: '0.22rem', lineHeight: 1.4 }}>
              {presentation.primaryMeta}
            </div>
          )}
          {presentation.secondaryMeta && (
            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.14rem', lineHeight: 1.4 }}>
              {presentation.secondaryMeta}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: '0.18rem 0.45rem', marginTop: '0.55rem', fontSize: '0.74rem' }}>
            <span style={{ color: '#94a3b8' }}>{t('gameBoard.inspector.id')}</span>
            <span>{card.cardId}</span>
            <span style={{ color: '#94a3b8' }}>{t('gameBoard.inspector.cost')}</span>
            <span>{detail?.cost || '-'}</span>
            {presentation.stats && (
              <>
                <span style={{ color: '#94a3b8' }}>{t('gameBoard.inspector.stats')}</span>
                <span>{presentation.stats}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.18)', marginTop: '0.75rem', paddingTop: '0.65rem' }}>
        <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem' }}>
          {t('gameBoard.inspector.abilityText')}
        </div>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            color: '#e5e7eb',
            fontSize: '0.76rem',
            lineHeight: 1.55,
            maxHeight: '150px',
            overflow: 'hidden',
          }}
        >
          {detail?.abilityText ? formatAbilityText(detail.abilityText) : t('gameBoard.inspector.noAbilityText')}
        </div>
      </div>
    </div>
  );
};

export default TopDeckHoverPreview;
