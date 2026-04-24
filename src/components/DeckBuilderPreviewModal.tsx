import React from 'react';
import { useTranslation } from 'react-i18next';
import CardArtwork from './CardArtwork';
import { getBaseCardType } from '../models/cardClassification';
import type { CardFaceData, DeckBuilderCardData } from '../models/deckBuilderCard';
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

const toCardDetail = (
  card: DeckBuilderCardData,
  face?: CardFaceData
): CardDetail => ({
  id: card.id,
  name: face?.name ?? card.name,
  image: face?.image ?? card.image,
  className: face?.class ?? card.class ?? '',
  title: face?.title ?? card.title ?? '',
  type: face?.type ?? card.type ?? '',
  subtype: face?.subtype ?? card.subtype ?? '',
  cardKindNormalized: face?.card_kind_normalized ?? card.card_kind_normalized ?? '',
  cost: face?.cost ?? card.cost ?? '-',
  atk: parseNullableStat(face?.atk ?? card.atk),
  hp: parseNullableStat(face?.hp ?? card.hp),
  abilityText: face?.ability_text ?? card.ability_text ?? '',
});

const getFaceLabelKey = (side: string): string => (
  side === 'front' || side === 'back'
    ? `deckBuilder.preview.faces.${side}`
    : side
);

const getDetailCardKind = (
  detail: CardDetail,
  fallbackCard: DeckBuilderCardData
): string => detail.cardKindNormalized || fallbackCard.card_kind_normalized || '';

const DeckBuilderPreviewModal: React.FC<DeckBuilderPreviewModalProps> = ({
  previewCard,
  previewDetail,
  onClose,
}) => {
  const { t } = useTranslation();
  const fallbackDetail = toCardDetail(previewCard);
  const resolvedPreviewDetail = previewDetail ?? fallbackDetail;
  const previewPresentation = buildCardDetailPresentation(resolvedPreviewDetail);
  const singlePreviewKind = getDetailCardKind(resolvedPreviewDetail, previewCard);
  const faceDetails = (previewCard.faces ?? []).length > 1
    ? previewCard.faces?.map(face => ({
      face,
      detail: toCardDetail(previewCard, face),
      label: t(getFaceLabelKey(face.side)),
    })) ?? []
    : [];
  const hasFaceDetails = faceDetails.length > 1;

  const renderArtworkAndStats = (
    detail: CardDetail,
    presentation: ReturnType<typeof buildCardDetailPresentation>,
    imageAlt: string,
    cardKind: string,
    artworkStyle: React.CSSProperties
  ) => (
    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
      <CardArtwork
        image={detail.image || previewCard.image}
        alt={imageAlt}
        detail={detail}
        baseCardType={getBaseCardType(cardKind)}
        isLeaderCard={cardKind === 'leader'}
        isTokenCard={cardKind.startsWith('token_') || previewCard.deck_section === 'token' || previewCard.is_token}
        isEvolveCard={cardKind.startsWith('evolve_') || previewCard.is_evolve_card}
        style={artworkStyle}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0, flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: '0.14rem 0.4rem', color: '#e2e8f0', fontSize: '0.76rem' }}>
          <span style={{ color: '#94a3b8' }}>{t('deckBuilder.preview.id')}</span>
          <span>{previewCard.id}</span>
          <span style={{ color: '#94a3b8' }}>{t('deckBuilder.preview.cost')}</span>
          <span>{detail.cost || previewCard.cost || '-'}</span>
          {presentation.stats && (
            <>
              <span style={{ color: '#94a3b8' }}>{t('deckBuilder.preview.stats')}</span>
              <span>{presentation.stats}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderAbilityText = (detail: CardDetail, maxHeight: string) => (
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
          maxHeight,
          overflowY: 'auto',
        }}
      >
        {detail.abilityText
          ? formatAbilityText(detail.abilityText)
          : t('gameBoard.inspector.noAbilityText')}
      </div>
    </div>
  );

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
          maxWidth: hasFaceDetails ? '980px' : '660px',
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

        {!hasFaceDetails && renderArtworkAndStats(
          resolvedPreviewDetail,
          previewPresentation,
          t('deckBuilder.preview.enlargedAlt', { name: previewCard.name }),
          singlePreviewKind,
          {
            width: '160px',
            maxWidth: '40vw',
            height: '224px',
            borderRadius: '10px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.32)',
            flexShrink: 0,
          }
        )}

        {hasFaceDetails && (
          <section>
            <h2 style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.86rem', margin: '0 0 0.55rem' }}>
              {t('deckBuilder.preview.faces.heading')}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {faceDetails.map(({ face, detail, label }) => {
                const facePresentation = buildCardDetailPresentation(detail);
                const faceKind = getDetailCardKind(detail, previewCard);

                return (
                  <article
                    key={`${face.side}:${detail.name}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                      background: 'rgba(15, 23, 42, 0.72)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '0.7rem',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#93c5fd', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {label}
                      </div>
                      <div style={{ color: '#f8fafc', fontSize: '0.92rem', fontWeight: 800, marginTop: '0.12rem', lineHeight: 1.35 }}>
                        {detail.name}
                      </div>
                      {facePresentation.primaryMeta && (
                        <div style={{ color: '#cbd5e1', fontSize: '0.74rem', marginTop: '0.2rem', lineHeight: 1.4 }}>
                          {facePresentation.primaryMeta}
                        </div>
                      )}
                      {facePresentation.secondaryMeta && (
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.1rem', lineHeight: 1.4 }}>
                          {facePresentation.secondaryMeta}
                        </div>
                      )}
                    </div>
                    {renderArtworkAndStats(
                      detail,
                      facePresentation,
                      t('deckBuilder.preview.faces.imageAlt', { side: label, name: detail.name }),
                      faceKind,
                      {
                        width: '160px',
                        maxWidth: '40vw',
                        height: '224px',
                        borderRadius: '10px',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.32)',
                        flexShrink: 0,
                      }
                    )}
                    {renderAbilityText(detail, '22vh')}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!hasFaceDetails && (
          renderAbilityText(resolvedPreviewDetail, '30vh')
        )}
      </div>
    </div>
  );
};

export default DeckBuilderPreviewModal;
