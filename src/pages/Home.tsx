import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, PenTool, Sword, Users } from 'lucide-react';
import { isDummyCardArtEnabled } from '../utils/cardArtMode';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
const IS_DUMMY_CARD_ART_BUILD = isDummyCardArtEnabled();

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

  const handleSoloPlay = () => {
    navigate('/game?mode=solo');
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

        {IS_DUMMY_CARD_ART_BUILD && (
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem',
              textAlign: 'left',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(15, 23, 42, 0.55))'
            }}
          >
            <h2 style={{ margin: '0 0 0.6rem 0', fontSize: '1rem', color: '#fbbf24' }}>
              Dummy Card Art Build
            </h2>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
              このサイトでは現在カード画像がダミー表示になっています。実際のカード画像を使いたい場合は、
              {' '}
              <a
                href="https://github.com/zkousei/shadowverse-evolve-simulator"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#fcd34d', fontWeight: 700, textDecoration: 'underline' }}
              >
                GitHub
              </a>
              {' '}
              からソースをダウンロードしてローカルで実行してください。ローカル実行でも P2P 対戦は可能です。
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
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

          <button 
            onClick={handleSoloPlay}
            className="glass-panel"
            style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'var(--transition-normal)', position: 'relative' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              color: '#111827',
              background: '#f59e0b',
              padding: '0.2rem 0.45rem',
              borderRadius: '999px'
            }}>
              BETA
            </span>
            <Sword size={48} color="#f59e0b" />
            <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>Solo Play Beta</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Practice locally with 2 decks. This mode is still under active tuning.</span>
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

      <div style={{ position: 'fixed', bottom: '1rem', textAlign: 'center', maxWidth: '800px', padding: '0 1rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
          Version {APP_VERSION}
        </p>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          当サイトに使用しているカード画像は、Shadowverse EVOLVE公式サイト(https://shadowverse-evolve.com/)より、ガイドラインに従って転載しております。該当画像の再利用（転載・配布等）は禁止しております。© Cygames, Inc. ©bushiroad All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default Home;
