import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CardClass } from '../models/class';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckRuleConfig, DeckFormat } from '../models/deckRule';
import { BASE_CARD_TYPE_VALUES } from '../models/cardClassification';
import { DECK_LIMITS, type DeckValidationMessage } from '../utils/deckBuilderRules';
import { getDeckBaseCardTypeCounts, type DeckDisplayGroup, type DeckSortMode } from '../utils/deckBuilderDisplay';
import DeckBuilderDeckControls from './DeckBuilderDeckControls';
import DeckBuilderDeckHeader from './DeckBuilderDeckHeader';
import DeckBuilderDeckSection from './DeckBuilderDeckSection';
import DeckBuilderRulePanel from './DeckBuilderRulePanel';

type DeckBuilderDeckPaneProps = {
  deckName: string;
  canSaveCurrentDeck: boolean;
  canExportDeck: boolean;
  selectedSavedDeckId: string | null;
  saveStateMessage: string;
  draftRestored: boolean;
  hasReachedSoftLimit: boolean;
  hasReachedHardLimit: boolean;
  savedDeckCount: number;
  hardSavedDeckLimit: number;
  deckRuleConfig: DeckRuleConfig;
  titles: string[];
  crossoverClassOptionsA: CardClass[];
  crossoverClassOptionsB: CardClass[];
  isRuleReady: boolean;
  deckIssueMessages: DeckValidationMessage[];
  deckSortMode: DeckSortMode;
  leaderCount: number;
  leaderLimit: number;
  groupedLeaderCards: DeckDisplayGroup[];
  mainDeckCount: number;
  groupedMainDeck: DeckDisplayGroup[];
  evolveDeckCount: number;
  groupedEvolveDeck: DeckDisplayGroup[];
  tokenDeckCount: number;
  groupedTokenDeck: DeckDisplayGroup[];
  onDeckNameChange: (value: string) => void;
  onSave: () => void;
  onMakeUnsavedCopy: () => void;
  onOpenMyDecks: () => void;
  onImportDeck: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenDeckLogImport: () => void;
  onExportDeck: () => void;
  onDeckFormatChange: (nextFormat: DeckFormat) => void;
  onDeckIdentityTypeChange: (identityType: 'class' | 'title') => void;
  onConstructedClassChange: (nextValue: string) => void;
  onConstructedTitleChange: (nextValue: string) => void;
  onCrossoverClassChange: (index: 0 | 1, nextValue: string) => void;
  onDeckSortModeChange: (mode: DeckSortMode) => void;
  onOpenResetDeckDialog: () => void;
  onOpenResetBuilderDialog: () => void;
  canAddMainCard: (card: DeckBuilderCardData) => boolean;
  canAddEvolveCard: (card: DeckBuilderCardData) => boolean;
  canAddTokenCard: (card: DeckBuilderCardData) => boolean;
  onRemoveLeader: (cardId: string) => void;
  onRemoveMain: (cardId: string) => void;
  onAddMain: (card: DeckBuilderCardData) => void;
  onRemoveEvolve: (cardId: string) => void;
  onAddEvolve: (card: DeckBuilderCardData) => void;
  onRemoveToken: (cardId: string) => void;
  onAddToken: (card: DeckBuilderCardData) => void;
  onDeckCardMouseEnter: (card: DeckBuilderCardData, event: React.MouseEvent<HTMLDivElement>) => void;
  onDeckCardMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDeckCardMouseLeave: () => void;
};

