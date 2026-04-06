import React from 'react';
import { useTranslation } from 'react-i18next';
import CardArtwork from './CardArtwork';
import { getBaseCardType } from '../models/cardClassification';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import {
  buildCardDetailPresentation,
  formatAbilityText,
  type CardDetail,
} from '../utils/cardDetails';
import { parseNullableStat } from '../utils/deckBuilderDisplay';

type DeckBuilderPreviewModalProps = {
  previewCard: DeckBuilderCardData;
  previewDetail: CardDetail | null;
  onClose: () => void;
};

const DeckBuilderPreviewModal: React.FC<DeckBuilderPreviewModalProps> = ({
  previewCard,
  previewDetail,
  onClose,
}) => {
  const { t } = useTranslation();
  const previewPresentation = buildCardDetailPresentation(previewDetail);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('deckBuilder.preview.dialogAria', { name: previewCard.name })}
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '660px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px',
          boxShadow: '0 18px 50px rgba(0, 0, 0, 0.45)',
          padding: '0.8rem',
        }}
      >
        <button
          type="button"
          aria-label={t('deckBuilder.preview.closeAria')}
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-0.5rem',
            right: '-0.5rem',
            width: '2rem',
            height: '2rem',
            borderRadius: '999px',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            background: 'rgba(15, 23, 42, 0.92)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.15rem', paddingRight: '1.8rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '1rem', lineHeight: 1.35 }}>
              {previewDetail?.name || previewCard.name}
            </div>
            {previewPresentation.primaryMeta && (
              <div style={{ color: '#cbd5e1', fontSize: '0.76rem', marginTop: '0.18rem', lineHeight: 1.45 }}>
                {previewPresentation.primaryMeta}
              </div>
            )}
            {previewPresentation.secondaryMeta && (
              <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '0.1rem', lineHeight: 1.45 }}>
                {previewPresentation.secondaryMeta}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
          <CardArtwork
            image={previewDetail?.image || previewCard.image}
            alt={t('deckBuilder.preview.enlargedAlt', { name: previewCard.name })}
            detail={previewDetail ?? {
              id: previewCard.id,
              name: previewCard.name,
              image: previewCard.image,
              className: previewCard.class ?? '',
              title: previewCard.title ?? '',
              type: previewCard.type ?? '',
              subtype: previewCard.subtype ?? '',
              cost: previewCard.cost ?? '-',
              atk: parseNullableStat(previewCard.atk),
              hp: parseNullableStat(previewCard.hp),
              abilityText: previewCard.ability_text ?? '',
            }}
            baseCardType={getBaseCardType(previewCard.card_kind_normalized)}
            isLeaderCard={previewCard.deck_section === 'leader'}
            isTokenCard={previewCard.deck_section === 'token' || previewCard.is_token}
            isEvolveCard={previewCard.is_evolve_card}
            style={{
              width: '160px',
              maxWidth: '40vw',
              height: '224px',
              borderRadius: '10px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.32)',
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: '0.14rem 0.4rem', color: '#e2e8f0', fontSize: '0.76rem' }}>
              <span style={{ color: '#94a3b8' }}>{t('deckBuilder.preview.id')}</span>
              <span>{previewCard.id}</span>
              <span style={{ color: '#94a3b8' }}>{t('deckBuilder.preview.cost')}</span>
              <span>{previewDetail?.cost || previewCard.cost || '-'}</span>
              {previewPresentation.stats && (
                <>
                  <span style={{ color: '#94a3b8' }}>{t('deckBuilder.preview.stats')}</span>
                  <span>{previewPresentation.stats}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.6rem' }}>
          <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
            {t('gameBoard.inspector.abilityText')}
          </div>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              color: '#e5e7eb',
              fontSize: '0.76rem',
              lineHeight: 1.58,
              background: 'rgba(15, 23, 42, 0.76)',
              borderRadius: '10px',
              padding: '0.65rem',
              border: '1px solid rgba(255,255,255,0.08)',
              maxHeight: '30vh',
              overflowY: 'auto',
            }}
          >
            {previewDetail?.abilityText
              ? formatAbilityText(previewDetail.abilityText)
              : t('gameBoard.inspector.noAbilityText')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilderPreviewModal;
