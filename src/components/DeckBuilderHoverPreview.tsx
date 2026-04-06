import React from 'react';
import CardArtwork from './CardArtwork';
import { getBaseCardType } from '../models/cardClassification';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { CardDetail } from '../utils/cardDetails';

type DeckBuilderHoverPreviewProps = {
  hoveredDeckCard: DeckBuilderCardData;
  hoveredDetail: CardDetail | null;
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

const DeckBuilderHoverPreview: React.FC<DeckBuilderHoverPreviewProps> = ({
  hoveredDeckCard,
  hoveredDetail,
  left,
  top,
  width,
  maxHeight,
}) => (
  <div
    style={{
      position: 'fixed',
      left,
      top,
      zIndex: 2000,
      pointerEvents: 'none',
      background: 'rgba(15, 23, 42, 0.92)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '12px',
      padding: '0.5rem',
      boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
    }}
  >
    <CardArtwork
      image={hoveredDeckCard.image}
      alt={hoveredDeckCard.name}
      detail={hoveredDetail ?? undefined}
      baseCardType={getBaseCardType(hoveredDeckCard.card_kind_normalized)}
      isLeaderCard={hoveredDeckCard.deck_section === 'leader'}
      isTokenCard={hoveredDeckCard.deck_section === 'token' || hoveredDeckCard.is_token}
      isEvolveCard={hoveredDeckCard.is_evolve_card}
      style={{ width: '100%', borderRadius: '10px' }}
      draggable={false}
    />
    <div style={{ marginTop: '0.35rem', color: '#e2e8f0', fontSize: '0.78rem', fontWeight: 700 }}>
      {hoveredDeckCard.name}
    </div>
  </div>
);

export default DeckBuilderHoverPreview;
