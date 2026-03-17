import React from 'react';
import { DndContext } from '@dnd-kit/core';
import Zone from '../components/Zone';
import CardSearchModal from '../components/CardSearchModal';
import TopDeckModal from '../components/TopDeckModal';
import { useGameBoardLogic } from '../hooks/useGameBoardLogic';
import { canImportDeck } from '../utils/gameRules';
import { getPlayerLabel, getZoneOwner } from '../utils/soloMode';
import type { PlayerRole } from '../types/game';

const GameBoard: React.FC = () => {
  const {
    room, isSoloMode, isHost, role, status, gameState, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage,
    isRollingDice, diceValue, mulliganOrder, isMulliganModalOpen, setIsMulliganModalOpen,
    handleStatChange, setPhase, endTurn, handleUndoTurn, handleSetInitialTurnOrder,
    handlePureCoinFlip, handleRollDice, handleStartGame, handleToggleReady,
    handleDrawInitialHand, startMulligan, handleMulliganOrderSelect, executeMulligan,
    drawCard, handleExtractCard, confirmResetGame, handleDeckUpload, spawnToken,
    handleModifyCounter, handleDragEnd, toggleTap, handleFlipCard, handleSendToBottom,
    handleBanish, handlePlayToField, handleSendToCemetery, handleReturnEvolve, handleShuffleDeck,
    getCards, lastGameState, millCard,
    topDeckCards, handleLookAtTop, handleResolveTopDeck, setTopDeckCards,
    isDebug
  } = useGameBoardLogic();

  const [isTopNInputOpen, setIsTopNInputOpen] = React.useState(false);
  const [topNValue, setTopNValue] = React.useState(3);
  const [showUndoConfirm, setShowUndoConfirm] = React.useState(false);
  const [topDeckTargetRole, setTopDeckTargetRole] = React.useState<PlayerRole>('host');
  const [mulliganTargetRole, setMulliganTargetRole] = React.useState<PlayerRole>('host');
  const canImportCurrentDeck = canImportDeck(gameState.gameStatus);
  const viewerRole = isSoloMode ? 'all' : role;
  const topRole = (isSoloMode ? 'guest' : role === 'host' ? 'guest' : 'host') as PlayerRole;
  const bottomRole = (isSoloMode ? 'host' : role) as PlayerRole;
  const topLabel = getPlayerLabel(topRole, isSoloMode, 'My', 'Opponent', role);
  const bottomLabel = getPlayerLabel(bottomRole, isSoloMode, 'My', 'Opponent', role);
  const searchTargetRole = searchZone ? getZoneOwner(searchZone.id) ?? role : role;
  const currentTurnLabel = gameState.turnPlayer === bottomRole ? bottomLabel : topLabel;
  const canUndoTurn = Boolean(lastGameState) && (isSoloMode || gameState.turnPlayer !== role);

  const openTopDeckModal = (targetRole: PlayerRole) => {
    setTopDeckTargetRole(targetRole);
    setIsTopNInputOpen(true);
  };

  const openMulliganModal = (targetRole: PlayerRole) => {
    setMulliganTargetRole(targetRole);
    startMulligan();
  };

  const renderPlayerTracker = (playerRole: PlayerRole, label: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem', padding: '0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>{label} Status</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>HP: {gameState[playerRole].hp}</span>
        <div>
          <button onClick={() => handleStatChange(playerRole, 'hp', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'hp', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>EP: {gameState[playerRole].ep}</span>
        <div>
          <button onClick={() => handleStatChange(playerRole, 'ep', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'ep', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#facc15', fontWeight: 'bold' }}>SEP: {gameState[playerRole].sep}</span>
        <div>
          <button onClick={() => handleStatChange(playerRole, 'sep', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'sep', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>Combo: {gameState[playerRole].combo}</span>
        <div>
          <button onClick={() => handleStatChange(playerRole, 'combo', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
          <button onClick={() => handleStatChange(playerRole, 'combo', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.6rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <button onClick={() => handleStatChange(playerRole, 'maxPp', 1)} style={{ width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '2px', cursor: 'pointer', fontSize: '0.75rem', color: '#fff' }}>+</button>
            <span style={{ fontSize: '0.6rem', color: '#93c5fd', fontWeight: 'bold' }}>MAX</span>
            <button onClick={() => handleStatChange(playerRole, 'maxPp', -1)} style={{ width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '2px', cursor: 'pointer', fontSize: '0.75rem', color: '#fff' }}>-</button>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-2px' }}>Play Points</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px' }}>
              <span style={{ color: '#3b82f6', fontWeight: '900', fontSize: '1.75rem' }}>{gameState[playerRole].pp}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', fontWeight: 'bold' }}>/</span>
              <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold' }}>{gameState[playerRole].maxPp}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={() => handleStatChange(playerRole, 'pp', -1)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', color: '#3b82f6', fontWeight: 'bold' }}>∨</button>
            <button onClick={() => handleStatChange(playerRole, 'pp', 1)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', color: '#3b82f6', fontWeight: 'bold' }}>∧</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflow: 'hidden' }}>

        {/* Header bar */}
        {/* Header bar tracking Phase / Turn */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>
              {isSoloMode ? 'Mode' : 'Room'}:{' '}
              <strong>{isSoloMode ? 'Solo Play Beta' : room}</strong>
            </span>
            {isSoloMode && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#111827',
                background: '#f59e0b',
                padding: '0.2rem 0.45rem',
                borderRadius: '999px'
              }}>
                BETA
              </span>
            )}
            <span style={{ color: status.includes('ready') ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}>{status}</span>

            {gameState.gameStatus === 'preparing' ? (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => handleSetInitialTurnOrder()}
                  disabled={!isHost && !isSoloMode}
                  style={{ padding: '0.3rem 0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: (isHost || isSoloMode) ? 1 : 0.5 }}
                >
                  🪙 Decide Turn Order (Random)
                </button>
                <button
                  onClick={() => handleSetInitialTurnOrder(bottomRole)}
                  disabled={!isHost && !isSoloMode}
                  style={{ padding: '0.3rem 0.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: (isHost || isSoloMode) ? 1 : 0.5 }}
                >
                  {isSoloMode ? 'Player 1 1st' : 'Me 1st'}
                </button>
                <button
                  onClick={() => handleSetInitialTurnOrder(topRole)}
                  disabled={!isHost && !isSoloMode}
                  style={{ padding: '0.3rem 0.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: (isHost || isSoloMode) ? 1 : 0.5 }}
                >
                  {isSoloMode ? 'Player 2 1st' : 'Opp 1st'}
                </button>
                {!gameState[bottomRole].initialHandDrawn && (
                  <button
                    onClick={() => handleDrawInitialHand(bottomRole)}
                    style={{ padding: '0.3rem 0.6rem', background: '#3b82f6', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    🃏 Draw Hand (4)
                  </button>
                )}

                <button
                  onClick={handleStartGame}
                  disabled={(!isHost && !isSoloMode) || !gameState.host.isReady || !gameState.guest.isReady}
                  style={{
                    padding: '0.3rem 0.6rem',
                    background: 'var(--vivid-green-cyan)',
                    color: 'black',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: ((isHost || isSoloMode) && gameState.host.isReady && gameState.guest.isReady) ? 'pointer' : 'not-allowed',
                    fontSize: '0.75rem',
                    opacity: ((isHost || isSoloMode) && gameState.host.isReady && gameState.guest.isReady) ? 1 : 0.5,
                    boxShadow: ((isHost || isSoloMode) && gameState.host.isReady && gameState.guest.isReady) ? '0 0 10px rgba(0, 208, 132, 0.4)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { if ((isHost || isSoloMode) && gameState.host.isReady && gameState.guest.isReady) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                  onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                >
                  ▶ START GAME
                </button>

                {gameState[bottomRole].initialHandDrawn && (
                  <button
                    onClick={() => handleToggleReady(bottomRole)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: gameState[bottomRole].isReady ? '#ef4444' : 'var(--vivid-green-cyan)',
                      color: gameState[bottomRole].isReady ? 'white' : 'black',
                      fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem'
                    }}
                  >
                    {gameState[bottomRole].isReady ? '✕ Cancel Ready' : `✅ ${isSoloMode ? 'Player 1 Ready' : 'Ready (準備完了)'}`}
                  </button>
                )}
                {isSoloMode && !gameState[topRole].initialHandDrawn && (
                  <button
                    onClick={() => handleDrawInitialHand(topRole)}
                    style={{ padding: '0.3rem 0.6rem', background: '#6366f1', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    🃏 Draw P2 Hand (4)
                  </button>
                )}
                {isSoloMode && gameState[topRole].initialHandDrawn && (
                  <button
                    onClick={() => handleToggleReady(topRole)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: gameState[topRole].isReady ? '#ef4444' : '#6366f1',
                      color: 'white',
                      fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem'
                    }}
                  >
                    {gameState[topRole].isReady ? '✕ Cancel P2 Ready' : '✅ Player 2 Ready'}
                  </button>
                )}

                <div style={{ display: 'flex', gap: '0.8rem', marginLeft: '0.5rem', borderLeft: '1px solid var(--border-light)', paddingLeft: '0.8rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{isSoloMode ? 'PLAYER 1' : 'HOST'}</span>
                    <span style={{ color: gameState.host.isReady ? 'var(--vivid-green-cyan)' : '#ef4444', fontWeight: 'bold' }}>
                      {gameState.host.isReady ? 'READY' : (gameState.host.initialHandDrawn ? 'DECIDING' : 'WAITING')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{isSoloMode ? 'PLAYER 2' : 'GUEST'}</span>
                    <span style={{ color: gameState.guest.isReady ? 'var(--vivid-green-cyan)' : '#ef4444', fontWeight: 'bold' }}>
                      {gameState.guest.isReady ? 'READY' : (gameState.guest.initialHandDrawn ? 'DECIDING' : 'WAITING')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={handlePureCoinFlip}
                  style={{ padding: '0.3rem 0.6rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  🪙 Toss Coin
                </button>
                <button
                  onClick={handleRollDice}
                  style={{ padding: '0.3rem 0.6rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold' }}
                >
                  🎲 Roll Dice
                </button>
              </>
            )}

            {canUndoTurn && (
              <button
                onClick={() => setShowUndoConfirm(true)}
                style={{
                  padding: '0.3rem 0.6rem',
                  background: '#ec4899',
                  color: 'white',
                  fontWeight: 'bold',
                  border: '1px solid rgba(255,255,255,0.5)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ fontSize: '1rem' }}>↺</span> UNDO LAST END TURN
              </button>
            )}
          </div>

          {/* Turn Management */}
          {gameState.gameStatus === 'playing' && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-overlay)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              <span style={{ color: isSoloMode || gameState.turnPlayer === role ? 'var(--vivid-green-cyan)' : 'var(--vivid-red)' }}>
                {isSoloMode
                  ? `${currentTurnLabel.toUpperCase()} TURN`
                  : gameState.turnPlayer === role ? "YOUR TURN" : "OPPONENT'S TURN"}
              </span>
              <span className="Garamond">TURN {gameState.turnCount}</span>
              <select
                value={gameState.phase}
                onChange={(e) => setPhase(e.target.value as 'Start' | 'Main' | 'End')}
                disabled={!isSoloMode && gameState.turnPlayer !== role}
                style={{ padding: '0.2rem', borderRadius: '4px', background: 'black', color: 'white' }}
              >
                <option value="Start">Start Phase</option>
                <option value="Main">Main Phase</option>
                <option value="End">End Phase</option>
              </select>
            </div>
          )}
        </div>

        {/* Board Playmat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'url("https://shadowverse-evolve.com/wordpress/wp-content/themes/shadowverse-evolve-release_v0/assets/images/common/bg.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 'var(--radius-lg)', padding: '1rem', overflowY: 'auto', alignItems: 'center' }}>

          {/* OPPONENT BOARD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '4px', display: 'flex', gap: '1rem', color: '#fff' }}>
                <span>{topLabel} HP: <strong style={{ color: '#ef4444' }}>{gameState[topRole].hp}</strong></span>
                <span>PP: <strong style={{ color: '#3b82f6' }}>{gameState[topRole].pp}</strong> / {gameState[topRole].maxPp}</span>
                <span>EP: <strong style={{ color: '#fbbf24' }}>{gameState[topRole].ep}</strong></span>
                <span>SEP: <strong style={{ color: '#facc15' }}>{gameState[topRole].sep}</strong></span>
                <span>Combo: <strong>{gameState[topRole].combo}</strong></span>
              </div>
            </div>
            {isSoloMode ? (
              <>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
                  <div style={{ width: '850px', minHeight: '150px', position: 'relative' }}>
                    <Zone
                      id={`hand-${topRole}`}
                      label={`${topLabel} Hand`}
                      cards={getCards(`hand-${topRole}`)}
                      hideCards={false}
                      layout="horizontal"
                      isProtected={true}
                      viewerRole={viewerRole}
                      onModifyCounter={handleModifyCounter}
                      onSendToBottom={handleSendToBottom}
                      onBanish={handleBanish}
                      onCemetery={handleSendToCemetery}
                      onPlayToField={(cardId) => handlePlayToField(cardId, topRole)}
                      containerStyle={{ minHeight: '150px' }}
                    />
                    {gameState.gameStatus === 'preparing' && gameState[topRole].initialHandDrawn && !gameState[topRole].mulliganUsed && (
                      <button
                        onClick={() => openMulliganModal(topRole)}
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '10px',
                          width: 'auto',
                          padding: '0.4rem',
                          background: '#6366f1',
                          color: 'white',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          border: '1px solid rgba(255,255,255,0.25)'
                        }}
                      >
                        P2 Mulligan
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', width: '100%' }}>
                  <Zone
                    id={`ex-${topRole}`}
                    label={`${topLabel} EX Area`}
                    cards={getCards(`ex-${topRole}`)}
                    isProtected={false}
                    viewerRole={viewerRole}
                    onModifyCounter={handleModifyCounter}
                    onSendToBottom={handleSendToBottom}
                    onBanish={handleBanish}
                    onReturnEvolve={handleReturnEvolve}
                    onCemetery={handleSendToCemetery}
                    onPlayToField={(cardId) => handlePlayToField(cardId, topRole)}
                    containerStyle={{ maxWidth: '600px', minHeight: '150px', flex: 'none', width: '600px' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`evolveDeck-${topRole}`} label={`${topLabel} Evolve Deck`} cards={getCards(`evolveDeck-${topRole}`)} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                      <button onClick={() => setSearchZone({ id: `evolveDeck-${topRole}`, title: `${topLabel} Evolve Deck` })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`mainDeck-${topRole}`} label={`${topLabel} Main Deck`} cards={getCards(`mainDeck-${topRole}`)} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                        <button onClick={() => setSearchZone({ id: `mainDeck-${topRole}`, title: `${topLabel} Main Deck` })} style={{ flex: '1 1 48%', fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                        <button onClick={() => handleShuffleDeck(topRole)} style={{ flex: '1 1 48%', fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Shuffle</button>
                        <button onClick={() => openTopDeckModal(topRole)} style={{ flex: '1 1 100%', fontSize: '0.75rem', padding: '4px', background: '#3b82f6', border: '1px solid #2563eb', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Look Top (N)</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`cemetery-${topRole}`} label={`${topLabel} Cemetery`} cards={getCards(`cemetery-${topRole}`)} layout="stack" viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                      <button onClick={() => setSearchZone({ id: `cemetery-${topRole}`, title: `${topLabel} Cemetery` })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Zone id={`banish-${topRole}`} label={`${topLabel} Banish`} cards={getCards(`banish-${topRole}`)} layout="stack" viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                      <button onClick={() => setSearchZone({ id: `banish-${topRole}`, title: `${topLabel} Banish` })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', width: '100%' }}>
                <div style={{ width: '110px' }}>
                  <Zone
                    id={`hand-${topRole}`}
                    label={`${topLabel} Hand`}
                    cards={getCards(`hand-${topRole}`)}
                    hideCards={true}
                    layout="stack"
                    isProtected={true}
                    viewerRole={viewerRole}
                    containerStyle={{ minHeight: '150px' }}
                  />
                </div>
                <Zone
                  id={`ex-${topRole}`}
                  label={`${topLabel} EX Area`}
                  cards={getCards(`ex-${topRole}`)}
                  isProtected={false}
                  viewerRole={viewerRole}
                  containerStyle={{ maxWidth: '600px', minHeight: '150px', flex: 'none', width: '600px' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Zone id={`evolveDeck-${topRole}`} label={`${topLabel} Evolve Deck`} cards={getCards(`evolveDeck-${topRole}`)} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                    <button onClick={() => setSearchZone({ id: `evolveDeck-${topRole}`, title: `${topLabel} Evolve Deck` })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Zone id={`mainDeck-${topRole}`} label={`${topLabel} Main Deck`} cards={getCards(`mainDeck-${topRole}`)} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Zone id={`cemetery-${topRole}`} label={`${topLabel} Cemetery`} cards={getCards(`cemetery-${topRole}`)} layout="stack" viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                    <button onClick={() => setSearchZone({ id: `cemetery-${topRole}`, title: `${topLabel} Cemetery` })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Zone id={`banish-${topRole}`} label={`${topLabel} Banish`} cards={getCards(`banish-${topRole}`)} layout="stack" viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                    <button onClick={() => setSearchZone({ id: `banish-${topRole}`, title: `${topLabel} Banish` })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                  </div>
                </div>
              </div>
            )}
            <Zone
              id={`field-${topRole}`}
              label={`${topLabel} Field`}
              cards={getCards(`field-${topRole}`)}
              onTap={toggleTap}
              onModifyCounter={handleModifyCounter}
              onSendToBottom={isSoloMode ? handleSendToBottom : undefined}
              onBanish={isSoloMode ? handleBanish : undefined}
              onReturnEvolve={isSoloMode ? handleReturnEvolve : undefined}
              onCemetery={handleSendToCemetery}
              onPlayToField={isSoloMode ? (cardId) => handlePlayToField(cardId, topRole) : undefined}
              viewerRole={viewerRole}
              containerStyle={{ maxWidth: '850px', minHeight: '160px', width: '850px', flex: 'none' }}
              isDebug={isDebug}
            />
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />

          {/* MY BOARD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Zone id={`field-${bottomRole}`} label={`${bottomLabel} Field`} cards={getCards(`field-${bottomRole}`)} onTap={toggleTap} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} viewerRole={viewerRole} containerStyle={{ maxWidth: '850px', minHeight: '160px', width: '850px', flex: 'none' }} isDebug={isDebug} />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Zone id={`ex-${bottomRole}`} label={`${bottomLabel} EX Area`} cards={getCards(`ex-${bottomRole}`)} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} viewerRole={viewerRole} containerStyle={{ maxWidth: '600px', minHeight: '160px', flex: 'none', width: '600px' }} isDebug={isDebug} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`banish-${bottomRole}`} label={`${bottomLabel} Banish`} cards={getCards(`banish-${bottomRole}`)} layout="stack" onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onCemetery={handleSendToCemetery} viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                <button onClick={() => setSearchZone({ id: `banish-${bottomRole}`, title: `${bottomLabel} Banish` })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`cemetery-${bottomRole}`} label={`${bottomLabel} Cemetery`} cards={getCards(`cemetery-${bottomRole}`)} layout="stack" onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                <button onClick={() => setSearchZone({ id: `cemetery-${bottomRole}`, title: `${bottomLabel} Cemetery` })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`evolveDeck-${bottomRole}`} label={`${bottomLabel} Evolve Deck`} cards={getCards(`evolveDeck-${bottomRole}`)} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                <button onClick={() => setSearchZone({ id: `evolveDeck-${bottomRole}`, title: `${bottomLabel} Evolve Deck` })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`mainDeck-${bottomRole}`} label={`${bottomLabel} Main Deck`} cards={getCards(`mainDeck-${bottomRole}`)} layout="stack" isProtected={true} viewerRole={viewerRole} containerStyle={{ minWidth: '110px', minHeight: '150px' }} isDebug={isDebug} />
                <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                  <button onClick={() => setSearchZone({ id: `mainDeck-${bottomRole}`, title: `${bottomLabel} Main Deck` })} style={{ flex: '1 1 48%', fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                  <button onClick={() => handleShuffleDeck(bottomRole)} style={{ flex: '1 1 48%', fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Shuffle</button>
                  <button onClick={() => openTopDeckModal(bottomRole)} style={{ flex: '1 1 100%', fontSize: '0.75rem', padding: '4px', background: '#3b82f6', border: '1px solid #2563eb', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Look Top (N)</button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
              <div style={{ width: '850px', minHeight: '160px', position: 'relative' }}>
                {/* My Hand - strictly hidden from opponent but visible to me */}
                <Zone id={`hand-${bottomRole}`} label={`${bottomLabel} Hand`} cards={getCards(`hand-${bottomRole}`)} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} isProtected={true} viewerRole={viewerRole} containerStyle={{ minHeight: '160px' }} isDebug={isDebug} />

                {/* Mulligan Button Overlay near hand */}
                {gameState.gameStatus === 'preparing' && gameState[bottomRole].initialHandDrawn && !gameState[bottomRole].mulliganUsed && (
                  <button
                    onClick={() => openMulliganModal(bottomRole)}
                    style={{
                      position: 'absolute', top: '-10px', right: '10px',
                      padding: '0.5rem 1rem', background: '#eab308', color: 'black',
                      fontWeight: 'bold', borderRadius: '4px',
                      cursor: 'pointer', fontSize: '0.875rem', zIndex: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      border: '2px solid black'
                    }}
                  >
                    🔄 Mulligan (マリガンする)
                  </button>
                )}
              </div>

              {/* Controls */}
              <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.8)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>

                {isSoloMode ? (
                  <>
                    <label
                      className="glass-panel"
                      style={{
                        padding: '0.5rem',
                        background: 'var(--bg-surface-elevated)',
                        textAlign: 'center',
                        cursor: canImportCurrentDeck ? 'pointer' : 'not-allowed',
                        fontSize: '0.875rem',
                        opacity: canImportCurrentDeck ? 1 : 0.5
                      }}
                    >
                      Import {bottomLabel} Deck
                      <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={(event) => handleDeckUpload(event, bottomRole)}
                        disabled={!canImportCurrentDeck}
                      />
                    </label>
                    <label
                      className="glass-panel"
                      style={{
                        padding: '0.5rem',
                        background: 'var(--bg-surface-elevated)',
                        textAlign: 'center',
                        cursor: canImportCurrentDeck ? 'pointer' : 'not-allowed',
                        fontSize: '0.875rem',
                        opacity: canImportCurrentDeck ? 1 : 0.5
                      }}
                    >
                      Import {topLabel} Deck
                      <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={(event) => handleDeckUpload(event, topRole)}
                        disabled={!canImportCurrentDeck}
                      />
                    </label>
                  </>
                ) : (
                  <label
                    className="glass-panel"
                    style={{
                      padding: '0.5rem',
                      background: 'var(--bg-surface-elevated)',
                      textAlign: 'center',
                      cursor: canImportCurrentDeck ? 'pointer' : 'not-allowed',
                      fontSize: '0.875rem',
                      opacity: canImportCurrentDeck ? 1 : 0.5
                    }}
                  >
                    Import Deck (.json)
                    <input
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={(event) => handleDeckUpload(event, bottomRole)}
                      disabled={!canImportCurrentDeck}
                    />
                  </label>
                )}
                <button
                  onClick={() => drawCard(bottomRole)}
                  className="glass-panel"
                  disabled={gameState.gameStatus !== 'playing'}
                  style={{
                    padding: '0.5rem',
                    background: 'var(--accent-primary)',
                    fontWeight: 'bold',
                    opacity: gameState.gameStatus === 'playing' ? 1 : 0.5,
                    cursor: gameState.gameStatus === 'playing' ? 'pointer' : 'not-allowed'
                  }}
                >
                  Draw Card
                </button>

                <button
                  onClick={() => millCard(bottomRole)}
                  className="glass-panel"
                  disabled={gameState.gameStatus !== 'playing'}
                  style={{
                    padding: '0.5rem',
                    background: '#64748b', // Slate color for mill
                    fontWeight: 'bold',
                    opacity: gameState.gameStatus === 'playing' ? 1 : 0.5,
                    cursor: gameState.gameStatus === 'playing' ? 'pointer' : 'not-allowed'
                  }}
                >
                  Mill Card (デッキ破棄)
                </button>

                {(isSoloMode ? gameState.gameStatus === 'playing' : gameState.turnPlayer === role && gameState.gameStatus === 'playing') && (
                  <button onClick={endTurn} className="glass-panel" style={{ padding: '0.5rem', background: '#f59e0b', color: 'black', fontWeight: 'bold', marginBottom: '4px' }}>
                    {isSoloMode ? `End ${currentTurnLabel} Turn` : 'END TURN'}
                  </button>
                )}

                <button onClick={() => spawnToken(bottomRole)} className="glass-panel" style={{ padding: '0.5rem', background: 'var(--accent-secondary)' }}>
                  Spawn Token
                </button>
                {isSoloMode && (
                  <>
                    <button onClick={() => drawCard(topRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing'} style={{ padding: '0.5rem', background: '#6366f1', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' ? 'pointer' : 'not-allowed' }}>
                      Draw {topLabel}
                    </button>
                    <button onClick={() => millCard(topRole)} className="glass-panel" disabled={gameState.gameStatus !== 'playing'} style={{ padding: '0.5rem', background: '#475569', fontWeight: 'bold', opacity: gameState.gameStatus === 'playing' ? 1 : 0.5, cursor: gameState.gameStatus === 'playing' ? 'pointer' : 'not-allowed' }}>
                      Mill {topLabel}
                    </button>
                    <button onClick={() => spawnToken(topRole)} className="glass-panel" style={{ padding: '0.5rem', background: '#7c3aed' }}>
                      Spawn {topLabel} Token
                    </button>
                  </>
                )}
                <button onClick={() => setShowResetConfirm(true)} className="glass-panel" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontWeight: 'bold' }}>
                  Reset Game
                </button>
                {renderPlayerTracker(bottomRole, bottomLabel)}
                {isSoloMode && renderPlayerTracker(topRole, topLabel)}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Mulligan Modal */}
      {isMulliganModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '800px', width: '90%', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>Mulligan: Select Return Order</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select cards in the order you want to put them on the <strong>bottom</strong> of your deck.<br />
              (The 4th selection will be at the absolute bottom.)
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {gameState.cards.filter(c => c.zone === `hand-${mulliganTargetRole}`).map(card => {
                const selectionIndex = mulliganOrder.indexOf(card.id);
                return (
                  <div
                    key={card.id}
                    onClick={() => handleMulliganOrderSelect(card.id)}
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      border: selectionIndex !== -1 ? '3px solid var(--accent-primary)' : '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '4px',
                      transition: 'all 0.2s',
                      transform: selectionIndex !== -1 ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: selectionIndex !== -1 ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none'
                    }}
                  >
                    <img src={card.image} alt={card.name} style={{ width: '120px', borderRadius: '4px' }} />
                    {selectionIndex !== -1 && (
                      <div style={{
                        position: 'absolute', top: '-10px', right: '-10px',
                        background: 'var(--accent-primary)', color: 'white',
                        borderRadius: '50%', width: '28px', height: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                      }}>
                        {selectionIndex + 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setIsMulliganModalOpen(false)}
                style={{ padding: '0.6rem 1.5rem', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeMulligan(mulliganTargetRole)}
                disabled={mulliganOrder.length !== 4}
                style={{
                  padding: '0.6rem 2rem',
                  background: mulliganOrder.length === 4 ? 'var(--vivid-green-cyan)' : 'var(--bg-surface-elevated)',
                  color: mulliganOrder.length === 4 ? 'black' : 'var(--text-muted)',
                  fontWeight: 'bold', border: 'none', borderRadius: '4px',
                  cursor: mulliganOrder.length === 4 ? 'pointer' : 'not-allowed',
                  boxShadow: mulliganOrder.length === 4 ? '0 0 10px rgba(0, 208, 132, 0.3)' : 'none'
                }}
              >
                Exchange (Mulligan)
              </button>
            </div>
          </div>
        </div>
      )}

      <CardSearchModal
        isOpen={searchZone !== null}
        onClose={() => setSearchZone(null)}
        title={searchZone?.title || ''}
        allowHandExtraction={gameState.gameStatus === 'playing'}
        cards={searchZone ? (
          (searchZone.id.startsWith('evolveDeck-') && !isSoloMode && !searchZone.id.endsWith(role)
            ? getCards(searchZone.id).filter(c => !c.isFlipped)
            : getCards(searchZone.id)
          ).slice()
        ) : []}
        onExtractCard={(cardId, destination) => handleExtractCard(cardId, destination, searchTargetRole)}
        onToggleFlip={(cardId) => handleFlipCard(cardId, searchTargetRole)}
        viewerRole={searchTargetRole}
        targetRole={searchTargetRole}
      />

      <TopDeckModal
        isOpen={topDeckCards.length > 0}
        cards={topDeckCards}
        onConfirm={(results) => handleResolveTopDeck(results, topDeckTargetRole)}
        onCancel={() => setTopDeckCards([])}
      />

      {isTopNInputOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem', color: 'white' }}>How many cards to look at?</h3>
            <input 
              type="number" 
              value={topNValue} 
              onChange={(e) => setTopNValue(Number(e.target.value))} 
              min="1" max="50"
              style={{ padding: '0.5rem', borderRadius: '4px', background: 'black', color: 'white', border: '1px solid #444', fontSize: '1.25rem', textAlign: 'center', width: '80px', marginBottom: '1.5rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setIsTopNInputOpen(false)} style={{ padding: '0.5rem 1.5rem', background: '#333', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none' }}>Cancel</button>
              <button onClick={() => {
                handleLookAtTop(topNValue, topDeckTargetRole);
                setIsTopNInputOpen(false);
              }} style={{ padding: '0.5rem 1.5rem', background: 'var(--accent-primary)', color: 'white', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>Look</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Global Overlays */}
      {coinMessage && (
        <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.85)', color: 'var(--vivid-green-cyan)', padding: '1.5rem 2.5rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--vivid-green-cyan)', fontSize: '1.25rem', fontWeight: 'bold', zIndex: 1000, boxShadow: 'var(--shadow-lg)' }}>
          {coinMessage}
        </div>
      )}

      {turnMessage && (
        <div style={{
          position: 'fixed',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.9)',
          color: '#f59e0b',
          padding: '2rem 4rem',
          borderRadius: 'var(--radius-lg)',
          border: '4px double #f59e0b',
          fontSize: '3rem',
          fontWeight: '900',
          zIndex: 2000,
          boxShadow: '0 0 30px rgba(245,158,11,0.4)',
          textShadow: '0 0 10px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          letterSpacing: '8px'
        }}>
          {turnMessage}
        </div>
      )}

      {showResetConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '2rem', borderRadius: 'var(--radius-md)', maxWidth: '400px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#fca5a5' }}>Reset Game</h3>
            <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)' }}>Are you sure you want to reset the game to its initial state? All cards will return to their starting decks.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setShowResetConfirm(false)} style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', color: 'white', cursor: 'pointer', borderRadius: '4px' }}>Cancel</button>
              <button onClick={confirmResetGame} style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>Yes, Reset</button>
            </div>
          </div>
        </div>
      )}

      {showUndoConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '2rem', borderRadius: 'var(--radius-md)', maxWidth: '420px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#f9a8d4' }}>Undo Last End Turn</h3>
            <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              相手のターン開始後の操作も取り消します。続けますか？
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowUndoConfirm(false)}
                style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', color: 'white', cursor: 'pointer', borderRadius: '4px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowUndoConfirm(false);
                  handleUndoTurn();
                }}
                style={{ padding: '0.5rem 1rem', background: '#ec4899', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
              >
                Yes, Undo
              </button>
            </div>
          </div>
        </div>
      )}

      {isRollingDice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          pointerEvents: 'none'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            background: 'white',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '4rem',
            fontWeight: '900',
            color: '#1f2937',
            boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)',
            border: '4px solid #8b5cf6',
            animation: 'diceRoll 0.1s infinite alternate'
          }}>
            {diceValue}
          </div>
          <style>{`
            @keyframes diceRoll {
              from { transform: rotate(-10deg) scale(0.9); }
              to { transform: rotate(10deg) scale(1.1); }
            }
          `}</style>
        </div>
      )}
    </DndContext>
  );
};

export default GameBoard;
