import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.getByText('Mock Home Page')).toBeInTheDocument();
  });

  it('renders the deck builder route', () => {
    window.history.pushState({}, '', '/deck-builder');
    render(<App />);

    expect(screen.getByText('Mock Deck Builder')).toBeInTheDocument();
  });

  it('navigates to solo mode from the play menu', () => {
    window.history.pushState({}, '', '/deck-builder');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Solo' }));

    expect(window.location.pathname).toBe('/game');
    expect(window.location.search).toBe('?mode=solo');
    expect(screen.getByText('Mock Game Board')).toBeInTheDocument();
  });

  it('creates a host room from the play menu', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.123456789);
    window.history.pushState({}, '', '/');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Host Game' }));

    expect(window.location.pathname).toBe('/game');
    expect(window.location.search).toBe('?host=true&room=4FZZZX');
    expect(screen.getByText('Mock Game Board')).toBeInTheDocument();
  });

  it('joins a room from the play menu', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.change(screen.getByLabelText('Join Game'), { target: { value: 'ROOM42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    expect(window.location.pathname).toBe('/game');
    expect(window.location.search).toBe('?host=false&room=ROOM42');
    expect(screen.getByText('Mock Game Board')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByPlaceholderText('Room Code')).toHaveValue('');
  });
});
