import React from 'react';
import { useTranslation } from 'react-i18next';
import CardArtwork from './CardArtwork';
import type { CardDetailLookup } from '../utils/cardDetails';
import type { TokenOption } from '../types/game';

type GameBoardTokenSpawnDialogProps = {
  tokenSpawnOptions: TokenOption[];
  tokenSpawnCounts: Record<string, number>;
  tokenSpawnDestination: 'ex' | 'field';
  totalTokenSpawnCount: number;
  cardDetailLookup: CardDetailLookup;
  onDestinationChange: (destination: 'ex' | 'field') => void;
  onCountChange: (cardId: string, delta: number) => void;
  onQuickSpawnToken?: (cardId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const GameBoardTokenSpawnDialog: React.FC<GameBoardTokenSpawnDialogProps> = ({
  tokenSpawnOptions,
  tokenSpawnCounts,
  tokenSpawnDestination,
  totalTokenSpawnCount,
  cardDetailLookup,
  onDestinationChange,
  onCountChange,
  onQuickSpawnToken,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4500,
        padding: '1rem',
        overflowY: 'auto',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('gameBoard.modals.tokenSpawn.title')}
        data-testid="token-spawn-dialog"
        style={{
          background: 'var(--bg-surface)',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          width: 'min(980px, 94vw)',
          maxHeight: 'min(88vh, 960px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <h3 style={{ marginBottom: '1rem', color: 'white', textAlign: 'center' }}>{t('gameBoard.modals.tokenSpawn.title')}</h3>
        <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {t('gameBoard.modals.tokenSpawn.description')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', alignSelf: 'center' }}>
            {t('gameBoard.modals.tokenSpawn.destinationLabel')}
          </span>
          {(['ex', 'field'] as const).map((destination) => {
            const isSelected = tokenSpawnDestination === destination;
            return (
              <button
                key={destination}
                type="button"
                onClick={() => onDestinationChange(destination)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '999px',
                  border: `1px solid ${isSelected ? 'rgba(103, 232, 249, 0.7)' : 'var(--border-light)'}`,
                  background: isSelected ? 'rgba(103, 232, 249, 0.16)' : 'var(--bg-overlay)',
                  color: isSelected ? '#67e8f9' : 'var(--text-main)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {destination === 'ex'
                  ? t('gameBoard.modals.tokenSpawn.destinations.ex')
                  : t('gameBoard.modals.tokenSpawn.destinations.field')}
              </button>
            );
          })}
        </div>
        <div
          data-testid="token-spawn-options"
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '1.5rem',
            overflowY: 'auto',
            minHeight: 0,
            paddingRight: '0.25rem',
          }}
        >
          {tokenSpawnOptions.map((token) => {
            const count = tokenSpawnCounts[token.cardId] ?? 0;
            return (
              <div
                key={`${token.cardId}-${token.name}`}
                style={{
                  width: '140px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  padding: '0.6rem',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                {onQuickSpawnToken ? (
                  <button
                    type="button"
                    onClick={() => onQuickSpawnToken(token.cardId)}
                    aria-label={token.name}
                    style={{
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      borderRadius: '6px',
                    }}
                  >
                    <CardArtwork
                      image={token.image}
                      alt={token.name}
                      detail={cardDetailLookup[token.cardId]}
                      baseCardType={token.baseCardType}
                      isTokenCard={true}
                      style={{ width: '100px', height: '140px', borderRadius: '6px' }}
                      draggable={false}
                    />
                  </button>
                ) : (
                  <CardArtwork
                    image={token.image}
                    alt={token.name}
                    detail={cardDetailLookup[token.cardId]}
                    baseCardType={token.baseCardType}
                    isTokenCard={true}
                    style={{ width: '100px', height: '140px', borderRadius: '6px' }}
                    draggable={false}
                  />
                )}
                <span style={{ fontSize: '0.78rem', lineHeight: 1.35, textAlign: 'center' }}>{token.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    onClick={() => onCountChange(token.cardId, -1)}
                    disabled={count === 0}
                    aria-label={t('gameBoard.modals.tokenSpawn.decrease', { token: token.name })}
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '999px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-overlay)',
                      color: 'var(--text-main)',
                      cursor: count === 0 ? 'not-allowed' : 'pointer',
                      opacity: count === 0 ? 0.55 : 1,
                      fontWeight: 700,
                    }}
                  >
                    -
                  </button>
                  <span style={{ minWidth: '1.8rem', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
                    {count}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCountChange(token.cardId, 1)}
                    disabled={count >= 5}
                    aria-label={t('gameBoard.modals.tokenSpawn.increase', { token: token.name })}
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '999px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-overlay)',
                      color: 'var(--text-main)',
                      cursor: count >= 5 ? 'not-allowed' : 'pointer',
                      opacity: count >= 5 ? 0.55 : 1,
                      fontWeight: 700,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginTop: 'auto',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {t('gameBoard.modals.tokenSpawn.totalSelected', { count: totalTokenSpawnCount })}
          </span>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button
              onClick={onCancel}
              style={{ padding: '0.5rem 1.5rem', background: '#333', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
            >
              {t('common.buttons.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={totalTokenSpawnCount === 0}
              style={{
                padding: '0.5rem 1.5rem',
                background: totalTokenSpawnCount === 0 ? 'rgba(56, 189, 248, 0.45)' : '#0ea5e9',
                color: 'white',
                borderRadius: '4px',
                cursor: totalTokenSpawnCount === 0 ? 'not-allowed' : 'pointer',
                border: 'none',
                fontWeight: 700,
              }}
            >
              {t('gameBoard.modals.tokenSpawn.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoardTokenSpawnDialog;
