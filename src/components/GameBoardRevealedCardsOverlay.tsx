import React from 'react';
import CardArtwork from './CardArtwork';
import type { CardDetailLookup } from '../utils/cardDetails';
import type { PublicCardView } from '../types/sync';

type RevealedCardsOverlay = {
  title: string;
  cards: PublicCardView[];
  summaryLines?: string[];
};

type GameBoardRevealedCardsOverlayProps = {
  overlay: RevealedCardsOverlay;
  cardDetailLookup: CardDetailLookup;
};

const GameBoardRevealedCardsOverlay: React.FC<GameBoardRevealedCardsOverlayProps> = ({
  overlay,
  cardDetailLookup,
}) => (
  <div
    role="status"
    aria-live="polite"
    style={{
      position: 'fixed',
      top: '18%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(3, 7, 18, 0.96)',
      border: '2px solid #14b8a6',
      borderRadius: '16px',
      padding: '1.25rem 1.5rem',
      zIndex: 2100,
      boxShadow: '0 0 30px rgba(20,184,166,0.25)',
      minWidth: '320px',
      maxWidth: '90vw',
    }}
  >
    <div style={{ color: '#99f6e4', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.9rem', textAlign: 'center' }}>
      {overlay.title}
    </div>
    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
      {overlay.cards.map((card) => (
        <div key={`${card.cardId}-${card.name}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', maxWidth: '120px' }}>
          <CardArtwork
            image={cardDetailLookup[card.cardId]?.image || card.image}
            alt={card.name}
            detail={cardDetailLookup[card.cardId]}
            style={{ width: '90px', height: '126px', borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.45)' }}
            draggable={false}
          />
          <div style={{ color: 'white', fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.3 }}>
            {card.name}
          </div>
        </div>
      ))}
    </div>
    {overlay.summaryLines && overlay.summaryLines.length > 0 && (
      <div
        style={{
          marginTop: '1rem',
          paddingTop: '0.9rem',
          borderTop: '1px solid rgba(153, 246, 228, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          alignItems: 'center',
        }}
      >
        {overlay.summaryLines.map((line) => (
          <div
            key={line}
            style={{
              color: '#e2e8f0',
              fontSize: '0.82rem',
              lineHeight: 1.35,
              textAlign: 'center',
              whiteSpace: 'pre-wrap',
            }}
          >
            {line}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default GameBoardRevealedCardsOverlay;
