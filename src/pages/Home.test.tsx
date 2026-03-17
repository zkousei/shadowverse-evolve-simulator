import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Home from './Home';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('Home', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('navigates to the deck builder and solo mode actions', () => {
    render(<Home />);

    fireEvent.click(screen.getByText('Deck Builder'));
    fireEvent.click(screen.getByText('Solo Play Beta'));

    expect(navigateMock).toHaveBeenNthCalledWith(1, '/deck-builder');
    expect(navigateMock).toHaveBeenNthCalledWith(2, '/game?mode=solo');
  });

  it('creates a host room with a generated id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    render(<Home />);

    fireEvent.click(screen.getByText('Host Game'));

    expect(navigateMock).toHaveBeenCalledWith('/game?host=true&room=4FZZZX');
  });

  it('joins a trimmed room id and disables empty submits', () => {
    render(<Home />);

    const joinButton = screen.getByRole('button', { name: 'Join' });
    expect(joinButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Enter Room Code...'), {
      target: { value: '  ROOM42  ' },
    });
    expect(joinButton).toBeEnabled();

    fireEvent.click(joinButton);
    expect(navigateMock).toHaveBeenCalledWith('/game?host=false&room=ROOM42');
  });
});
