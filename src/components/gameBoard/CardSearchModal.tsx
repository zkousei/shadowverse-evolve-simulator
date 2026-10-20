import React from 'react';
import type { CardInstance } from '../Card';
import type { PlayerRole } from '../../types/game';
import { resolveSelectedCardFaceDetail, type CardDetailLookup, type CardFaceSide } from '../../utils/card/cardDetails';
import { useTranslation } from 'react-i18next';
import { useGameBoardInputProfile } from '../../contexts/gameBoardInputProfileContext';
import { useCardSearchModalFilter, type SearchSortMode } from './useCardSearchModalFilter';
import CardSearchModalDetailContent from './CardSearchModalDetailContent';
import CardSearchModalBulkActionBar from './CardSearchModalBulkActionBar';
import CardSearchModalCardItem from './CardSearchModalCardItem';

export interface CardSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cards: CardInstance[];
  cardDetailLookup?: CardDetailLookup;
  onExtractCard: (cardId: string, destination?: string, revealToOpponent?: boolean) => void;
  onExtractCards?: (cardIds: string[], destination?: string, revealToOpponent?: boolean) => void;
  onSendToBottom?: (cardId: string) => void;
  onSendCardsToBottom?: (cardIds: string[]) => void;
  onSendToCemetery?: (cardId: string) => void;
  onSendCardsToCemetery?: (cardIds: string[]) => void;
  onBanish?: (cardId: string) => void;
  onBanishCards?: (cardIds: string[]) => void;
  onToggleFlip?: (cardId: string) => void;
  onSetCardFace?: (cardId: string, faceSide: CardFaceSide) => void;
  canEditSearchedEvolveDeck?: boolean;
  viewerRole?: PlayerRole;
  targetRole?: PlayerRole;
  zoneId?: string;
  allowHandExtraction?: boolean;
  readOnly?: boolean;
  onRequestMainDeckShuffleConfirm?: (targetRole: PlayerRole) => void;
}

