import React from 'react';
import { useTranslation } from 'react-i18next';
import CardArtwork from './CardArtwork';
import {
  buildCardDetailPresentation,
  formatAbilityText,
  type CardDetail,
  type CardFaceDetail,
} from '../utils/cardDetails';
import type { CardInstance } from './Card';

type GameBoardCardFacePreviewProps = {
  card: CardInstance;
  detail: CardDetail;
  showArtwork?: boolean;
  compact?: boolean;
};

const getFaceLabelKey = (side: CardFaceDetail['side']) => (
  side === 'back' ? 'gameBoard.modals.search.face.back' : 'gameBoard.modals.search.face.front'
);

const GameBoardCardFacePreview: React.FC<GameBoardCardFacePreviewProps> = ({
  card,
  detail,
  showArtwork = false,
  compact = false,
}) => {
  const { t } = useTranslation();
  const faces = detail.faces ?? [];

  if (faces.length <= 1) return null;

  return (
    <div
      data-testid="game-board-card-face-preview"
      style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: compact ? '0.55rem' : '0.75rem',
      }}
    >
      {faces.map(face => {
        const presentation = buildCardDetailPresentation(face);
        return (
          <article
            key={face.side}
            style={{
              background: 'rgba(15, 23, 42, 0.72)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: compact ? '9px' : '12px',
              padding: compact ? '0.55rem' : '0.7rem',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', gap: compact ? '0.5rem' : '0.65rem', alignItems: 'flex-start' }}>
              {showArtwork && (
                <CardArtwork
                  image={face.image || card.image}
                  alt={face.name}
                  detail={face}
                  baseCardType={card.baseCardType}
                  isLeaderCard={card.isLeaderCard}
                  isTokenCard={card.isTokenCard}
                  isEvolveCard={card.isEvolveCard}
                  style={{
                    width: '72px',
                    height: '101px',
                    objectFit: 'cover',
                    borderRadius: '7px',
                    boxShadow: '0 8px 18px rgba(0,0,0,0.28)',
                    flexShrink: 0,
                  }}
                  draggable={false}
                />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: '#fbbf24', fontSize: compact ? '0.64rem' : '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t(getFaceLabelKey(face.side))}
                </div>
                <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: compact ? '0.78rem' : '0.88rem', lineHeight: 1.35, marginTop: '0.16rem' }}>
                  {face.name}
                </div>
                {presentation.primaryMeta && (
                  <div style={{ color: '#cbd5e1', fontSize: compact ? '0.64rem' : '0.7rem', marginTop: '0.12rem', lineHeight: 1.4 }}>
                    {presentation.primaryMeta}
                  </div>
                )}
                {presentation.secondaryMeta && (
                  <div style={{ color: '#94a3b8', fontSize: compact ? '0.62rem' : '0.68rem', marginTop: '0.08rem', lineHeight: 1.4 }}>
                    {presentation.secondaryMeta}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: '0.1rem 0.4rem', marginTop: '0.38rem', color: '#e2e8f0', fontSize: compact ? '0.64rem' : '0.7rem' }}>
                  <span style={{ color: '#94a3b8' }}>{t('gameBoard.inspector.cost')}</span>
                  <span>{face.cost || '-'}</span>
                  {presentation.stats && (
                    <>
                      <span style={{ color: '#94a3b8' }}>{t('gameBoard.inspector.stats')}</span>
                      <span>{presentation.stats}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: compact ? '0.45rem' : '0.6rem' }}>
              <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: compact ? '0.68rem' : '0.76rem', marginBottom: '0.3rem' }}>
                {t('gameBoard.inspector.abilityText')}
              </div>
              <div style={{
                whiteSpace: 'pre-wrap',
                color: '#e5e7eb',
                fontSize: compact ? '0.66rem' : '0.72rem',
                lineHeight: compact ? 1.48 : 1.58,
              }}>
                {face.abilityText ? formatAbilityText(face.abilityText) : t('gameBoard.inspector.noAbilityText')}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default GameBoardCardFacePreview;