const DeckBuilderDeckPane: React.FC<DeckBuilderDeckPaneProps> = ({
  deckName,
  canSaveCurrentDeck,
  canExportDeck,
  selectedSavedDeckId,
  saveStateMessage,
  draftRestored,
  hasReachedSoftLimit,
  hasReachedHardLimit,
  savedDeckCount,
  hardSavedDeckLimit,
  deckRuleConfig,
  titles,
  crossoverClassOptionsA,
  crossoverClassOptionsB,
  isRuleReady,
  deckIssueMessages,
  deckSortMode,
  leaderCount,
  leaderLimit,
  groupedLeaderCards,
  mainDeckCount,
  groupedMainDeck,
  evolveDeckCount,
  groupedEvolveDeck,
  tokenDeckCount,
  groupedTokenDeck,
  onDeckNameChange,
  onSave,
  onMakeUnsavedCopy,
  onOpenMyDecks,
  onImportDeck,
  onOpenDeckLogImport,
  onExportDeck,
  onDeckFormatChange,
  onDeckIdentityTypeChange,
  onConstructedClassChange,
  onConstructedTitleChange,
  onCrossoverClassChange,
  onDeckSortModeChange,
  onOpenResetDeckDialog,
  onOpenResetBuilderDialog,
  canAddMainCard,
  canAddEvolveCard,
  canAddTokenCard,
  onRemoveLeader,
  onRemoveMain,
  onAddMain,
  onRemoveEvolve,
  onAddEvolve,
  onRemoveToken,
  onAddToken,
  onDeckCardMouseEnter,
  onDeckCardMouseMove,
  onDeckCardMouseLeave,
}) => {
  const { t } = useTranslation();
  const mainDeckTypeCounts = getDeckBaseCardTypeCounts(groupedMainDeck);
  const mainDeckTypeSummaryLabel = BASE_CARD_TYPE_VALUES
    .map(cardType => `${t(`deckBuilder.filters.cardType.${cardType}`)}: ${mainDeckTypeCounts[cardType]}`)
    .join(' / ');

  return (
    <div className="glass-panel" style={{ width: '350px', display: 'flex', flexDirection: 'column', borderRight: 'none', borderTop: 'none', borderBottom: 'none', borderRadius: 0 }}>
      <DeckBuilderDeckHeader
        deckName={deckName}
        canSaveCurrentDeck={canSaveCurrentDeck}
        canExportDeck={canExportDeck}
        selectedSavedDeckId={selectedSavedDeckId}
        saveStateMessage={saveStateMessage}
        draftRestored={draftRestored}
        hasReachedSoftLimit={hasReachedSoftLimit}
        hasReachedHardLimit={hasReachedHardLimit}
        savedDeckCount={savedDeckCount}
        hardSavedDeckLimit={hardSavedDeckLimit}
        onDeckNameChange={onDeckNameChange}
        onSave={onSave}
        onMakeUnsavedCopy={onMakeUnsavedCopy}
        onOpenMyDecks={onOpenMyDecks}
        onImportDeck={onImportDeck}
        onOpenDeckLogImport={onOpenDeckLogImport}
        onExportDeck={onExportDeck}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        <DeckBuilderRulePanel
          deckRuleConfig={deckRuleConfig}
          titles={titles}
          crossoverClassOptionsA={crossoverClassOptionsA}
          crossoverClassOptionsB={crossoverClassOptionsB}
          isRuleReady={isRuleReady}
          deckIssueMessages={deckIssueMessages}
          onDeckFormatChange={onDeckFormatChange}
          onDeckIdentityTypeChange={onDeckIdentityTypeChange}
          onConstructedClassChange={onConstructedClassChange}
          onConstructedTitleChange={onConstructedTitleChange}
          onCrossoverClassChange={onCrossoverClassChange}
        />

        <DeckBuilderDeckControls
          deckSortMode={deckSortMode}
          onDeckSortModeChange={onDeckSortModeChange}
          onOpenResetDeckDialog={onOpenResetDeckDialog}
          onOpenResetBuilderDialog={onOpenResetBuilderDialog}
        />

        <DeckBuilderDeckSection
          title={t('deckBuilder.deckArea.leader')}
          countLabel={`${leaderCount}/${leaderLimit}`}
          countColor={leaderCount >= leaderLimit ? 'var(--brand-accent)' : 'var(--text-muted)'}
          groupedCards={groupedLeaderCards}
          targetSection="leader"
          removeTitle={t('deckBuilder.deckArea.actions.removeLeader')}
          emptyMessage={t('deckBuilder.deckArea.noLeader')}
          rowsMarginBottom="2rem"
          showCountWhenSingle={false}
          countTextAlign="right"
          onRemove={onRemoveLeader}
          onCardMouseEnter={onDeckCardMouseEnter}
          onCardMouseMove={onDeckCardMouseMove}
          onCardMouseLeave={onDeckCardMouseLeave}
        />

        <DeckBuilderDeckSection
          title={t('deckBuilder.deckArea.mainDeck')}
          countLabel={`${mainDeckCount}/${DECK_LIMITS.main}`}
          countColor={mainDeckCount >= 40 ? 'var(--vivid-green-cyan)' : 'var(--text-muted)'}
          groupedCards={groupedMainDeck}
          targetSection="main"
          removeTitle={t('deckBuilder.deckArea.actions.removeMain')}
          addTitle={t('deckBuilder.addActions.mainLabel')}
          canAddCard={canAddMainCard}
          rowsMarginBottom="2rem"
          summaryLabel={mainDeckTypeSummaryLabel}
          onRemove={onRemoveMain}
          onAdd={onAddMain}
          onCardMouseEnter={onDeckCardMouseEnter}
          onCardMouseMove={onDeckCardMouseMove}
          onCardMouseLeave={onDeckCardMouseLeave}
        />

        <DeckBuilderDeckSection
          title={t('deckBuilder.deckArea.evolveDeck')}
          countLabel={`${evolveDeckCount}/${DECK_LIMITS.evolve}`}
          groupedCards={groupedEvolveDeck}
          targetSection="evolve"
          removeTitle={t('deckBuilder.deckArea.actions.removeEvolve')}
          addTitle={t('deckBuilder.addActions.evolveLabel')}
          canAddCard={canAddEvolveCard}
          onRemove={onRemoveEvolve}
          onAdd={onAddEvolve}
          onCardMouseEnter={onDeckCardMouseEnter}
          onCardMouseMove={onDeckCardMouseMove}
          onCardMouseLeave={onDeckCardMouseLeave}
        />

        <DeckBuilderDeckSection
          title={t('deckBuilder.deckArea.tokenDeck')}
          countLabel={tokenDeckCount}
          groupedCards={groupedTokenDeck}
          targetSection="token"
          removeTitle={t('deckBuilder.deckArea.actions.removeToken')}
          addTitle={t('deckBuilder.addActions.tokenLabel')}
          canAddCard={canAddTokenCard}
          headingMarginTop="2rem"
          onRemove={onRemoveToken}
          onAdd={onAddToken}
          onCardMouseEnter={onDeckCardMouseEnter}
          onCardMouseMove={onDeckCardMouseMove}
          onCardMouseLeave={onDeckCardMouseLeave}
        />
      </div>
    </div>
  );
};

export default DeckBuilderDeckPane;
