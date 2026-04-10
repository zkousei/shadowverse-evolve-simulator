import React from 'react';
import type { CardInstance } from './Card';
import type { PlayerRole } from '../types/game';
import { formatAbilityText, type CardDetailLookup } from '../utils/cardDetails';
import { normalizeBaseCardType, type RuntimeBaseCardType } from '../utils/cardType';
import CardArtwork from './CardArtwork';
import { useTranslation } from 'react-i18next';

interface CardSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cards: CardInstance[];
  cardDetailLookup?: CardDetailLookup;
  onExtractCard: (cardId: string, destination?: string, revealToOpponent?: boolean) => void;
  onSendToBottom?: (cardId: string) => void;
  onToggleFlip?: (cardId: string) => void;
  viewerRole?: PlayerRole;
  targetRole?: PlayerRole;
  zoneId?: string;
  allowHandExtraction?: boolean;
  readOnly?: boolean;
}

type SearchTypeCounts = Record<RuntimeBaseCardType, number>;

const CardSearchModal: React.FC<CardSearchModalProps> = ({
  isOpen,
  onClose,
  title,
  cards,
  cardDetailLookup = {},
  onExtractCard,
  onSendToBottom,
  onToggleFlip,
  viewerRole,
  targetRole,
  zoneId,
  allowHandExtraction = true,
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null);
  const [reserveDetailSpace, setReserveDetailSpace] = React.useState(false);
  const modalPanelRef = React.useRef<HTMLDivElement | null>(null);
  const detailPopoverRef = React.useRef<HTMLDivElement | null>(null);
  const cardGridRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedCardId(null);
      return;
    }

    if (selectedCardId && !cards.some(card => card.id === selectedCardId)) {
      setSelectedCardId(null);
    }
  }, [cards, isOpen, selectedCardId]);

  React.useEffect(() => {
    if (!isOpen || !selectedCardId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (detailPopoverRef.current?.contains(target)) return;
      if (target.closest('.search-card-container')) return;
      if (!modalPanelRef.current?.contains(target)) return;

      setSelectedCardId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isOpen, selectedCardId]);

  React.useEffect(() => {
    if (!isOpen || !selectedCardId) {
      setReserveDetailSpace(false);
      return;
    }

    const measureScrollRoom = () => {
      const grid = cardGridRef.current;
      if (!grid) return;

      setReserveDetailSpace(grid.scrollHeight > grid.clientHeight + 4);
    };

    measureScrollRoom();
    window.addEventListener('resize', measureScrollRoom);

    return () => window.removeEventListener('resize', measureScrollRoom);
  }, [cards.length, isOpen, selectedCardId]);

  if (!isOpen) return null;

  // Search behavior must key off the structural zone id, not the localized
  // modal title, otherwise i18n changes can alter which actions are allowed.
  const sourceZonePrefix = zoneId?.split('-')[0] ?? null;
  const isMainDeckSearch = sourceZonePrefix === 'mainDeck';
  const isPreparingMainDeckSearch = !allowHandExtraction && isMainDeckSearch;
  const isEvolveDeck = sourceZonePrefix === 'evolveDeck';
  const shouldShowTypeCounts = sourceZonePrefix === 'cemetery' || sourceZonePrefix === 'mainDeck';
  const isPublicRecoveryZone = sourceZonePrefix === 'cemetery' || sourceZonePrefix === 'banish';
  const searchTypeCounts = shouldShowTypeCounts
    ? cards.reduce<SearchTypeCounts>((counts, card) => {
      const cardDetail = cardDetailLookup[card.cardId];
      const baseCardType = card.baseCardType
        ?? normalizeBaseCardType(card.cardKindNormalized)
        ?? normalizeBaseCardType(cardDetail?.cardKindNormalized)
        ?? normalizeBaseCardType(cardDetail?.type);

      if (baseCardType) {
        counts[baseCardType] += 1;
      }

      return counts;
    }, { follower: 0, spell: 0, amulet: 0 })
    : null;
  const searchTypeCountLabel = shouldShowTypeCounts
    ? t('gameBoard.modals.search.typeCounts', searchTypeCounts ?? undefined)
    : null;
  const actionRole = targetRole ?? viewerRole;
  const selectedCard = selectedCardId ? cards.find(card => card.id === selectedCardId) ?? null : null;
  const selectedCardDetail = selectedCard ? cardDetailLookup[selectedCard.cardId] : null;
  const selectedCardMeta = [
    selectedCardDetail?.className,
    selectedCardDetail?.title
  ].filter(Boolean).join(' / ');
  const selectedCardType = [
    selectedCardDetail?.type,
    selectedCardDetail?.subtype
  ].filter(Boolean).join(' / ');
  const selectedCardStats = selectedCardDetail && selectedCardDetail.atk !== null && selectedCardDetail.hp !== null
    ? `${selectedCardDetail.atk} / ${selectedCardDetail.hp}`
    : null;

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000,
        padding: '2rem'
      }}
    >
      <div
        ref={modalPanelRef}
        data-testid="search-card-modal-panel"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          backgroundColor: '#1a1d24',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(0,0,0,0.5)',
        position: 'relative'
      }}
    >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h2 className="Garamond" style={{ margin: 0 }}>{title} ({cards.length})</h2>
            {searchTypeCountLabel && (
              <div
                data-testid="search-card-type-counts"
                style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}
              >
                {searchTypeCountLabel}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {t('common.buttons.close')}
          </button>
        </div>

        <div
          ref={cardGridRef}
          data-testid="search-card-grid"
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '1rem',
            paddingBottom: selectedCard && reserveDetailSpace ? '11rem' : '1.5rem'
          }}
        >
          {cards.map(c => {
            const isUsed = isEvolveDeck && !c.isFlipped;
            const canAddToHand = !isPreparingMainDeckSearch && c.owner === viewerRole && !c.isEvolveCard;
            const canRevealToHand = canAddToHand && isMainDeckSearch;
            const canAddToEx = !isPreparingMainDeckSearch && !c.isEvolveCard;
            const canPlayToField = !isEvolveDeck || allowHandExtraction || isPreparingMainDeckSearch;
            const playToFieldLabel = isPreparingMainDeckSearch ? t('gameBoard.modals.search.setFaceDown') : t('gameBoard.modals.search.playToField');

            return (
              <div
                key={c.id}
                className="search-card-container"
                onClick={() => setSelectedCardId(current => current === c.id ? null : c.id)}
                style={{
                  position: 'relative',
                  opacity: isUsed ? 0.6 : 1,
                  transition: 'opacity 0.1s',
                  cursor: 'pointer',
                  outline: selectedCardId === c.id ? '2px solid #38bdf8' : 'none',
                  borderRadius: '6px',
                  boxShadow: selectedCardId === c.id ? '0 0 0 3px rgba(56,189,248,0.18)' : 'none'
                }}
              >
                <CardArtwork
                  image={c.image}
                  alt={c.name}
                  detail={cardDetailLookup[c.cardId]}
                  baseCardType={c.baseCardType}
                  isLeaderCard={c.isLeaderCard}
                  isTokenCard={c.isTokenCard}
                  isEvolveCard={c.isEvolveCard}
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

                {!readOnly && (c.owner === viewerRole || isPublicRecoveryZone) && (
                  <div
                    className="modal-card-controls"
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
                      justifyContent: 'center', alignItems: 'center', gap: '4px',
                      borderRadius: '4px', padding: '6px'
                    }}
                  >
                    {canPlayToField && actionRole && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onExtractCard(c.id, `field-${actionRole}`);
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
                          onExtractCard(c.id, `hand-${actionRole}`);
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
                          onExtractCard(c.id, `hand-${actionRole}`, true);
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
                          onExtractCard(c.id, `ex-${actionRole}`);
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
                    {onSendToBottom && isPublicRecoveryZone && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onSendToBottom(c.id);
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

                    {onToggleFlip && c.isEvolveCard && c.owner === viewerRole && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleFlip(c.id);
                        }}
                        style={{
                          width: '100%', background: '#4b5563', color: 'white', border: '1px solid #9ca3af',
                          padding: '3px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                          cursor: 'pointer', marginTop: '2px'
                        }}
                      >
                        {c.isFlipped ? t('gameBoard.modals.search.setUsed') : t('gameBoard.modals.search.setUnused')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {cards.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              {t('gameBoard.modals.search.empty')}
            </div>
          )}
        </div>

        {selectedCard && (
          <div
            data-testid="search-card-detail-popover"
            ref={detailPopoverRef}
            style={{
              position: 'absolute',
              right: '1rem',
              bottom: '1rem',
              width: 'min(320px, calc(100% - 2rem))',
              maxHeight: '190px',
              overflowY: 'auto',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              boxShadow: '0 14px 28px rgba(0,0,0,0.45)',
              padding: '0.8rem',
              zIndex: 2
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.45rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.35 }}>
                  {selectedCardDetail?.name || selectedCard.name}
                </div>
                {selectedCardMeta && (
                  <div style={{ color: '#cbd5e1', fontSize: '0.68rem', marginTop: '0.12rem', lineHeight: 1.4 }}>
                    {selectedCardMeta}
                  </div>
                )}
                {selectedCardType && (
                  <div style={{ color: '#94a3b8', fontSize: '0.66rem', marginTop: '0.08rem', lineHeight: 1.4 }}>
                    {selectedCardType}
                  </div>
                )}
                {selectedCardStats && (
                  <div style={{ color: '#e2e8f0', fontSize: '0.68rem', marginTop: '0.12rem', lineHeight: 1.4 }}>
                    {t('gameBoard.modals.search.stats')}: {selectedCardStats}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedCardId(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  padding: '0.12rem 0.45rem',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontSize: '0.68rem',
                  fontWeight: 'bold'
                }}
              >
                {t('common.buttons.close')}
              </button>
            </div>

            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '0.5rem',
              whiteSpace: 'pre-wrap',
              color: '#e5e7eb',
              fontSize: '0.74rem',
              lineHeight: 1.55
            }}>
              {selectedCardDetail?.abilityText
                ? formatAbilityText(selectedCardDetail.abilityText)
                : t('gameBoard.modals.search.noDetailText')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardSearchModal;
