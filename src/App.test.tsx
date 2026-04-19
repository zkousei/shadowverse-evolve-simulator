import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const analyticsMock = vi.hoisted(() => ({
  props: [] as Array<{
    beforeSend?: (event: { url: string }) => { url: string } | null;
    debug?: boolean;
  }>,
}));

vi.mock('@vercel/analytics/react', () => ({
  Analytics: (props: {
    beforeSend?: (event: { url: string }) => { url: string } | null;
    debug?: boolean;
  }) => {
    analyticsMock.props.push(props);
    return <div data-testid="vercel-analytics" />;
  },
}));

vi.mock('./pages/Home', () => ({
  default: () => <div>Mock Home Page</div>,
}));

vi.mock('./pages/DeckBuilder', () => ({
  default: () => <div>Mock Deck Builder</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.home': 'Home',
        'nav.deckBuilder': 'Deck Builder',
        'nav.play': 'Play',
        'nav.solo': 'Solo',
        'nav.hostGame': 'Host Game',
        'nav.joinGame': 'Join Game',
        'nav.spectateGame': 'Spectate Game',
        'nav.join': 'Join',
        'nav.spectate': 'Spectate',
        'nav.roomCode': 'Room Code',
      };
      return translations[key] || key;
    },
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
}));

vi.mock('./pages/GameBoard', () => ({
  default: () => <div>Mock Game Board</div>,
}));

describe('App', () => {
  beforeEach(() => {
    analyticsMock.props = [];
    vi.unstubAllEnvs();
  });

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
    expect(screen.getByLabelText('Join Game')).toHaveValue('');
    expect(screen.getByLabelText('Spectate Game')).toHaveValue('');
  });

  it('spectates a room from the play menu', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const spectateButton = screen.getByRole('button', { name: 'Spectate' });
    expect(spectateButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Spectate Game'), { target: { value: '  ROOM77  ' } });
    expect(spectateButton).toBeEnabled();

    fireEvent.click(spectateButton);
    expect(window.location.pathname).toBe('/game');
    expect(window.location.search).toBe('?spectator=true&room=ROOM77');
    expect(screen.getByText('Mock Game Board')).toBeInTheDocument();
  });

  it('keeps join disabled for blank room ids and trims room codes before navigating', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const joinButton = screen.getByRole('button', { name: 'Join' });
    expect(joinButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Join Game'), { target: { value: '  ROOM99  ' } });
    expect(joinButton).toBeEnabled();

    fireEvent.click(joinButton);
    expect(window.location.pathname).toBe('/game');
    expect(window.location.search).toBe('?host=false&room=ROOM99');
  });

  it('opens and closes the language and play menus via outside click and escape', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('menu', { name: 'Play menu' })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu', { name: 'Play menu' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not render Vercel Analytics unless explicitly enabled for production', () => {
    vi.stubEnv('PROD', true);
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument();
    expect(analyticsMock.props).toHaveLength(0);
  });

  it('renders Vercel Analytics in enabled production builds with game URL redaction', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_ENABLE_VERCEL_ANALYTICS', 'true');
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument();
    expect(analyticsMock.props).toHaveLength(1);
    expect(analyticsMock.props[0]?.debug).toBe(false);
    expect(analyticsMock.props[0]?.beforeSend?.({
      url: 'https://example.com/game?host=true&room=ROOM123',
    })).toEqual({
      url: 'https://example.com/game',
    });
  });
});
