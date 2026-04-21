import React from 'react';
import { useTranslation } from 'react-i18next';
import GameBoardPlayerTrackerSection from './GameBoardPlayerTrackerSection';
import type { SyncState } from '../types/game';
import { useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';

type GameBoardPlayerControlsPanelProps = {
  label: string;
  panelWidth: number;
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
  containerStyle?: React.CSSProperties;
};

const GameBoardPlayerControlsPanel: React.FC<GameBoardPlayerControlsPanelProps> = ({
  label,
  panelWidth,
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
  containerStyle,
}) => {
  const { t } = useTranslation();
  const inputProfile = useGameBoardInputProfile();
  const isCompactControls = inputProfile === 'coarse';
  const compactButtonBaseStyle: React.CSSProperties = isCompactControls
    ? {
        minHeight: '34px',
        fontSize: '0.68rem',
        lineHeight: 1.15,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }
    : {};
  const compactPrimaryActionLabelStyle: React.CSSProperties = isCompactControls
    ? {
        minHeight: '34px',
        fontSize: '0.72rem',
        lineHeight: 1.15,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }
    : {};

  return (
    <div
      style={{
        width: `${panelWidth}px`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: isCompactControls ? '0.4rem' : '0.5rem',
        background: 'rgba(0,0,0,0.8)',
        padding: isCompactControls ? '0.75rem' : '1rem',
        borderRadius: 'var(--radius-md)',
        ...containerStyle,
      }}
    >
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>
        {t('gameBoard.zones.controls', { label })}
      </div>
      <div
        data-testid="player-controls-primary-actions"
        style={{
          display: isCompactControls ? 'grid' : 'flex',
          flexDirection: isCompactControls ? undefined : 'column',
          gridTemplateColumns: isCompactControls ? '1fr 1fr' : undefined,
          gap: isCompactControls ? '0.35rem' : '0.5rem',
        }}
      >
        <label
          className="glass-panel"
          style={{
            padding: '0.5rem',
            background: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gridColumn: isCompactControls ? '1 / -1' : undefined,
            cursor: canImportDeck ? 'pointer' : 'not-allowed',
            fontSize: isCompactControls ? '0.72rem' : '0.875rem',
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
            padding: '0.5rem',
            background: canImportDeck && canOpenSavedDeckPicker
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))'
              : 'rgba(34, 197, 94, 0.18)',
            border: canImportDeck && canOpenSavedDeckPicker
              ? '1px solid rgba(110, 231, 183, 0.45)'
              : '1px solid var(--border-light)',
            color: '#f8fafc',
            fontWeight: 700,
            textAlign: 'center',
            gridColumn: isCompactControls ? '1 / -1' : undefined,
            cursor: canImportDeck && canOpenSavedDeckPicker ? 'pointer' : 'not-allowed',
            fontSize: isCompactControls ? '0.72rem' : '0.875rem',
            boxShadow: canImportDeck && canOpenSavedDeckPicker
              ? '0 8px 18px rgba(5, 150, 105, 0.28)'
              : 'none',
            opacity: canImportDeck && canOpenSavedDeckPicker ? 1 : 0.5,
            ...compactPrimaryActionLabelStyle,
          }}
        >
          {loadSavedDeckLabel}
        </button>
        <button
          onClick={onDraw}
          className="glass-panel"
          disabled={!canUsePlayingActions}
          title={!canUsePlayingActions ? playingActionsDisabledTitle : undefined}
          style={{
            padding: '0.5rem',
            background: drawButtonBackground,
            color: '#f8fafc',
            fontWeight: 'bold',
            opacity: canUsePlayingActions ? 1 : 0.5,
            cursor: canUsePlayingActions ? 'pointer' : 'not-allowed',
            ...compactButtonBaseStyle,
          }}
        >
          {t('gameBoard.zones.draw', { label })}
        </button>
        <button
          onClick={onMill}
          className="glass-panel"
          disabled={!canUsePlayingActions}
          title={!canUsePlayingActions ? playingActionsDisabledTitle : undefined}
          style={{
            padding: '0.5rem',
            background: '#475569',
            color: '#f8fafc',
            fontWeight: 'bold',
            opacity: canUsePlayingActions ? 1 : 0.5,
            cursor: canUsePlayingActions ? 'pointer' : 'not-allowed',
            ...compactButtonBaseStyle,
          }}
        >
          {t('gameBoard.zones.mill', { label })}
        </button>
        <button
          onClick={onMoveTopCardToEx}
          className="glass-panel"
          disabled={!canUsePlayingActions}
          title={!canUsePlayingActions ? playingActionsDisabledTitle : undefined}
          style={{
            padding: '0.5rem',
            background: '#334155',
            color: '#f8fafc',
            fontWeight: 'bold',
            opacity: canUsePlayingActions ? 1 : 0.5,
            cursor: canUsePlayingActions ? 'pointer' : 'not-allowed',
            ...compactButtonBaseStyle,
          }}
        >
          {t('gameBoard.zones.topToEx', { label })}
        </button>
        <button
          onClick={onOpenTokenSpawn}
          className="glass-panel"
          disabled={!canOpenTokenSpawn}
          style={{
            padding: '0.5rem',
            background: spawnButtonBackground,
            color: '#f8fafc',
            opacity: canOpenTokenSpawn ? 1 : 0.5,
            cursor: canOpenTokenSpawn ? 'pointer' : 'not-allowed',
            ...compactButtonBaseStyle,
          }}
        >
          {t('gameBoard.zones.spawnToken', { label })}
        </button>
      </div>
      {middleControls}
      {afterSpawnControls}
      {undoMoveButton}
      <GameBoardPlayerTrackerSection
        testId={trackerTestId}
        label={label}
        playerState={playerState}
        onAdjustStat={onAdjustStat}
        compact={isCompactControls && panelWidth <= 160}
        readOnly={readOnlyTracker}
      />
    </div>
  );
};

export default GameBoardPlayerControlsPanel;
