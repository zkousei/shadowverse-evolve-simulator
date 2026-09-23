import React from 'react';
import { useTranslation } from 'react-i18next';
import GameBoardPlayerTrackerSection from './GameBoardPlayerTrackerSection';
import type { SyncState } from '../../types/game';
import { useGameBoardBoardDensity, useGameBoardInputProfile } from '../../contexts/gameBoardInputProfileContext';

type GameBoardPlayerControlsPanelProps = {
  label: string;
  panelWidth: number;
  gameStatus: SyncState['gameStatus'];
  importDeckLabel: string;
  loadSavedDeckLabel: string;
  canImportDeck: boolean;
  canOpenSavedDeckPicker: boolean;
  savedDeckPickerUnavailableTitle?: string;
  onDeckUpload: React.ChangeEventHandler<HTMLInputElement>;
  onOpenSavedDeckPicker: () => void;
  canUsePlayingActions: boolean;
  playingActionsDisabledTitle?: string;
  onDraw: () => void;
  onMill: () => void;
  onMoveTopCardToEx: () => void;
  onMoveTopCardToBanish: () => void;
  drawButtonBackground: string;
  canOpenTokenSpawn: boolean;
  onOpenTokenSpawn: () => void;
  spawnButtonBackground: string;
  middleControls?: React.ReactNode;
  afterSpawnControls?: React.ReactNode;
  undoMoveButton?: React.ReactNode;
  trackerTestId: string;
  playerState: SyncState['host'];
  onAdjustStat: (
    stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo',
    delta: number
  ) => void;
  readOnlyTracker?: boolean;
  forceExpandedTracker?: boolean;
  containerStyle?: React.CSSProperties;
};

const GameBoardPlayerControlsPanel: React.FC<GameBoardPlayerControlsPanelProps> = ({
  label,
  panelWidth,
  gameStatus,
  importDeckLabel,
  loadSavedDeckLabel,
  canImportDeck,
  canOpenSavedDeckPicker,
  savedDeckPickerUnavailableTitle,
  onDeckUpload,
  onOpenSavedDeckPicker,
  canUsePlayingActions,
  playingActionsDisabledTitle,
  onDraw,
  onMill,
  onMoveTopCardToEx,
  onMoveTopCardToBanish,
  drawButtonBackground,
  canOpenTokenSpawn,
  onOpenTokenSpawn,
  spawnButtonBackground,
  middleControls,
  afterSpawnControls,
  undoMoveButton,
  trackerTestId,
  playerState,
  onAdjustStat,
  readOnlyTracker = false,
  forceExpandedTracker = false,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const inputProfile = useGameBoardInputProfile();
  const boardDensity = useGameBoardBoardDensity();
  const isCompactControls = inputProfile === 'coarse';
  const isNarrowCompactPanel = isCompactControls && panelWidth <= 160;
  const isOverviewControls = inputProfile === 'fine' && boardDensity === 'overview';
  const showSetupActions = gameStatus === 'preparing';
  const showPlayingActions = gameStatus === 'playing';
  const compactPanelPadding = isCompactControls ? (isNarrowCompactPanel ? '0.48rem' : '0.55rem') : isOverviewControls ? '0.42rem 0.5rem' : '0.65rem 0.75rem';
  const compactPanelGap = isCompactControls ? (isNarrowCompactPanel ? '0.26rem' : '0.32rem') : isOverviewControls ? '0.22rem' : '0.35rem';
  const compactSectionGap = isCompactControls ? (isNarrowCompactPanel ? '0.24rem' : '0.3rem') : isOverviewControls ? '0.2rem' : '0.3rem';
  const compactCellPadding = isCompactControls ? (isNarrowCompactPanel ? '0.32rem' : '0.36rem') : isOverviewControls ? '0.4rem' : '0.35rem 0.5rem';
  const compactButtonBaseStyle: React.CSSProperties = {
    minHeight: isCompactControls ? '30px' : '25px',
    fontSize: isCompactControls ? '0.64rem' : '0.72rem',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
  const compactPrimaryActionLabelStyle: React.CSSProperties = {
    minHeight: isCompactControls ? '30px' : '25px',
    fontSize: isCompactControls ? '0.66rem' : '0.72rem',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
  const playingActionGroupGap = isCompactControls
    ? (isNarrowCompactPanel ? '0.16rem' : '0.2rem')
    : isOverviewControls ? '0.2rem' : '0.3rem';
  const groupedActionStyle: React.CSSProperties = {
    padding: isCompactControls || isOverviewControls ? '0.24rem 0.16rem' : compactCellPadding,
    color: '#f8fafc',
    fontWeight: 'bold',
    opacity: canUsePlayingActions ? 1 : 0.5,
    cursor: canUsePlayingActions ? 'pointer' : 'not-allowed',
    ...compactButtonBaseStyle,
  };
  return (
    <div
      style={{
        width: `${panelWidth}px`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        gap: compactPanelGap,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        padding: compactPanelPadding,
        borderRadius: '16px',
        ...containerStyle,
      }}
    >
      <div style={{ fontSize: isCompactControls ? (isNarrowCompactPanel ? '0.68rem' : '0.72rem') : isOverviewControls ? '0.64rem' : '0.8rem', fontWeight: 'bold', color: 'white', marginBottom: isCompactControls ? (isNarrowCompactPanel ? '0.12rem' : '0.16rem') : isOverviewControls ? '0.2rem' : '0.25rem' }}>
        {t('gameBoard.zones.controls', { label })}
      </div>
      <div
        data-testid="player-controls-primary-actions"
        style={{
          display: (isCompactControls || isOverviewControls) ? 'grid' : 'flex',
          flexDirection: (isCompactControls || isOverviewControls) ? undefined : 'column',
          gridTemplateColumns: (isCompactControls || isOverviewControls) ? '1fr 1fr' : undefined,
          gap: isCompactControls ? (isNarrowCompactPanel ? '0.24rem' : '0.28rem') : isOverviewControls ? '0.28rem' : '0.5rem',
        }}
      >
        {showSetupActions && (
          <>
            <label
              className="glass-panel"
              style={{
                padding: compactCellPadding,
                background: 'var(--bg-surface-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gridColumn: (isCompactControls || isOverviewControls) ? '1 / -1' : undefined,
                cursor: canImportDeck ? 'pointer' : 'not-allowed',
                fontSize: isCompactControls ? '0.72rem' : isOverviewControls ? '0.7rem' : '0.875rem',
                opacity: canImportDeck ? 1 : 0.5,
                ...compactPrimaryActionLabelStyle,
              }}
            >
              {importDeckLabel}
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={onDeckUpload}
                disabled={!canImportDeck}
              />
            </label>
            <button
              type="button"
              className="glass-panel"
              onClick={onOpenSavedDeckPicker}
              disabled={!canImportDeck || !canOpenSavedDeckPicker}
              title={!canImportDeck || !canOpenSavedDeckPicker ? savedDeckPickerUnavailableTitle : undefined}
              style={{
                padding: compactCellPadding,
                background: canImportDeck && canOpenSavedDeckPicker
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))'
                  : 'rgba(34, 197, 94, 0.18)',
                border: canImportDeck && canOpenSavedDeckPicker
                  ? '1px solid rgba(110, 231, 183, 0.45)'
                  : '1px solid var(--border-light)',
                color: '#f8fafc',
                fontWeight: 700,
                textAlign: 'center',
                gridColumn: (isCompactControls || isOverviewControls) ? '1 / -1' : undefined,
                cursor: canImportDeck && canOpenSavedDeckPicker ? 'pointer' : 'not-allowed',
                fontSize: isCompactControls ? '0.72rem' : isOverviewControls ? '0.7rem' : '0.875rem',
                boxShadow: canImportDeck && canOpenSavedDeckPicker
                  ? '0 8px 18px rgba(5, 150, 105, 0.28)'
                  : 'none',
                opacity: canImportDeck && canOpenSavedDeckPicker ? 1 : 0.5,
                ...compactPrimaryActionLabelStyle,
              }}
            >
              {loadSavedDeckLabel}
            </button>
          </>
        )}
        {showPlayingActions && (
          <>
            <div
              data-testid="playing-utility-actions"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: playingActionGroupGap,
                gridColumn: (isCompactControls || isOverviewControls) ? '1 / -1' : undefined,
                width: '100%',
              }}
            >
              <button
                onClick={onDraw}
                className="glass-panel"
                disabled={!canUsePlayingActions}
                title={!canUsePlayingActions ? playingActionsDisabledTitle : undefined}
                style={{ ...groupedActionStyle, padding: compactCellPadding, background: drawButtonBackground }}
              >
                {t('gameBoard.zones.draw', { label })}
              </button>
              <button
                onClick={onOpenTokenSpawn}
                className="glass-panel"
                disabled={!canOpenTokenSpawn}
                style={{
                  ...groupedActionStyle,
                  padding: compactCellPadding,
                  background: spawnButtonBackground,
                  opacity: canOpenTokenSpawn ? 1 : 0.5,
                  cursor: canOpenTokenSpawn ? 'pointer' : 'not-allowed',
                }}
              >
                {t('gameBoard.zones.spawnToken', { label })}
              </button>
            </div>
            <div
              data-testid="top-deck-destination-actions"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: playingActionGroupGap,
                gridColumn: (isCompactControls || isOverviewControls) ? '1 / -1' : undefined,
                width: '100%',
              }}
            >
              <button
                onClick={onMill}
                className="glass-panel"
                disabled={!canUsePlayingActions}
                aria-label={t('gameBoard.zones.mill', { label })}
                title={!canUsePlayingActions ? playingActionsDisabledTitle : t('gameBoard.zones.mill', { label })}
                style={{ ...groupedActionStyle, background: '#475569' }}
              >
                {t('gameBoard.zones.topDestinationCemetery')}
              </button>
              <button
                onClick={onMoveTopCardToEx}
                className="glass-panel"
                disabled={!canUsePlayingActions}
                aria-label={t('gameBoard.zones.topToEx', { label })}
                title={!canUsePlayingActions ? playingActionsDisabledTitle : t('gameBoard.zones.topToEx', { label })}
                style={{ ...groupedActionStyle, background: '#334155' }}
              >
                {t('gameBoard.zones.topDestinationEx')}
              </button>
              <button
                onClick={onMoveTopCardToBanish}
                className="glass-panel"
                disabled={!canUsePlayingActions}
                aria-label={t('gameBoard.zones.topToBanish', { label })}
                title={!canUsePlayingActions ? playingActionsDisabledTitle : t('gameBoard.zones.topToBanish', { label })}
                style={{ ...groupedActionStyle, background: '#7f1d1d' }}
              >
                {t('gameBoard.zones.topDestinationBanish')}
              </button>
            </div>
          </>
        )}
        {!showPlayingActions && (
          <button
            onClick={onOpenTokenSpawn}
            className="glass-panel"
            disabled={!canOpenTokenSpawn}
            style={{
              padding: compactCellPadding,
              background: spawnButtonBackground,
              color: '#f8fafc',
              opacity: canOpenTokenSpawn ? 1 : 0.5,
              cursor: canOpenTokenSpawn ? 'pointer' : 'not-allowed',
              ...compactButtonBaseStyle,
            }}
          >
            {t('gameBoard.zones.spawnToken', { label })}
          </button>
        )}
      </div>
      {showPlayingActions && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: compactSectionGap,
            minHeight: isCompactControls ? '28px' : '26px',
            justifyContent: 'center',
          }}
        >
          {middleControls}
          {afterSpawnControls}
          {undoMoveButton}
        </div>
      )}
      <GameBoardPlayerTrackerSection
        testId={trackerTestId}
        label={label}
        playerState={playerState}
        onAdjustStat={onAdjustStat}
        compact={!forceExpandedTracker && (isCompactControls || isOverviewControls) && panelWidth <= 180}
        readOnly={readOnlyTracker}
        containerStyle={{ marginTop: isOverviewControls ? '0.2rem' : 'auto' }}
      />
    </div>
  );
};

export default GameBoardPlayerControlsPanel;
