import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    mockPeerJs,
    renderHarness,
    installMockFileReader,
} from './__tests__/gameBoardTestUtils';

describe('useGameBoardSetupActions (via integration harness)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockPeerJs.reset();
        window.sessionStorage.clear();
    });

    afterEach(() => {
        act(() => {
            vi.runOnlyPendingTimers();
        });
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('imports a deck through the upload handler using FileReader', () => {
        const readAsText = installMockFileReader(JSON.stringify({
            mainDeck: [{
                id: 'BP01-101',
                name: 'Main Deck Card',
                image: '/main-deck-card.png',
                deck_section: 'main',
                card_kind_normalized: 'follower',
                related_cards: [{ id: 'BP01-T01', name: 'Token A' }],
            }],
            evolveDeck: [{
                id: 'BP02-101',
                name: 'Evolve Card',
                image: '/evolve-card.png',
                deck_section: 'evolve',
                card_kind_normalized: 'follower',
                related_cards: [{ id: 'BP02-T01', name: 'Token B' }],
            }],
            leaderCards: [{
                id: 'BP00-101',
                name: 'Leader Card',
                image: '/leader-card.png',
                deck_section: 'leader',
                card_kind_normalized: 'leader',
                related_cards: [{ id: 'BP00-T01', name: 'Token C' }],
            }],
        }));

        renderHarness('/game?mode=solo');

        const input = screen.getByTestId('deck-upload-input');
        const file = new File(['{}'], 'deck.json', { type: 'application/json' });
        fireEvent.change(input, { target: { files: [file] } });

        expect(readAsText).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('1');
        expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('1');
    });

    it('shows an alert when uploaded deck data cannot be parsed', () => {
        const readAsText = installMockFileReader('{invalid-json');
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

        renderHarness('/game?mode=solo');

        const input = screen.getByTestId('deck-upload-input');
        const file = new File(['{}'], 'broken.json', { type: 'application/json' });
        fireEvent.change(input, { target: { files: [file] } });

        expect(readAsText).toHaveBeenCalledTimes(1);
        expect(alertSpy).toHaveBeenCalledWith('deckBuilder.alerts.importFailed');
        expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('0');
        expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    });
});
