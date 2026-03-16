import React from 'react';
import { DndContext } from '@dnd-kit/core';
import Zone from '../components/Zone';
import CardSearchModal from '../components/CardSearchModal';
import { useGameBoardLogic } from '../hooks/useGameBoardLogic';

const GameBoard: React.FC = () => {
  const {
    room, isHost, role, status, gameState, searchZone, setSearchZone,
    showResetConfirm, setShowResetConfirm, coinMessage, turnMessage,
    isRollingDice, diceValue, mulliganOrder, isMulliganModalOpen, setIsMulliganModalOpen,
    handleStatChange, setPhase, endTurn, handleUndoTurn, handleSetInitialTurnOrder,
    handlePureCoinFlip, handleRollDice, handleStartGame, handleToggleReady,
    handleDrawInitialHand, startMulligan, handleMulliganOrderSelect, executeMulligan,
    drawCard, handleExtractCard, confirmResetGame, handleDeckUpload, spawnToken,
    handleModifyCounter, handleDragEnd, toggleTap, handleFlipCard, handleSendToBottom,
    handleBanish, handlePlayToField, handleSendToCemetery, handleReturnEvolve, handleShuffleDeck,
    getCards, lastGameState, millCard
  } = useGameBoardLogic();

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflow: 'hidden' }}>

        {/* Header bar */}
        {/* Header bar tracking Phase / Turn */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>Room: <strong>{room}</strong></span>
            <span style={{ color: status.includes('ready') ? 'var(--vivid-green-cyan)' : 'var(--text-muted)' }}>{status}</span>

            {gameState.gameStatus === 'preparing' ? (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => handleSetInitialTurnOrder()}
                  disabled={!isHost}
                  style={{ padding: '0.3rem 0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: isHost ? 1 : 0.5 }}
                >
                  🪙 Decide Turn Order (Random)
                </button>
                <button
                  onClick={() => handleSetInitialTurnOrder(role)}
                  disabled={!isHost}
                  style={{ padding: '0.3rem 0.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: isHost ? 1 : 0.5 }}
                >
                  Me 1st
                </button>
                <button
                  onClick={() => handleSetInitialTurnOrder(isHost ? 'guest' : 'host')}
                  disabled={!isHost}
                  style={{ padding: '0.3rem 0.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: isHost ? 1 : 0.5 }}
                >
                  Opp 1st
                </button>
                {!gameState[role].initialHandDrawn && (
                  <button
                    onClick={handleDrawInitialHand}
                    style={{ padding: '0.3rem 0.6rem', background: '#3b82f6', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    🃏 Draw Hand (4)
                  </button>
                )}

                <button
                  onClick={handleStartGame}
                  disabled={!isHost || !gameState.host.isReady || !gameState.guest.isReady}
                  style={{
                    padding: '0.3rem 0.6rem',
                    background: 'var(--vivid-green-cyan)',
                    color: 'black',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (isHost && gameState.host.isReady && gameState.guest.isReady) ? 'pointer' : 'not-allowed',
                    fontSize: '0.75rem',
                    opacity: (isHost && gameState.host.isReady && gameState.guest.isReady) ? 1 : 0.5,
                    boxShadow: (isHost && gameState.host.isReady && gameState.guest.isReady) ? '0 0 10px rgba(0, 208, 132, 0.4)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { if (isHost && gameState.host.isReady && gameState.guest.isReady) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                  onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                >
                  ▶ START GAME
                </button>

                {gameState[role].initialHandDrawn && (
                  <button
                    onClick={handleToggleReady}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: gameState[role].isReady ? '#ef4444' : 'var(--vivid-green-cyan)',
                      color: gameState[role].isReady ? 'white' : 'black',
                      fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem'
                    }}
                  >
                    {gameState[role].isReady ? '✕ Cancel Ready' : '✅ Ready (準備完了)'}
                  </button>
                )}

                <div style={{ display: 'flex', gap: '0.8rem', marginLeft: '0.5rem', borderLeft: '1px solid var(--border-light)', paddingLeft: '0.8rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>HOST</span>
                    <span style={{ color: gameState.host.isReady ? 'var(--vivid-green-cyan)' : '#ef4444', fontWeight: 'bold' }}>
                      {gameState.host.isReady ? 'READY' : (gameState.host.initialHandDrawn ? 'DECIDING' : 'WAITING')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>GUEST</span>
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

            {gameState.turnPlayer !== role && lastGameState && (
              <button
                onClick={handleUndoTurn}
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
              <span style={{ color: gameState.turnPlayer === role ? 'var(--vivid-green-cyan)' : 'var(--vivid-red)' }}>
                {gameState.turnPlayer === role ? "YOUR TURN" : "OPPONENT'S TURN"}
              </span>
              <span className="Garamond">TURN {gameState.turnCount}</span>
              <select
                value={gameState.phase}
                onChange={(e) => setPhase(e.target.value as 'Start' | 'Main' | 'End')}
                disabled={gameState.turnPlayer !== role}
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
                <span>Opponent HP: <strong style={{ color: '#ef4444' }}>{gameState[isHost ? 'guest' : 'host'].hp}</strong></span>
                <span>PP: <strong style={{ color: '#3b82f6' }}>{gameState[isHost ? 'guest' : 'host'].pp}</strong> / {gameState[isHost ? 'guest' : 'host'].maxPp}</span>
                <span>EP: <strong style={{ color: '#fbbf24' }}>{gameState[isHost ? 'guest' : 'host'].ep}</strong></span>
                <span>SEP: <strong style={{ color: '#facc15' }}>{gameState[isHost ? 'guest' : 'host'].sep}</strong></span>
                <span>Combo: <strong>{gameState[isHost ? 'guest' : 'host'].combo}</strong></span>
              </div>
            </div>            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', width: '100%' }}>
              {/* Opponent Hand (STRICT HIDDEN) */}
              <div style={{ width: '110px' }}>
                <Zone id={`hand-${isHost ? 'guest' : 'host'}`} label="Opponent Hand" cards={getCards(`hand-${isHost ? 'guest' : 'host'}`)} hideCards={true} layout="stack" isProtected={true} viewerRole={role} containerStyle={{ minHeight: '150px' }} />
              </div>

              <Zone id={`ex-${isHost ? 'guest' : 'host'}`} label="Opponent EX Area" cards={getCards(`ex-${isHost ? 'guest' : 'host'}`)} isProtected={true} viewerRole={role} containerStyle={{ maxWidth: '600px', minHeight: '150px', flex: 'none', width: '600px' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Zone id={`evolveDeck-${isHost ? 'guest' : 'host'}`} label="Opponent Evolve Deck" cards={getCards(`evolveDeck-${isHost ? 'guest' : 'host'}`)} layout="stack" isProtected={true} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                  <button onClick={() => setSearchZone({ id: `evolveDeck-${isHost ? 'guest' : 'host'}`, title: "Opponent's Evolve Deck (Used)" })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                </div>
                <Zone id={`mainDeck-${isHost ? 'guest' : 'host'}`} label="Opponent Main Deck" cards={getCards(`mainDeck-${isHost ? 'guest' : 'host'}`)} layout="stack" isProtected={true} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Zone id={`cemetery-${isHost ? 'guest' : 'host'}`} label="Opponent Cemetery" cards={getCards(`cemetery-${isHost ? 'guest' : 'host'}`)} layout="stack" viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                  <button onClick={() => setSearchZone({ id: `cemetery-${isHost ? 'guest' : 'host'}`, title: "Opponent's Cemetery" })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Zone id={`banish-${isHost ? 'guest' : 'host'}`} label="Opponent Banish" cards={getCards(`banish-${isHost ? 'guest' : 'host'}`)} layout="stack" viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                  <button onClick={() => setSearchZone({ id: `banish-${isHost ? 'guest' : 'host'}`, title: "Opponent's Banish Zone" })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                </div>
              </div>
            </div>
            <Zone id={`field-${isHost ? 'guest' : 'host'}`} label="Opponent Field" cards={getCards(`field-${isHost ? 'guest' : 'host'}`)} onTap={toggleTap} onModifyCounter={handleModifyCounter} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} viewerRole={role} containerStyle={{ maxWidth: '850px', minHeight: '160px', width: '850px', flex: 'none' }} />
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />

          {/* MY BOARD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Zone id={`field-${role}`} label="My Field" cards={getCards(`field-${role}`)} onTap={toggleTap} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} viewerRole={role} containerStyle={{ maxWidth: '850px', minHeight: '160px', width: '850px', flex: 'none' }} />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Zone id={`ex-${role}`} label="My EX Area" cards={getCards(`ex-${role}`)} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onReturnEvolve={handleReturnEvolve} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} viewerRole={role} containerStyle={{ maxWidth: '600px', minHeight: '160px', flex: 'none', width: '600px' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`banish-${role}`} label="Banish" cards={getCards(`banish-${role}`)} layout="stack" onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onCemetery={handleSendToCemetery} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                <button onClick={() => setSearchZone({ id: `banish-${role}`, title: 'Banish Zone' })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`cemetery-${role}`} label="Cemetery" cards={getCards(`cemetery-${role}`)} layout="stack" onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                <button onClick={() => setSearchZone({ id: `cemetery-${role}`, title: 'Cemetery' })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`evolveDeck-${role}`} label="Evolve Deck" cards={getCards(`evolveDeck-${role}`)} layout="stack" isProtected={true} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                <button onClick={() => setSearchZone({ id: `evolveDeck-${role}`, title: 'Evolve Deck' })} style={{ fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Zone id={`mainDeck-${role}`} label="Main Deck" cards={getCards(`mainDeck-${role}`)} layout="stack" isProtected={true} viewerRole={role} containerStyle={{ minWidth: '110px', minHeight: '150px' }} />
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button onClick={() => setSearchZone({ id: `mainDeck-${role}`, title: 'Main Deck' })} style={{ flex: 1, fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
                  <button onClick={handleShuffleDeck} style={{ flex: 1, fontSize: '0.75rem', padding: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Shuffle</button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
              <div style={{ width: '850px', minHeight: '160px', position: 'relative' }}>
                {/* My Hand - strictly hidden from opponent but visible to me */}
                <Zone id={`hand-${role}`} label="My Hand" cards={getCards(`hand-${role}`)} onModifyCounter={handleModifyCounter} onSendToBottom={handleSendToBottom} onBanish={handleBanish} onCemetery={handleSendToCemetery} onPlayToField={handlePlayToField} isProtected={true} viewerRole={role} containerStyle={{ minHeight: '160px' }} />

                {/* Mulligan Button Overlay near hand */}
                {gameState.gameStatus === 'preparing' && gameState[role].initialHandDrawn && !gameState[role].mulliganUsed && (
                  <button
                    onClick={startMulligan}
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

                <label className="glass-panel" style={{ padding: '0.5rem', background: 'var(--bg-surface-elevated)', textAlign: 'center', cursor: 'pointer', fontSize: '0.875rem' }}>
                  Import Deck (.json)
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleDeckUpload} />
                </label>
                <button
                  onClick={drawCard}
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
                  onClick={millCard}
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

                {gameState.turnPlayer === role && (
                  <button onClick={endTurn} className="glass-panel" style={{ padding: '0.5rem', background: '#f59e0b', color: 'black', fontWeight: 'bold', marginBottom: '4px' }}>
                    END TURN
                  </button>
                )}

                <button onClick={spawnToken} className="glass-panel" style={{ padding: '0.5rem', background: 'var(--accent-secondary)' }}>
                  Spawn Token
                </button>
                <button onClick={() => setShowResetConfirm(true)} className="glass-panel" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontWeight: 'bold' }}>
                  Reset Game
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>HP: {gameState[role].hp}</span>
                  <div>
                    <button onClick={() => handleStatChange(role, 'hp', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
                    <button onClick={() => handleStatChange(role, 'hp', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>EP: {gameState[role].ep}</span>
                  <div>
                    <button onClick={() => handleStatChange(role, 'ep', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
                    <button onClick={() => handleStatChange(role, 'ep', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#facc15', fontWeight: 'bold' }}>SEP: {gameState[role].sep}</span>
                  <div>
                    <button onClick={() => handleStatChange(role, 'sep', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
                    <button onClick={() => handleStatChange(role, 'sep', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>Combo (Play): {gameState[role].combo}</span>
                  <div>
                    <button onClick={() => handleStatChange(role, 'combo', 1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>+</button>
                    <button onClick={() => handleStatChange(role, 'combo', -1)} style={{ padding: '2px 8px', background: 'var(--bg-surface)' }}>-</button>
                  </div>
                </div>

                {/* PP Tracker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem', padding: '0.6rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: 'inset 0 0 10px rgba(59, 130, 246, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Max PP Adjustment (Vertical) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <button onClick={() => handleStatChange(role, 'maxPp', 1)} style={{ width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '2px', cursor: 'pointer', fontSize: '0.75rem', color: '#fff' }}>+</button>
                      <span style={{ fontSize: '0.6rem', color: '#93c5fd', fontWeight: 'bold' }}>MAX</span>
                      <button onClick={() => handleStatChange(role, 'maxPp', -1)} style={{ width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '2px', cursor: 'pointer', fontSize: '0.75rem', color: '#fff' }}>-</button>
                    </div>

                    {/* PP Display */}
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-2px' }}>Play Points</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px' }}>
                        <span style={{ color: '#3b82f6', fontWeight: '900', fontSize: '1.75rem', textShadow: '0 0 15px rgba(59, 130, 246, 0.5)' }}>
                          {gameState[role].pp}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', fontWeight: 'bold' }}>/</span>
                        <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold' }}>
                          {gameState[role].maxPp}
                        </span>
                      </div>
                    </div>

                    {/* Current PP Adjustment (Horizontal) */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={() => handleStatChange(role, 'pp', -1)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', color: '#3b82f6', fontWeight: 'bold', transition: 'all 0.2s' }}>∨</button>
                      <button onClick={() => handleStatChange(role, 'pp', 1)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', color: '#3b82f6', fontWeight: 'bold', transition: 'all 0.2s' }}>∧</button>
                    </div>
                  </div>
                </div>
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
              {gameState.cards.filter(c => c.zone === `hand-${role}`).map(card => {
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
                onClick={executeMulligan}
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
          (searchZone.id.startsWith('evolveDeck-') && !searchZone.id.endsWith(role)
            ? getCards(searchZone.id).filter(c => !c.isFlipped)
            : getCards(searchZone.id)
          ).slice().reverse()
        ) : []}
        onExtractCard={handleExtractCard}
        onToggleFlip={handleFlipCard}
        viewerRole={role}
      />

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
