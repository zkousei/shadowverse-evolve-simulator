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
import enTranslations from '../i18n/en/translation.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const parts = key.split('.');
      let result: unknown = enTranslations;
      for (const p of parts) {
        if (result == null) return key;
        result = typeof result === 'object' ? (result as Record<string, unknown>)[p] : undefined;
      }
      return typeof result === 'string' ? result : key;
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}));

describe('Home', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('navigates to the deck builder and solo mode actions', () => {
    render(<Home />);

    fireEvent.click(screen.getByText(enTranslations.home.cards.deckBuilder.title));
    fireEvent.click(screen.getByText(enTranslations.home.cards.soloPlay.title));

    expect(navigateMock).toHaveBeenNthCalledWith(1, '/deck-builder');
    expect(navigateMock).toHaveBeenNthCalledWith(2, '/game?mode=solo');
  });

  it('creates a host room with a generated id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    render(<Home />);

    fireEvent.click(screen.getByText(enTranslations.home.cards.hostGame.title));

    expect(navigateMock).toHaveBeenCalledWith('/game?host=true&room=4FZZZX');
  });

  it('joins a trimmed room id and disables empty submits', () => {
    render(<Home />);

    const joinButton = screen.getByRole('button', { name: enTranslations.home.joinGame.button });
    expect(joinButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(enTranslations.home.joinGame.placeholder), {
      target: { value: '  ROOM42  ' },
    });
    expect(joinButton).toBeEnabled();

    fireEvent.click(joinButton);
    expect(navigateMock).toHaveBeenCalledWith('/game?host=false&room=ROOM42');
  });

  it('updates button and input styles on hover/focus and shows footer copy', () => {
    render(<Home />);

    const deckBuilderButton = screen.getByText(enTranslations.home.cards.deckBuilder.title).closest('button') as HTMLButtonElement;
    fireEvent.mouseOver(deckBuilderButton);
    expect(deckBuilderButton.style.transform).toBe('translateY(-4px)');
    fireEvent.mouseOut(deckBuilderButton);
    expect(deckBuilderButton.style.transform).toBe('translateY(0)');

    const roomInput = screen.getByPlaceholderText(enTranslations.home.joinGame.placeholder) as HTMLInputElement;
    fireEvent.focus(roomInput);
    expect(roomInput.style.borderColor).toBe('var(--border-focus)');
    fireEvent.blur(roomInput);
    expect(roomInput.style.borderColor).toBe('var(--border-light)');

    expect(screen.getByText('BETA')).toBeInTheDocument();
    expect(screen.getByText(/reproduced from the/)).toBeInTheDocument();
  });
});
