import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameBoardBoardDensity, useGameBoardInputProfile } from '../contexts/gameBoardInputProfileContext';

type GamePhase = 'Start' | 'Main' | 'End';

type GameBoardTurnPanelProps = {
  isSoloMode: boolean;
  isCurrentPlayerTurn: boolean;
  currentTurnLabel: string;
  turnCount: number;
  phase: GamePhase;
  isBottomTurnActive: boolean;
  canChangePhase: boolean;
  onPhaseChange: (phase: GamePhase) => void;
};

const GameBoardTurnPanel: React.FC<GameBoardTurnPanelProps> = ({
  isSoloMode,
  isCurrentPlayerTurn,
  currentTurnLabel,
  turnCount,
  phase,
  isBottomTurnActive,
  canChangePhase,
  onPhaseChange,
}) => {
  const { t } = useTranslation();
  const inputProfile = useGameBoardInputProfile();
  const boardDensity = useGameBoardBoardDensity();
  const isCompactControls = inputProfile === 'coarse';
  const isOverviewControls = inputProfile === 'fine' && boardDensity === 'overview';

  return (
    <div
      data-testid="gameboard-turn-panel"
      style={{
        display: 'flex',
        gap: isCompactControls ? '0.5rem' : isOverviewControls ? '0.8rem' : '1rem',
        flexWrap: isCompactControls ? 'wrap' : 'nowrap',
        alignItems: 'center',
        background: isBottomTurnActive
          ? 'linear-gradient(90deg, rgba(0, 208, 132, 0.18), rgba(17, 24, 39, 0.92))'
          : 'var(--bg-overlay)',
        padding: isCompactControls ? '0.36rem 0.55rem' : isOverviewControls ? '0.44rem 0.8rem' : '0.55rem 1rem',
        borderRadius: '10px',
        border: isBottomTurnActive ? '1px solid rgba(0, 208, 132, 0.28)' : '1px solid transparent',
        boxShadow: isBottomTurnActive ? '0 0 18px rgba(0, 208, 132, 0.16)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <span
        style={{
          color: isSoloMode || isCurrentPlayerTurn ? 'var(--vivid-green-cyan)' : 'var(--vivid-red)',
          fontSize: isCompactControls
            ? (isBottomTurnActive ? '0.78rem' : '0.74rem')
            : isOverviewControls
              ? (isBottomTurnActive ? '0.8rem' : '0.74rem')
            : (isBottomTurnActive ? '1rem' : '0.92rem'),
          fontWeight: 900,
          letterSpacing: '0.06em',
          textShadow: isBottomTurnActive ? '0 0 12px rgba(0, 208, 132, 0.35)' : 'none',
        }}
      >
        {isSoloMode
          ? t('gameBoard.turn.p1', { label: currentTurnLabel.toUpperCase() })
          : isCurrentPlayerTurn ? t('gameBoard.turn.your') : t('gameBoard.turn.opponent')}
      </span>
      <span className="Garamond" style={{ fontSize: isCompactControls ? (isBottomTurnActive ? '0.84rem' : '0.78rem') : isOverviewControls ? (isBottomTurnActive ? '0.86rem' : '0.8rem') : (isBottomTurnActive ? '1.08rem' : undefined) }}>
        {t('gameBoard.turn.count', { count: turnCount })}
      </span>
      <select
        aria-label={t('gameBoard.turn.phaseLabel')}
        value={phase}
        onChange={(event) => onPhaseChange(event.target.value as GamePhase)}
        disabled={!canChangePhase}
        style={{
          padding: isCompactControls ? '0.14rem 0.24rem' : isOverviewControls ? '0.16rem' : '0.2rem',
          borderRadius: '4px',
          background: 'black',
          color: 'white',
          fontSize: isCompactControls ? '0.66rem' : isOverviewControls ? '0.8rem' : undefined,
          minHeight: isCompactControls ? '28px' : undefined,
          border: isBottomTurnActive ? '1px solid rgba(0, 208, 132, 0.35)' : undefined,
        }}
      >
        <option value="Start">{t('gameBoard.turn.phaseStart')}</option>
        <option value="Main">{t('gameBoard.turn.phaseMain')}</option>
        <option value="End">{t('gameBoard.turn.phaseEnd')}</option>
      </select>
    </div>
  );
};

export default GameBoardTurnPanel;
