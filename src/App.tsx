import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Home from './pages/Home';
import DeckBuilder from './pages/DeckBuilder';
import GameBoard from './pages/GameBoard';
import { generateRoomCode } from './utils/roomCode';

const navLinkStyle: React.CSSProperties = {
  color: 'var(--text-main)',
  textDecoration: 'none',
};

const menuButtonStyle: React.CSSProperties = {
  color: 'var(--text-main)',
  textDecoration: 'none',
  fontSize: '1rem',
  lineHeight: 1,
};

function AppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const playMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [isPlayMenuOpen, setIsPlayMenuOpen] = React.useState(false);
  const langMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = React.useState(false);
  const [roomId, setRoomId] = React.useState('');

  React.useEffect(() => {
    if (!isPlayMenuOpen && !isLangMenuOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isPlayMenuOpen && !playMenuRef.current?.contains(target)) {
        setIsPlayMenuOpen(false);
      }
      if (isLangMenuOpen && !langMenuRef.current?.contains(target)) {
        setIsLangMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPlayMenuOpen(false);
        setIsLangMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlayMenuOpen, isLangMenuOpen]);

  React.useEffect(() => {
    setIsPlayMenuOpen(false);
    setIsLangMenuOpen(false);
    setRoomId('');
  }, [location.pathname, location.search]);

  const handleSoloPlay = () => {
    navigate('/game?mode=solo');
  };

  const handleCreateRoom = () => {
    navigate(`/game?host=true&room=${generateRoomCode()}`);
  };

  const handleJoinRoom = (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomId.trim()) return;
    navigate(`/game?host=false&room=${roomId.trim()}`);
  };

  const { t, i18n } = useTranslation();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language;
  const normalizedLanguage = activeLanguage.startsWith('ja') ? 'ja' : 'en';

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setIsLangMenuOpen(false);
  };

  return (
    <nav style={{
      padding: '1rem 2rem',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex',
      gap: '1.5rem',
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 'bold', marginRight: 'auto' }}>
        Shadowverse Evolve Tabletop
      </div>
      <Link to="/" style={navLinkStyle}>{t('nav.home')}</Link>
      <Link to="/deck-builder" style={navLinkStyle}>{t('nav.deckBuilder')}</Link>
      <div ref={playMenuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setIsPlayMenuOpen(current => !current)}
          aria-haspopup="menu"
          aria-expanded={isPlayMenuOpen}
          style={menuButtonStyle}
        >
          {t('nav.play')}
        </button>
        {isPlayMenuOpen && (
          <div
            role="menu"
            aria-label="Play menu"
            className="glass-panel"
            style={{
              position: 'absolute',
              top: 'calc(100% + 0.75rem)',
              right: 0,
              minWidth: '260px',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              zIndex: 1000,
              background: 'rgba(26, 29, 36, 0.94)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleSoloPlay}
              style={{
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.18)',
                color: 'var(--text-main)',
                textAlign: 'left',
                fontWeight: 700,
              }}
            >
              {t('nav.solo')}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleCreateRoom}
              style={{
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.18)',
                color: 'var(--text-main)',
                textAlign: 'left',
                fontWeight: 700,
              }}
            >
              {t('nav.hostGame')}
            </button>
            <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <label htmlFor="global-play-room-code" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t('nav.joinGame')}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="global-play-room-code"
                  type="text"
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                  placeholder={t('nav.roomCode')}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '0.55rem 0.7rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'rgba(0,0,0,0.2)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!roomId.trim()}
                  style={{
                    padding: '0 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    background: roomId.trim() ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                    color: roomId.trim() ? '#fff' : 'var(--text-muted)',
                    fontWeight: 700,
                  }}
                >
                  {t('nav.join')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      <div ref={langMenuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setIsLangMenuOpen(current => !current)}
          aria-haspopup="listbox"
          aria-expanded={isLangMenuOpen}
          style={{
            padding: '0.45rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-main)',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'border-color var(--transition-fast)',
          }}
        >
          <span>{normalizedLanguage === 'en' ? 'English' : '日本語'}</span>
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            style={{ transform: isLangMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
          >
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {isLangMenuOpen && (
          <div
            role="listbox"
            className="glass-panel"
            style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              right: 0,
              minWidth: '120px',
              padding: '0.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
              zIndex: 1000,
              background: 'rgba(26, 29, 36, 0.96)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {[
              { code: 'en', label: 'English' },
              { code: 'ja', label: '日本語' },
            ].map(lang => (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={normalizedLanguage === lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  color: normalizedLanguage === lang.code ? 'var(--text-main)' : 'var(--text-muted)',
                  background: normalizedLanguage === lang.code ? 'rgba(59, 130, 246, 0.15)' : 'none',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  fontWeight: normalizedLanguage === lang.code ? 700 : 400,
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  if (normalizedLanguage !== lang.code) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={e => {
                  if (normalizedLanguage !== lang.code) e.currentTarget.style.background = 'none';
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppNavigation />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/deck-builder" element={<DeckBuilder />} />
          <Route path="/game" element={<GameBoard />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
