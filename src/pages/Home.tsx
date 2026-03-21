import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, PenTool, Sword, Users } from 'lucide-react';
import { isDummyCardArtEnabled } from '../utils/cardArtMode';
import { generateRoomCode } from '../utils/roomCode';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
const IS_DUMMY_CARD_ART_BUILD = isDummyCardArtEnabled();

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    navigate(`/game?host=true&room=${generateRoomCode()}`);
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '2rem' }}>
      <div
        className="animate-fade-in"
        style={{
          textAlign: 'center',
          maxWidth: '600px',
          width: '100%',
          margin: 'auto',
        }}
      >
        <h1 style={{ 
          fontSize: '3.5rem', 
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: '1.1'
        }}>
          {t('home.title')}
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
          {t('home.subtitle')}
        </p>

        {IS_DUMMY_CARD_ART_BUILD && (
          <div
            className="glass-panel"
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '2rem',
              textAlign: 'left',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.45))'
            }}
          >
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
              {t('home.dummyArtWarning.part1')}
              {' '}
              <a
                href="https://github.com/zkousei/shadowverse-evolve-simulator"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#fcd34d', textDecoration: 'underline' }}
              >
                {t('home.dummyArtWarning.link')}
              </a>
              {' '}
              {t('home.dummyArtWarning.part2')}
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
            <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{t('home.cards.deckBuilder.title')}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('home.cards.deckBuilder.desc')}</span>
          </button>

          <button 
            onClick={handleCreateRoom}
            className="glass-panel"
            style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'var(--transition-normal)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Play size={48} color="var(--accent-primary)" />
            <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{t('home.cards.hostGame.title')}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('home.cards.hostGame.desc')}</span>
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
              {t('home.cards.soloPlay.badge')}
            </span>
            <Sword size={48} color="#f59e0b" />
            <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{t('home.cards.soloPlay.title')}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('home.cards.soloPlay.desc')}</span>
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Users size={24} /> {t('home.joinGame.title')}
          </h2>
          <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder={t('home.joinGame.placeholder')} 
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
              {t('home.joinGame.button')}
            </button>
          </form>
        </div>

      </div>

      <div style={{ textAlign: 'center', maxWidth: '800px', width: '100%', margin: '2rem auto 0', padding: '0 1rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
          {t('home.footer.version', { version: APP_VERSION })}
        </p>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          {t('home.footer.copyright')}
        </p>
      </div>
    </div>
  );
};

export default Home;
