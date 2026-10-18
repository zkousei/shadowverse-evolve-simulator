import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerRole } from '../../types/game';
import { useGameBoardSetupActions } from './useGameBoardSetupActions';
import { buildSyncState } from './gameBoardTestUtils';

// Mock dependencies
vi.mock('../../utils/gameBoard/gameRules', () => ({
    canImportDeck: vi.fn(),
}));
import { canImportDeck } from '../../utils/gameBoard/gameRules';

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
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
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

    describe('pending file reads', () => {
        const readers: Array<{ onload: ((event: ProgressEvent<FileReader>) => void) | null }> = [];
        const json = (name: string) => JSON.stringify({ mainDeck: [{ id: name, name, image: '', deck_section: 'main' }] });
        const uploadEvent = () => ({ target: { value: 'file', files: [new File([], 'deck.json')] } }) as unknown as React.ChangeEvent<HTMLInputElement>;
        const finish = (index: number, text: string) => act(() => readers[index].onload?.({ target: { result: text } } as unknown as ProgressEvent<FileReader>));
        beforeEach(async () => {
            const actual = await vi.importActual<typeof import('../../utils/gameBoard/gameRules')>('../../utils/gameBoard/gameRules');
            vi.mocked(canImportDeck).mockImplementation(actual.canImportDeck);
            readers.length = 0;
            vi.stubGlobal('FileReader', class {
                onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
                readAsText = vi.fn();
                constructor() { readers.push(this); }
            });
        });

        it.each([json('Old'), '{broken'])('ignores a result after a local reset, including stale parse errors: %s', text => {
            const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
            const { result } = renderHook(() => useGameBoardSetupActions(defaultArgs));
            result.current.handleDeckUpload(uploadEvent());
            result.current.confirmResetGame();
            defaultArgs.dispatchGameEvent.mockClear();
            finish(0, text);
            expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
            expect(alert).not.toHaveBeenCalled();
            alert.mockRestore();
        });

        it.each([
            buildSyncState({ gameStatus: 'playing' }),
            buildSyncState({ host: { initialHandDrawn: true } }),
            buildSyncState({ host: { mulliganUsed: true } }),
            buildSyncState({ host: { isReady: true } }),
        ])('rechecks current preparation rules before dispatching a completed read: %j', state => {
            const { result, rerender } = renderHook(({ gameState }) => useGameBoardSetupActions({ ...defaultArgs, gameState }), {
                initialProps: { gameState: buildSyncState() },
            });
            result.current.handleDeckUpload(uploadEvent());
            rerender({ gameState: state });
            finish(0, json('Old'));
            expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
        });

        it.each(['permission', 'role'] as const)('does not revive an old read after %s is lost and restored', change => {
            const { result, rerender } = renderHook(({ canInteract, role }) => useGameBoardSetupActions({ ...defaultArgs, canInteract, role }), {
                initialProps: { canInteract: true, role: 'host' as PlayerRole },
            });
            result.current.handleDeckUpload(uploadEvent());
            rerender({ canInteract: change !== 'permission', role: change === 'role' ? 'guest' : 'host' });
            rerender({ canInteract: true, role: 'host' });
            finish(0, json('Old'));
            expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
        });

        it('keeps only the newer upload for the same player when reads finish out of order', () => {
            const { result } = renderHook(() => useGameBoardSetupActions(defaultArgs));
            result.current.handleDeckUpload(uploadEvent());
            result.current.handleDeckUpload(uploadEvent());
            finish(1, json('New'));
            finish(0, json('Old'));
            expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledTimes(1);
            expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith(expect.objectContaining({ cards: [expect.objectContaining({ name: 'New' })] }));
        });

        it('does not let an old upload overwrite a newer synchronous saved-deck import', () => {
            const { result } = renderHook(() => useGameBoardSetupActions(defaultArgs));
            result.current.handleDeckUpload(uploadEvent());
            result.current.importDeckData(JSON.parse(json('Saved')));
            finish(0, json('Old'));
            expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledTimes(1);
            expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith(expect.objectContaining({ cards: [expect.objectContaining({ name: 'Saved' })] }));
        });

        it('keeps both players independent and preserves the captured target after the other player imports', () => {
            const stateRef = { current: buildSyncState() };
            const { result } = renderHook(() => useGameBoardSetupActions({ ...defaultArgs, gameStateRef: stateRef }));
            result.current.handleDeckUpload(uploadEvent(), 'host');
            result.current.handleDeckUpload(uploadEvent(), 'guest');
            finish(1, json('Guest'));
            const guestImport = defaultArgs.dispatchGameEvent.mock.calls[0][0];
            stateRef.current = buildSyncState({ cards: guestImport.cards, revision: 2 });
            finish(0, json('Host'));
            expect(defaultArgs.dispatchGameEvent.mock.calls.map(([event]) => event.actor)).toEqual(['guest', 'host']);
            expect(defaultArgs.dispatchGameEvent).toHaveBeenLastCalledWith(expect.objectContaining({ cards: [expect.objectContaining({ zone: 'mainDeck-host' })] }));
        });

        it('checks the live board ref even before React rerenders', () => {
            const stateRef = { current: buildSyncState() };
            const { result } = renderHook(() => useGameBoardSetupActions({ ...defaultArgs, gameStateRef: stateRef }));
            result.current.handleDeckUpload(uploadEvent());
            stateRef.current = buildSyncState({ host: { isReady: true } });
            finish(0, json('Old'));
            expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
        });

        it('does not cancel on presentation-only changes such as a snapshot omitting standard images', () => {
            const stateRef = { current: buildSyncState() };
            const { result } = renderHook(() => useGameBoardSetupActions({ ...defaultArgs, gameStateRef: stateRef }));
            result.current.importDeckData(JSON.parse(json('Existing')));
            const card = defaultArgs.dispatchGameEvent.mock.calls[0][0].cards[0];
            stateRef.current = buildSyncState({ cards: [{ ...card, image: '/standard.png' }] });
            defaultArgs.dispatchGameEvent.mockClear();
            result.current.handleDeckUpload(uploadEvent());
            stateRef.current = buildSyncState({ cards: [{ ...card, image: '', name: 'Updated display name' }], revision: 2 });
            finish(0, json('New'));
            expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledTimes(1);
            expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith(expect.objectContaining({ cards: [expect.objectContaining({ name: 'New' })] }));
        });

        it('does not overwrite another deck replacement received for the same player', () => {
            const stateRef = { current: buildSyncState() };
            const { result } = renderHook(() => useGameBoardSetupActions({ ...defaultArgs, gameStateRef: stateRef }));
            result.current.handleDeckUpload(uploadEvent());
            result.current.importDeckData(JSON.parse(json('Remote')), 'guest');
            const imported = defaultArgs.dispatchGameEvent.mock.calls[0][0].cards[0];
            stateRef.current = buildSyncState({ cards: [{ ...imported, owner: 'host', zone: 'mainDeck-host' }] });
            defaultArgs.dispatchGameEvent.mockClear();
            finish(0, json('Old'));
            expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
        });

        it('ignores a completed file read after unmount', () => {
            const { result, unmount } = renderHook(() => useGameBoardSetupActions(defaultArgs));
            result.current.handleDeckUpload(uploadEvent());
            unmount();
            finish(0, json('Old'));
            expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
        });
    });
});
