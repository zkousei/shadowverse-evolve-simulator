import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CardInstance } from './Card';
import CardArtwork from './CardArtwork';
import {
  formatAbilityText,
  type CardDetail,
  type CardDetailPresentation,
} from '../utils/cardDetails';

type GameBoardCardInspectorProps = {
  selectedInspectorCard: CardInstance;
  selectedInspectorDetail?: CardDetail | null;
  inspectorPresentation: CardDetailPresentation;
  inspectorPopoverStyle: React.CSSProperties;
  onClose: () => void;
};

const GameBoardCardInspector = React.forwardRef<HTMLDivElement, GameBoardCardInspectorProps>(
  ({
    selectedInspectorCard,
    selectedInspectorDetail,
    inspectorPresentation,
    inspectorPopoverStyle,
    onClose,
  }, ref) => {
    const { t } = useTranslation();

    return (
      <div
        data-testid="card-inspector"
        ref={ref}
        style={inspectorPopoverStyle}
      >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.75rem' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.35 }}>
            {selectedInspectorDetail?.name || selectedInspectorCard.name}
          </div>
          {inspectorPresentation.primaryMeta && (
            <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: '0.18rem', lineHeight: 1.45 }}>
              {inspectorPresentation.primaryMeta}
            </div>
          )}
          {inspectorPresentation.secondaryMeta && (
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.1rem', lineHeight: 1.45 }}>
              {inspectorPresentation.secondaryMeta}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(15, 23, 42, 0.9)',
            color: 'white',
            borderRadius: '999px',
            cursor: 'pointer',
            padding: '0.18rem 0.55rem',
            fontSize: '0.74rem',
            fontWeight: 'bold',
          }}
        >
          {t('gameBoard.inspector.close')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
        <CardArtwork
          image={selectedInspectorDetail?.image || selectedInspectorCard.image}
          alt={selectedInspectorDetail?.name || selectedInspectorCard.name}
          detail={selectedInspectorDetail ?? undefined}
          baseCardType={selectedInspectorCard.baseCardType}
          isLeaderCard={selectedInspectorCard.isLeaderCard}
          isTokenCard={selectedInspectorCard.isTokenCard}
          isEvolveCard={selectedInspectorCard.isEvolveCard}
          style={{
            width: '92px',
            height: '128px',
            objectFit: 'cover',
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.32)',
            flexShrink: 0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '0.16rem 0.45rem', color: '#e2e8f0', fontSize: '0.76rem' }}>
            <span style={{ color: '#94a3b8' }}>{t('gameBoard.inspector.id')}</span>
            <span>{selectedInspectorCard.cardId}</span>
            <span style={{ color: '#94a3b8' }}>{t('gameBoard.inspector.cost')}</span>
            <span>{selectedInspectorDetail?.cost || '-'}</span>
            {inspectorPresentation.stats && (
              <>
                <span style={{ color: '#94a3b8' }}>{t('gameBoard.inspector.stats')}</span>
                <span>{inspectorPresentation.stats}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
        <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.45rem' }}>
          {t('gameBoard.inspector.abilityText')}
        </div>
        <div style={{
          whiteSpace: 'pre-wrap',
          color: '#e5e7eb',
          fontSize: '0.78rem',
          lineHeight: 1.65,
          background: 'rgba(15, 23, 42, 0.76)',
          borderRadius: '10px',
          padding: '0.75rem',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {selectedInspectorDetail?.abilityText
            ? formatAbilityText(selectedInspectorDetail.abilityText)
            : t('gameBoard.inspector.noAbilityText')}
        </div>
      </div>
    </div>
    );
  }
);

GameBoardCardInspector.displayName = 'GameBoardCardInspector';

export default GameBoardCardInspector;