const CardSearchModal: React.FC<CardSearchModalProps> = ({
  isOpen,
  onClose,
  title,
  cards,
  cardDetailLookup = {},
  onExtractCard,
  onExtractCards,
  onSendToBottom,
  onSendCardsToBottom,
  onSendToCemetery,
  onSendCardsToCemetery,
  onBanish,
  onBanishCards,
  onToggleFlip,
  onSetCardFace,
  canEditSearchedEvolveDeck = false,
  viewerRole,
  targetRole,
  zoneId,
  allowHandExtraction = true,
  readOnly = false,
  onRequestMainDeckShuffleConfirm,
}) => {
  const { t } = useTranslation();
  const inputProfile = useGameBoardInputProfile();
  const isCoarseInput = inputProfile === 'coarse';
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null);
  const [isBulkSelecting, setIsBulkSelecting] = React.useState(false);
  const [bulkSelectedCardIds, setBulkSelectedCardIds] = React.useState<string[]>([]);
  const [reserveDetailSpace, setReserveDetailSpace] = React.useState(false);
  const modalPanelRef = React.useRef<HTMLDivElement | null>(null);
  const detailPopoverRef = React.useRef<HTMLDivElement | null>(null);
  const cardGridRef = React.useRef<HTMLDivElement | null>(null);

  const {
    sortMode,
    setSortMode,
    visibleCards,
    sourceZonePrefix,
    isMainDeckSearch,
    isPreparingMainDeckSearch,
    isEvolveDeck,
    isPublicRecoveryZone,
    canSortCards,
    supportsBulkSelection,
    searchTypeCountLabel,
  } = useCardSearchModalFilter({
    cards,
    cardDetailLookup,
    isOpen,
    zoneId,
    allowHandExtraction,
    readOnly,
  });

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedCardId(null);
      setIsBulkSelecting(false);
      setBulkSelectedCardIds([]);
      return;
    }

    if (selectedCardId && !cards.some(card => card.id === selectedCardId)) {
      setSelectedCardId(null);
    }
  }, [cards, isOpen, selectedCardId]);

  React.useEffect(() => {
    if (!isOpen) return;

    setBulkSelectedCardIds(current => current.filter(cardId => cards.some(card => card.id === cardId)));
  }, [cards, isOpen]);

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
    if (!isOpen || !selectedCardId || isCoarseInput) {
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
  }, [cards.length, isCoarseInput, isOpen, selectedCardId]);

  const actionRole = targetRole ?? viewerRole;
  const bulkSelectedCards = cards.filter(card => bulkSelectedCardIds.includes(card.id));
  const selectedCard = selectedCardId ? cards.find(card => card.id === selectedCardId) ?? null : null;
  const selectedCardDetail = selectedCard
    ? resolveSelectedCardFaceDetail(cardDetailLookup[selectedCard.cardId], selectedCard.selectedFaceSide)
    : null;
  const selectedCardHasFaces = Boolean(selectedCardDetail?.faces && selectedCardDetail.faces.length > 1);
  const shouldShowDetailPopover = Boolean(selectedCard && !isBulkSelecting && !isCoarseInput);
  const shouldShowCoarseDetailPane = isCoarseInput && !isBulkSelecting;

  const canAddCardToHand = (card: CardInstance) => (
    !isPreparingMainDeckSearch && card.owner === viewerRole && !card.isEvolveCard
  );

  const canRevealCardToHand = (card: CardInstance) => (
    canAddCardToHand(card) && isMainDeckSearch
  );

  const canAddCardToEx = (card: CardInstance) => (
    !isPreparingMainDeckSearch && !card.isEvolveCard
  );

  const canPlayCardToField = () => (
    !isEvolveDeck || allowHandExtraction || isPreparingMainDeckSearch
  );

  const canSendCardToBottom = () => (
    Boolean((onSendCardsToBottom || onSendToBottom) && isPublicRecoveryZone)
  );

  const canSendCardToCemetery = (card: CardInstance) => (
    Boolean(
      (onSendCardsToCemetery || onSendToCemetery) &&
      (
        (isMainDeckSearch && !isPreparingMainDeckSearch && card.owner === viewerRole) ||
        sourceZonePrefix === 'banish'
      )
    )
  );

  const canBanishCard = () => (
    Boolean((onBanishCards || onBanish) && sourceZonePrefix === 'cemetery')
  );

  const toggleBulkCardSelection = (cardId: string) => {
    setBulkSelectedCardIds(current => (
      current.includes(cardId)
        ? current.filter(id => id !== cardId)
        : [...current, cardId]
    ));
  };

  const selectedCountLabel = t('gameBoard.modals.search.bulkSelectedCount', { count: bulkSelectedCardIds.length });
  const selectedBulkCardCount = bulkSelectedCards.length;
  const canBulkPlayToField = Boolean(actionRole) && selectedBulkCardCount > 0 && bulkSelectedCards.every(canPlayCardToField);
  const canBulkAddToHand = Boolean(actionRole) && selectedBulkCardCount > 0 && bulkSelectedCards.every(canAddCardToHand);
  const canBulkRevealToHand = Boolean(actionRole) && selectedBulkCardCount > 0 && bulkSelectedCards.every(canRevealCardToHand);
  const canBulkAddToEx = Boolean(actionRole) && selectedBulkCardCount > 0 && bulkSelectedCards.every(canAddCardToEx);
  const canBulkSendToBottom = selectedBulkCardCount > 0 && bulkSelectedCards.every(canSendCardToBottom);
  const canBulkSendToCemetery = selectedBulkCardCount > 0 && bulkSelectedCards.every(canSendCardToCemetery);
  const canBulkBanish = selectedBulkCardCount > 0 && bulkSelectedCards.every(canBanishCard);

  if (!isOpen) return null;

  const requestMainDeckShuffleConfirm = () => {
    if (sourceZonePrefix !== 'mainDeck') return;
    const shuffleTargetRole = targetRole ?? viewerRole;
    if (!shuffleTargetRole) return;

    onRequestMainDeckShuffleConfirm?.(shuffleTargetRole);
  };

  const handleExtractFromSearch = (cardId: string, destination?: string, revealToOpponent = false) => {
    if (revealToOpponent) {
      onExtractCard(cardId, destination, true);
    } else {
      onExtractCard(cardId, destination);
    }
    requestMainDeckShuffleConfirm();
  };

  const handleBulkExtract = (destination?: string, revealToOpponent = false) => {
    if (bulkSelectedCardIds.length === 0) return;
    if (onExtractCards) {
      onExtractCards(bulkSelectedCardIds, destination, revealToOpponent);
    } else {
      bulkSelectedCardIds.forEach(cardId => {
        if (revealToOpponent) {
          onExtractCard(cardId, destination, true);
        } else {
          onExtractCard(cardId, destination);
        }
      });
    }
    requestMainDeckShuffleConfirm();
  };

  const handleBulkSendToBottom = () => {
    if (bulkSelectedCardIds.length === 0) return;
    if (onSendCardsToBottom) {
      onSendCardsToBottom(bulkSelectedCardIds);
      return;
    }

    bulkSelectedCardIds.forEach(cardId => onSendToBottom?.(cardId));
  };

  const handleSendCardToBottom = (cardId: string) => {
    if (onSendToBottom) {
      onSendToBottom(cardId);
      return;
    }

    onSendCardsToBottom?.([cardId]);
  };

  const handleSendCardToCemetery = (card: CardInstance) => {
    if (onSendToCemetery) {
      onSendToCemetery(card.id);
    } else {
      onSendCardsToCemetery?.([card.id]);
    }
    requestMainDeckShuffleConfirm();
  };

  const handleBulkSendToCemetery = () => {
    if (bulkSelectedCards.length === 0) return;
    if (onSendCardsToCemetery) {
      onSendCardsToCemetery(bulkSelectedCardIds);
    } else {
      bulkSelectedCardIds.forEach(cardId => onSendToCemetery?.(cardId));
    }
    requestMainDeckShuffleConfirm();
  };

  const handleBanishCard = (card: CardInstance) => {
    if (onBanish) {
      onBanish(card.id);
      return;
    }

    onBanishCards?.([card.id]);
  };

  const handleBulkBanish = () => {
    if (bulkSelectedCards.length === 0) return;
    if (onBanishCards) {
      onBanishCards(bulkSelectedCardIds);
      return;
    }

    bulkSelectedCardIds.forEach(cardId => onBanish?.(cardId));
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000,
        padding: isCoarseInput ? '0.5rem' : '2rem'
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
        <div style={{ padding: isCoarseInput ? '0.75rem 1rem' : '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {supportsBulkSelection && (
              <>
                {isBulkSelecting && (
                  <>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {selectedCountLabel}
                    </span>
                    <button
                      onClick={() => setBulkSelectedCardIds(visibleCards.map(card => card.id))}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        color: 'white',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {t('gameBoard.modals.search.selectAll')}
                    </button>
                    <button
                      onClick={() => setBulkSelectedCardIds([])}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        color: 'white',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {t('gameBoard.modals.search.clearSelection')}
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setIsBulkSelecting(current => {
                      const nextValue = !current;
                      if (nextValue) {
                        setSelectedCardId(null);
                      } else {
                        setBulkSelectedCardIds([]);
                      }
                      return nextValue;
                    });
                  }}
                  style={{
                    background: isBulkSelecting ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {isBulkSelecting
                    ? t('gameBoard.modals.search.doneSelecting')
                    : t('gameBoard.modals.search.selectMultiple')}
                </button>
              </>
            )}
            {canSortCards && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <span>{t('gameBoard.modals.search.sortLabel')}</span>
                <select
                  aria-label={t('gameBoard.modals.search.sortAria')}
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SearchSortMode)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    padding: '0.45rem 0.5rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="added">{t('gameBoard.modals.search.sortOptions.added')}</option>
                  <option value="cost">{t('gameBoard.modals.search.sortOptions.cost')}</option>
                  <option value="type">{t('gameBoard.modals.search.sortOptions.type')}</option>
                </select>
              </label>
            )}
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
        </div>

        <div
          data-testid="search-card-content"
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: isCoarseInput ? 'column' : undefined,
            gap: isCoarseInput ? '1rem' : undefined,
            padding: isCoarseInput ? '1.5rem' : undefined,
          }}
        >
          <div
            ref={cardGridRef}
            data-testid="search-card-grid"
            style={{
              padding: isCoarseInput ? 0 : '1.5rem',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              alignContent: 'start',
              gap: '1rem',
              paddingBottom: shouldShowDetailPopover && reserveDetailSpace ? '11rem' : isCoarseInput ? 0 : '1.5rem'
            }}
          >
            {visibleCards.map(c => (
              <CardSearchModalCardItem
                key={c.id}
                card={c}
                cardDetailLookup={cardDetailLookup}
                scrollRootRef={cardGridRef}
                isSelected={selectedCardId === c.id}
                isBulkSelecting={isBulkSelecting}
                isBulkSelected={bulkSelectedCardIds.includes(c.id)}
                isEvolveDeck={isEvolveDeck}
                isPublicRecoveryZone={isPublicRecoveryZone}
                isPreparingMainDeckSearch={isPreparingMainDeckSearch}
                allowHandExtraction={allowHandExtraction}
                canEditSearchedEvolveDeck={canEditSearchedEvolveDeck}
                readOnly={readOnly}
                isCoarseInput={isCoarseInput}
                viewerRole={viewerRole}
                targetRole={targetRole}
                actionRole={actionRole}
                canAddToHand={canAddCardToHand(c)}
                canRevealToHand={canRevealCardToHand(c)}
                canAddToEx={canAddCardToEx(c)}
                canPlayToField={canPlayCardToField()}
                canSendToCemetery={canSendCardToCemetery(c)}
                canSendToBottom={canSendCardToBottom()}
                canBanish={canBanishCard()}
                onClick={() => {
                  if (isBulkSelecting) {
                    toggleBulkCardSelection(c.id);
                    return;
                  }
                  setSelectedCardId(current => current === c.id ? null : c.id);
                }}
                onPlayToField={() => handleExtractFromSearch(c.id, `field-${actionRole}`)}
                onAddToHand={() => handleExtractFromSearch(c.id, `hand-${actionRole}`)}
                onRevealToHand={() => handleExtractFromSearch(c.id, `hand-${actionRole}`, true)}
                onAddToEx={() => handleExtractFromSearch(c.id, `ex-${actionRole}`)}
                onSendToCemetery={() => handleSendCardToCemetery(c)}
                onSendToBottom={() => handleSendCardToBottom(c.id)}
                onBanish={() => handleBanishCard(c)}
                onToggleFlip={onToggleFlip}
                onSetCardFace={onSetCardFace}
              />
            ))}
            {cards.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                {t('gameBoard.modals.search.empty')}
              </div>
            )}
          </div>
          {shouldShowCoarseDetailPane && (
            <div
              data-testid="search-card-detail-pane"
              ref={detailPopoverRef}
              style={{
                flex: '0 0 auto',
                height: 'min(20vh, 140px)',
                overflowY: 'auto',
                visibility: selectedCard ? 'visible' : 'hidden',
                background: 'rgba(15, 23, 42, 0.98)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                boxShadow: '0 10px 22px rgba(0,0,0,0.35)',
                padding: '0.8rem'
              }}
            >
              {selectedCard && (
                <CardSearchModalDetailContent
                  card={selectedCard}
                  cardDetailLookup={cardDetailLookup}
                  onClose={() => setSelectedCardId(null)}
                />
              )}
            </div>
          )}
        </div>

        <CardSearchModalBulkActionBar
          isBulkSelecting={isBulkSelecting}
          selectedCountLabel={selectedCountLabel}
          actionRole={actionRole}
          isPreparingMainDeckSearch={isPreparingMainDeckSearch}
          canBulkPlayToField={canBulkPlayToField}
          canBulkAddToHand={canBulkAddToHand}
          canBulkRevealToHand={canBulkRevealToHand}
          canBulkAddToEx={canBulkAddToEx}
          canBulkSendToCemetery={canBulkSendToCemetery}
          canBulkSendToBottom={canBulkSendToBottom}
          canBulkBanish={canBulkBanish}
          onBulkPlayToField={() => handleBulkExtract(`field-${actionRole}`)}
          onBulkAddToHand={() => handleBulkExtract(`hand-${actionRole}`)}
          onBulkRevealToHand={() => handleBulkExtract(`hand-${actionRole}`, true)}
          onBulkAddToEx={() => handleBulkExtract(`ex-${actionRole}`)}
          onBulkSendToCemetery={handleBulkSendToCemetery}
          onBulkSendToBottom={handleBulkSendToBottom}
          onBulkBanish={handleBulkBanish}
        />

        {shouldShowDetailPopover && selectedCard && (
          <div
            data-testid="search-card-detail-popover"
            ref={detailPopoverRef}
            style={{
              position: 'absolute',
              right: '1rem',
              bottom: '1rem',
              width: 'min(320px, calc(100% - 2rem))',
              maxHeight: selectedCardHasFaces ? '360px' : '190px',
              overflowY: 'auto',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              boxShadow: '0 14px 28px rgba(0,0,0,0.45)',
              padding: '0.8rem',
              zIndex: 2
            }}
          >
            <CardSearchModalDetailContent
              card={selectedCard}
              cardDetailLookup={cardDetailLookup}
              onClose={() => setSelectedCardId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CardSearchModal;
