import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./pages/Home', () => ({
  default: () => <div>Mock Home Page</div>,
}));

vi.mock('./pages/DeckBuilder', () => ({
  default: () => <div>Mock Deck Builder</div>,
}));

vi.mock('./pages/GameBoard', () => ({
  default: () => <div>Mock Game Board</div>,
}));

describe('App', () => {
  it('renders the navigation shell and home route', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(screen.getByText('Shadowverse Evolve Tabletop')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Deck Builder' })).toHaveAttribute('href', '/deck-builder');
    expect(screen.getByText('Mock Home Page')).toBeInTheDocument();
  });

  it('renders the deck builder route', () => {
    window.history.pushState({}, '', '/deck-builder');
    render(<App />);

    expect(screen.getByText('Mock Deck Builder')).toBeInTheDocument();
  });
});
