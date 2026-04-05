import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CardInstance } from './Card';
import CardArtwork from './CardArtwork';
import type { CardDetailLookup } from '../utils/cardDetails';

type GameBoardEvolveAutoAttachDialogProps = {
  sourceCard: CardInstance;
  candidateCards: CardInstance[];
  cardDetailLookup: CardDetailLookup;
  onBackdropClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCancel: () => void;
  onConfirm: (cardId: string) => void;
};

const GameBoardEvolveAutoAttachDialog: React.FC<GameBoardEvolveAutoAttachDialogProps> = ({
  sourceCard,
  candidateCards,
  cardDetailLookup,
  onBackdropClick,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="presentation"
      data-testid="evolve-auto-attach-backdrop"
      onClick={onBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.84)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 4600,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('gameBoard.modals.evolveAutoAttach.title')}
        onClick={(event) => event.stopPropagation()}
        className="glass-panel"
        style={{
          width: 'min(860px, calc(100vw - 32px))',
          maxHeight: 'min(82vh, 760px)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>{t('gameBoard.modals.evolveAutoAttach.title')}</h3>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {t('gameBoard.modals.evolveAutoAttach.description', { card: sourceCard.name })}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            {t('common.buttons.cancel')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{
            width: '160px',
            background: 'rgba(15, 23, 42, 0.48)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            flexShrink: 0,
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {t('gameBoard.modals.evolveAutoAttach.playingCard')}
            </div>
            <CardArtwork
              image={sourceCard.image}
              alt={sourceCard.name}
              detail={cardDetailLookup[sourceCard.cardId]}
              baseCardType={sourceCard.baseCardType}
              isEvolveCard={sourceCard.isEvolveCard}
              style={{ width: '100%', aspectRatio: '5 / 7', borderRadius: '10px', objectFit: 'cover' }}
              draggable={false}
            />
            <div style={{ color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.4 }}>
              {sourceCard.name}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              {t('gameBoard.modals.evolveAutoAttach.selectTarget')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              {candidateCards.map((candidateCard) => (
                <button
                  key={candidateCard.id}
                  type="button"
                  onClick={() => onConfirm(candidateCard.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '14px',
                    border: '1px solid rgba(103, 232, 249, 0.24)',
                    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.76), rgba(15, 23, 42, 0.58))',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <CardArtwork
                    image={candidateCard.image}
                    alt={candidateCard.name}
                    detail={cardDetailLookup[candidateCard.cardId]}
                    baseCardType={candidateCard.baseCardType}
                    style={{ width: '64px', height: '90px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                    draggable={false}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, lineHeight: 1.35 }}>
                      {candidateCard.name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '0.3rem' }}>
                      {candidateCard.cardId}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoardEvolveAutoAttachDialog;
