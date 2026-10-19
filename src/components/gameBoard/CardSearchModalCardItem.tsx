import React from 'react';
import type { CardInstance } from '../Card';
import type { PlayerRole } from '../../types/game';
import {
  resolveSelectedCardFaceDetail,
  type CardDetailLookup,
  type CardFaceSide,
} from '../../utils/card/cardDetails';
import GameBoardDeferredArtwork from './GameBoardDeferredArtwork';
import { useTranslation } from 'react-i18next';

export interface CardSearchModalCardItemProps {
  card: CardInstance;
  cardDetailLookup?: CardDetailLookup;
  scrollRootRef: React.RefObject<HTMLDivElement | null>;
  isSelected: boolean;
  isBulkSelecting: boolean;
  isBulkSelected: boolean;
  isEvolveDeck: boolean;
  isPublicRecoveryZone: boolean;
  isPreparingMainDeckSearch: boolean;
  allowHandExtraction: boolean;
  canEditSearchedEvolveDeck: boolean;
  readOnly: boolean;
  isCoarseInput: boolean;
  viewerRole?: PlayerRole;
  targetRole?: PlayerRole;
  actionRole?: PlayerRole;
  canAddToHand: boolean;
  canRevealToHand: boolean;
  canAddToEx: boolean;
  canPlayToField: boolean;
  canSendToCemetery: boolean;
  canSendToBottom: boolean;
  canBanish: boolean;
  onClick: () => void;
  onPlayToField: () => void;
  onAddToHand: () => void;
  onRevealToHand: () => void;
  onAddToEx: () => void;
  onSendToCemetery: () => void;
  onSendToBottom: () => void;
  onBanish: () => void;
  onToggleFlip?: (cardId: string) => void;
  onSetCardFace?: (cardId: string, faceSide: CardFaceSide) => void;
}

export const CardSearchModalCardItem: React.FC<CardSearchModalCardItemProps> = ({
  card,
  cardDetailLookup = {},
  scrollRootRef,
  isSelected,
  isBulkSelecting,
  isBulkSelected,
  isEvolveDeck,
  isPublicRecoveryZone,
  isPreparingMainDeckSearch,
  allowHandExtraction,
  canEditSearchedEvolveDeck,
  readOnly,
  isCoarseInput,
  viewerRole,
  targetRole,
  actionRole,
  canAddToHand,
  canRevealToHand,
  canAddToEx,
  canPlayToField,
  canSendToCemetery,
  canSendToBottom,
  canBanish,
  onClick,
  onPlayToField,
  onAddToHand,
  onRevealToHand,
  onAddToEx,
  onSendToCemetery,
  onSendToBottom,
  onBanish,
  onToggleFlip,
  onSetCardFace,
}) => {
  const { t } = useTranslation();
  const baseCardDetail = cardDetailLookup[card.cardId];
  const cardDisplayDetail = resolveSelectedCardFaceDetail(baseCardDetail, card.selectedFaceSide) ?? undefined;
  const hasSelectableFaces = Boolean(baseCardDetail?.faces && baseCardDetail.faces.length > 1);
  const selectedFaceSide = card.selectedFaceSide ?? 'front';
  const canSetCardFace = Boolean(onSetCardFace && canEditSearchedEvolveDeck && card.isEvolveCard && card.owner === targetRole && hasSelectableFaces);
  const isUsed = isEvolveDeck && !card.isFlipped;
  const playToFieldLabel = isPreparingMainDeckSearch ? t('gameBoard.modals.search.setFaceDown') : t('gameBoard.modals.search.playToField');
  const isTouchControlsOpen = isCoarseInput && isSelected;

  return (
    <div
      className="search-card-container"
      onClick={onClick}
      style={{
        position: 'relative',
        opacity: isUsed ? 0.6 : 1,
        transition: 'opacity 0.1s',
        cursor: 'pointer',
        outline: (isSelected || isBulkSelected) ? '2px solid #38bdf8' : 'none',
        borderRadius: '6px',
        boxShadow: (isSelected || isBulkSelected) ? '0 0 0 3px rgba(56,189,248,0.18)' : 'none'
      }}
    >
      <GameBoardDeferredArtwork
        scrollRootRef={scrollRootRef}
        image={cardDisplayDetail?.image || card.image}
        alt={card.name}
        detail={cardDisplayDetail}
        baseCardType={card.baseCardType}
        isLeaderCard={card.isLeaderCard}
        isTokenCard={card.isTokenCard}
        isEvolveCard={card.isEvolveCard}
        style={{ width: '100%', borderRadius: '4px', display: 'block', filter: isUsed ? 'grayscale(80%)' : 'none' }}
        draggable={false}
      />

      {isUsed && (
        <div style={{ position: 'absolute', top: 5, left: 5, background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 4px', borderRadius: '4px', pointerEvents: 'none' }}>
          {t('gameBoard.modals.search.used')}
        </div>
      )}
      {isEvolveDeck && !isUsed && (
        <div style={{ position: 'absolute', top: 5, left: 5, background: '#252a34', color: '#949db0', fontSize: '10px', fontWeight: 'bold', border: '1px solid gray', padding: '2px 4px', borderRadius: '4px', pointerEvents: 'none' }}>
          {t('gameBoard.modals.search.unused')}
        </div>
      )}

      {isBulkSelecting && (
        <div
          style={{
            position: 'absolute',
            top: 5,
            right: 5,
            width: '22px',
            height: '22px',
            borderRadius: '999px',
            background: isBulkSelected ? '#38bdf8' : 'rgba(15, 23, 42, 0.92)',
            border: `1px solid ${isBulkSelected ? '#38bdf8' : 'rgba(255,255,255,0.28)'}`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            pointerEvents: 'none'
          }}
        >
          {isBulkSelected ? '✓' : ''}
        </div>
      )}

      {!isBulkSelecting && !readOnly && (card.owner === viewerRole || isPublicRecoveryZone) && (
        <div
          className="modal-card-controls"
          data-testid={`search-card-controls-${card.id}`}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', gap: '4px',
            borderRadius: '4px', padding: '6px',
            transition: 'opacity 0.15s ease',
            opacity: isCoarseInput ? (isTouchControlsOpen ? 1 : 0) : undefined,
            pointerEvents: isCoarseInput ? (isTouchControlsOpen ? 'auto' : 'none') : undefined,
          }}
        >
          {canPlayToField && actionRole && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onPlayToField();
              }}
              style={{
                width: '100%', background: '#3b82f6', color: 'white', border: 'none',
                padding: '3px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {playToFieldLabel}
            </button>
          )}
          {canAddToHand && actionRole && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onAddToHand();
              }}
              disabled={!allowHandExtraction}
              style={{
                width: '100%', background: allowHandExtraction ? '#10b981' : '#374151', color: allowHandExtraction ? 'white' : '#949db0', border: 'none',
                padding: '3px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                cursor: allowHandExtraction ? 'pointer' : 'not-allowed'
              }}
            >
              {t('gameBoard.modals.search.addToHand')}
            </button>
          )}
          {canRevealToHand && actionRole && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onRevealToHand();
              }}
              disabled={!allowHandExtraction}
              style={{
                width: '100%', background: allowHandExtraction ? '#14b8a6' : '#374151', color: allowHandExtraction ? 'white' : '#949db0', border: 'none',
                padding: '3px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                cursor: allowHandExtraction ? 'pointer' : 'not-allowed'
              }}
            >
              {t('gameBoard.modals.search.revealAndAddToHand')}
            </button>
          )}
          {canAddToEx && actionRole && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onAddToEx();
              }}
              disabled={!allowHandExtraction}
              style={{
                width: '100%', background: allowHandExtraction ? '#a855f7' : '#374151', color: allowHandExtraction ? 'white' : '#949db0', border: 'none',
                padding: '3px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                cursor: allowHandExtraction ? 'pointer' : 'not-allowed'
              }}
            >
              {t('gameBoard.modals.search.addToEx')}
            </button>
          )}
          {canSendToCemetery && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onSendToCemetery();
              }}
              style={{
                width: '100%', background: '#7c3aed', color: 'white', border: 'none',
                padding: '3px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {t('gameBoard.card.quickActionDescriptions.cemetery')}
            </button>
          )}
          {canSendToBottom && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onSendToBottom();
              }}
              style={{
                width: '100%', background: '#475569', color: 'white', border: 'none',
                padding: '3px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {t('gameBoard.card.quickActionDescriptions.sendToBottom')}
            </button>
          )}
          {canBanish && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onBanish();
              }}
              style={{
                width: '100%', background: '#dc2626', color: 'white', border: 'none',
                padding: '3px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {t('gameBoard.card.quickActionDescriptions.banish')}
            </button>
          )}

          {onToggleFlip && card.isEvolveCard && card.owner === viewerRole && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggleFlip(card.id);
              }}
              style={{
                width: '100%', background: '#4b5563', color: 'white', border: '1px solid #9ca3af',
                padding: '3px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                cursor: 'pointer', marginTop: '2px'
              }}
            >
              {card.isFlipped ? t('gameBoard.modals.search.setUsed') : t('gameBoard.modals.search.setUnused')}
            </button>
          )}
          {canSetCardFace && (
            <div
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '3px',
                marginTop: '2px',
              }}
            >
              {(['front', 'back'] as const).map((faceSide) => {
                const isFaceSelected = selectedFaceSide === faceSide;
                return (
                  <button
                    key={faceSide}
                    type="button"
                    aria-pressed={isFaceSelected}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetCardFace?.(card.id, faceSide);
                    }}
                    style={{
                      background: isFaceSelected ? '#f59e0b' : '#334155',
                      color: isFaceSelected ? '#111827' : 'white',
                      border: isFaceSelected ? '1px solid #fbbf24' : '1px solid #64748b',
                      padding: '3px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    {t(`gameBoard.modals.search.face.${faceSide}`)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CardSearchModalCardItem;
