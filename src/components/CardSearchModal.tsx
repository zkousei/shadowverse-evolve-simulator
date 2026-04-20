import React from 'react';
import type { CardInstance } from './Card';
import type { PlayerRole } from '../types/game';
import { formatAbilityText, type CardDetailLookup } from '../utils/cardDetails';
import { normalizeBaseCardType, type RuntimeBaseCardType } from '../utils/cardType';
import CardArtwork from './CardArtwork';
import { useTranslation } from 'react-i18next';
import { useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';

interface CardSearchModalProps {
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
  viewerRole?: PlayerRole;
  targetRole?: PlayerRole;
  zoneId?: string;
  allowHandExtraction?: boolean;
  readOnly?: boolean;
  onRequestMainDeckShuffleConfirm?: (targetRole: PlayerRole) => void;
}

type SearchTypeCounts = Record<RuntimeBaseCardType, number>;
type SearchSortMode = 'added' | 'cost' | 'type';
type SearchTypeOrder = RuntimeBaseCardType | 'unknown';

const parseSortCost = (cost?: string): number => {
  if (!cost) return Number.MAX_SAFE_INTEGER;
  const parsed = Number.parseInt(cost, 10);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

const getSortTypeOrder = (baseCardType: RuntimeBaseCardType | null): SearchTypeOrder => {
  if (baseCardType === 'follower' || baseCardType === 'spell' || baseCardType === 'amulet') {
    return baseCardType;
  }
  return 'unknown';
};

const searchTypeRank: Record<SearchTypeOrder, number> = {
  follower: 0,
  spell: 1,
  amulet: 2,
  unknown: 3,
};

const compareCardName = (left: CardInstance, right: CardInstance): number => (
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
);

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
  const [sortMode, setSortMode] = React.useState<SearchSortMode>('added');
  const [reserveDetailSpace, setReserveDetailSpace] = React.useState(false);
  const modalPanelRef = React.useRef<HTMLDivElement | null>(null);
  const detailPopoverRef = React.useRef<HTMLDivElement | null>(null);
  const cardGridRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedCardId(null);
      setIsBulkSelecting(false);
      setBulkSelectedCardIds([]);
      setSortMode('added');
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

  // Search behavior must key off the structural zone id, not the localized
  // modal title, otherwise i18n changes can alter which actions are allowed.
  const sourceZonePrefix = zoneId?.split('-')[0] ?? null;
  const isMainDeckSearch = sourceZonePrefix === 'mainDeck';
  const isPreparingMainDeckSearch = !allowHandExtraction && isMainDeckSearch;
  const isEvolveDeck = sourceZonePrefix === 'evolveDeck';
  const shouldShowTypeCounts = sourceZonePrefix === 'cemetery' || sourceZonePrefix === 'mainDeck';
  const isPublicRecoveryZone = sourceZonePrefix === 'cemetery' || sourceZonePrefix === 'banish';
  const canSortCards = sourceZonePrefix === 'cemetery' || sourceZonePrefix === 'banish';
  const supportsBulkSelection = !readOnly && (sourceZonePrefix === 'mainDeck' || sourceZonePrefix === 'cemetery' || sourceZonePrefix === 'banish');
  const visibleCards = React.useMemo(() => {
    if (!canSortCards || sortMode === 'added') return cards;

    const indexedCards = cards.map((card, index) => ({ card, index }));
    const getBaseType = (card: CardInstance) => {
      const cardDetail = cardDetailLookup[card.cardId];
      return card.baseCardType
        ?? normalizeBaseCardType(card.cardKindNormalized)
        ?? normalizeBaseCardType(cardDetail?.cardKindNormalized)
        ?? normalizeBaseCardType(cardDetail?.type);
    };

    indexedCards.sort((left, right) => {
      if (sortMode === 'cost') {
        const leftCost = parseSortCost(cardDetailLookup[left.card.cardId]?.cost);
        const rightCost = parseSortCost(cardDetailLookup[right.card.cardId]?.cost);
        if (leftCost !== rightCost) return leftCost - rightCost;

        const comparedName = compareCardName(left.card, right.card);
        if (comparedName !== 0) return comparedName;
      }

      if (sortMode === 'type') {
        const leftType = getSortTypeOrder(getBaseType(left.card));
        const rightType = getSortTypeOrder(getBaseType(right.card));
        if (leftType !== rightType) return searchTypeRank[leftType] - searchTypeRank[rightType];

        const comparedName = compareCardName(left.card, right.card);
        if (comparedName !== 0) return comparedName;
      }

      return left.index - right.index;
    });

    return indexedCards.map((entry) => entry.card);
  }, [canSortCards, cardDetailLookup, cards, sortMode]);
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
  const bulkSelectedCards = cards.filter(card => bulkSelectedCardIds.includes(card.id));
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
    Boolean((onSendCardsToCemetery || onSendToCemetery) && isMainDeckSearch && !isPreparingMainDeckSearch && card.owner === viewerRole)
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
          {visibleCards.map(c => {
            const isUsed = isEvolveDeck && !c.isFlipped;
            const canAddToHand = canAddCardToHand(c);
            const canRevealToHand = canRevealCardToHand(c);
            const canAddToEx = canAddCardToEx(c);
            const canPlayToField = canPlayCardToField();
            const playToFieldLabel = isPreparingMainDeckSearch ? t('gameBoard.modals.search.setFaceDown') : t('gameBoard.modals.search.playToField');
            const isBulkSelected = bulkSelectedCardIds.includes(c.id);
            const isTouchControlsOpen = isCoarseInput && selectedCardId === c.id;

            return (
              <div
                key={c.id}
                className="search-card-container"
                onClick={() => {
                  if (isBulkSelecting) {
                    toggleBulkCardSelection(c.id);
                    return;
                  }

                  setSelectedCardId(current => current === c.id ? null : c.id);
                }}
                style={{
                  position: 'relative',
                  opacity: isUsed ? 0.6 : 1,
                  transition: 'opacity 0.1s',
                  cursor: 'pointer',
                  outline: (selectedCardId === c.id || isBulkSelected) ? '2px solid #38bdf8' : 'none',
                  borderRadius: '6px',
                  boxShadow: (selectedCardId === c.id || isBulkSelected) ? '0 0 0 3px rgba(56,189,248,0.18)' : 'none'
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

                {!isBulkSelecting && !readOnly && (c.owner === viewerRole || isPublicRecoveryZone) && (
                  <div
                    className="modal-card-controls"
                    data-testid={`search-card-controls-${c.id}`}
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
                          handleExtractFromSearch(c.id, `field-${actionRole}`);
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
                          handleExtractFromSearch(c.id, `hand-${actionRole}`);
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
                          handleExtractFromSearch(c.id, `hand-${actionRole}`, true);
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
                          handleExtractFromSearch(c.id, `ex-${actionRole}`);
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
                    {canSendCardToCemetery(c) && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSendCardToCemetery(c);
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
                    {canSendCardToBottom() && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSendCardToBottom(c.id);
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
                    {canBanishCard() && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleBanishCard(c);
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

        {isBulkSelecting && (
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              padding: '1rem 1.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'rgba(15, 23, 42, 0.92)'
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginRight: '0.2rem' }}>
              {selectedCountLabel}
            </span>
            {canBulkPlayToField && actionRole && (
              <button
                onClick={() => handleBulkExtract(`field-${actionRole}`)}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isPreparingMainDeckSearch ? t('gameBoard.modals.search.setFaceDown') : t('gameBoard.modals.search.playToField')}
              </button>
            )}
            {canBulkAddToHand && actionRole && (
              <button
                onClick={() => handleBulkExtract(`hand-${actionRole}`)}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t('gameBoard.modals.search.addToHand')}
              </button>
            )}
            {canBulkRevealToHand && actionRole && (
              <button
                onClick={() => handleBulkExtract(`hand-${actionRole}`, true)}
                style={{
                  background: '#14b8a6',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t('gameBoard.modals.search.revealAndAddToHand')}
              </button>
            )}
            {canBulkAddToEx && actionRole && (
              <button
                onClick={() => handleBulkExtract(`ex-${actionRole}`)}
                style={{
                  background: '#a855f7',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t('gameBoard.modals.search.addToEx')}
              </button>
            )}
            {canBulkSendToCemetery && (
              <button
                onClick={handleBulkSendToCemetery}
                style={{
                  background: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t('gameBoard.card.quickActionDescriptions.cemetery')}
              </button>
            )}
            {canBulkSendToBottom && (
              <button
                onClick={handleBulkSendToBottom}
                style={{
                  background: '#475569',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t('gameBoard.card.quickActionDescriptions.sendToBottom')}
              </button>
            )}
            {canBulkBanish && (
              <button
                onClick={handleBulkBanish}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t('gameBoard.card.quickActionDescriptions.banish')}
              </button>
            )}
          </div>
        )}

        {selectedCard && !isBulkSelecting && (
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
