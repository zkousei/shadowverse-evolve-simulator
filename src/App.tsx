
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import DeckBuilder from './pages/DeckBuilder';
import GameBoard from './pages/GameBoard';

function App() {
  return (
    <BrowserRouter>
      <nav style={{
        padding: '1rem 2rem',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        gap: '2rem',
        alignItems: 'center'
      }}>
        <div style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 'bold', marginRight: 'auto' }}>
          Shadowverse Evolve Tabletop
        </div>
        <Link to="/" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Home</Link>
        <Link to="/deck-builder" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Deck Builder</Link>
      </nav>
      
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
