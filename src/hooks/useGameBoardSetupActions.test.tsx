import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameBoardSetupActions } from './useGameBoardSetupActions';
import { buildSyncState } from './__tests__/gameBoardTestUtils';

// Mock dependencies
vi.mock('../utils/gameRules', () => ({
    canImportDeck: vi.fn(),
}));
import { canImportDeck } from '../utils/gameRules';

describe('useGameBoardSetupActions (Pure Hook)', () => {
    const defaultArgs = {
        canInteract: true,
        gameState: buildSyncState(),
        role: 'host' as const,
        uuid: () => 'mock-uuid',
        dispatchGameEvent: vi.fn(),
        setShowResetConfirm: vi.fn(),
        t: (k: string) => k,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(canImportDeck).mockReturnValue(true);
    });

    it('confirmResetGame dispatches RESET_GAME and closes confirm dialog', () => {
        const { result } = renderHook(() => useGameBoardSetupActions(defaultArgs));
        result.current.confirmResetGame();

        expect(defaultArgs.setShowResetConfirm).toHaveBeenCalledWith(false);
        expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({ type: 'RESET_GAME' });
    });

    it('importDeckData dispatches IMPORT_DECK with generated payload', () => {
        const { result } = renderHook(() => useGameBoardSetupActions(defaultArgs));

        const mockDeckData = {
            mainDeck: [{ id: 'mock-1', name: 'Card 1', image: '', deck_section: 'main' as const, card_kind_normalized: 'follower' as const }],
            evolveDeck: [],
            leaderCards: [],
        };

        result.current.importDeckData(mockDeckData);

        expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'IMPORT_DECK',
            actor: 'host',
            cards: expect.arrayContaining([
                expect.objectContaining({ name: 'Card 1', zone: 'mainDeck-host' })
            ]),
        }));
    });

    it('handleDeckUpload aborts if cannot interact', () => {
        const { result } = renderHook(() => useGameBoardSetupActions({ ...defaultArgs, canInteract: false }));
        const mockEvent = { target: { value: 'file', files: [new File([], 'test.json')] } } as unknown as React.ChangeEvent<HTMLInputElement>;

        result.current.handleDeckUpload(mockEvent);

        expect(mockEvent.target.value).toBe('');
        expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
    });

    it('handleDeckUpload aborts if canImportDeck returns false', () => {
        vi.mocked(canImportDeck).mockReturnValue(false);
        const { result } = renderHook(() => useGameBoardSetupActions(defaultArgs));
        const mockEvent = { target: { value: 'file', files: [new File([], 'test.json')] } } as unknown as React.ChangeEvent<HTMLInputElement>;

        result.current.handleDeckUpload(mockEvent);

        expect(mockEvent.target.value).toBe('');
        expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
    });

    it('handleDeckUpload reads valid JSON and dispatches IMPORT_DECK', () => {
        const { result } = renderHook(() => useGameBoardSetupActions(defaultArgs));
        const validJson = JSON.stringify({ mainDeck: [{ id: 'C1', name: 'Card', image: '/c.png', deck_section: 'main' }] });

        let onloadCallback: ((e: ProgressEvent<FileReader>) => void) | null = null;
        const readAsTextSpy = vi.fn();
        vi.stubGlobal('FileReader', class {
            readAsText = readAsTextSpy;
            set onload(cb: (e: ProgressEvent<FileReader>) => void) { onloadCallback = cb; }
        });

        const mockEvent = { target: { value: 'file', files: [new File([validJson], 'deck.json')] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        result.current.handleDeckUpload(mockEvent);

        expect(readAsTextSpy).toHaveBeenCalledTimes(1);
        onloadCallback!({ target: { result: validJson } } as unknown as ProgressEvent<FileReader>);

        expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'IMPORT_DECK' }));
    });

    it('handleDeckUpload shows alert when JSON parse fails', () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
        const { result } = renderHook(() => useGameBoardSetupActions(defaultArgs));

        let onloadCallback: ((e: ProgressEvent<FileReader>) => void) | null = null;
        vi.stubGlobal('FileReader', class {
            readAsText = vi.fn();
            set onload(cb: (e: ProgressEvent<FileReader>) => void) { onloadCallback = cb; }
        });

        const mockEvent = { target: { value: 'file', files: [new File(['bad'], 'broken.json')] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        result.current.handleDeckUpload(mockEvent);

        onloadCallback!({ target: { result: '{invalid-json' } } as unknown as ProgressEvent<FileReader>);

        expect(alertSpy).toHaveBeenCalledWith('deckBuilder.alerts.importFailed');
        expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });
});
