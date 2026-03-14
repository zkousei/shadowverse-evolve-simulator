import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, PenTool, Users } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    // Generate a quick ID
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/game?host=true&room=${newRoom}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/game?host=false&room=${roomId.trim()}`);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '600px', width: '100%' }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: '1.1'
        }}>
          Shadowverse Evolve
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
          The unofficial digital sandbox tabletop. Build your deck and duel your friends directly via Peer-to-Peer without any servers.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          
          <button 
            onClick={() => navigate('/deck-builder')}
            className="glass-panel"
            style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'var(--transition-normal)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <PenTool size={48} color="var(--accent-secondary)" />
            <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>Deck Builder</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Construct your 40-50 card deck</span>
          </button>

          <button 
            onClick={handleCreateRoom}
            className="glass-panel"
            style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'var(--transition-normal)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Play size={48} color="var(--accent-primary)" />
            <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>Host Game</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Create a new P2P room</span>
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Users size={24} /> Join Game
          </h2>
          <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Enter Room Code..." 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'rgba(0,0,0,0.2)',
                color: 'var(--text-main)',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
            />
            <button 
              type="submit"
              disabled={!roomId.trim()}
              style={{
                padding: '0 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: 'var(--radius-md)',
                backgroundColor: roomId.trim() ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                color: roomId.trim() ? '#fff' : 'var(--text-muted)',
                transition: 'var(--transition-fast)'
              }}
            >
              Join
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Home;
