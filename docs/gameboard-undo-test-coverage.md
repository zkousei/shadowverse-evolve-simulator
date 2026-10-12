# GameBoard Undo test coverage

The implemented behavior and display exceptions are documented in [GameBoard Undoの現在仕様](gameboard-undo-current-spec.md).

## Scope and ownership

`src/utils/gameBoard/gameBoardUndoPatterns.test.ts` owns the operation-by-operation
restoration and public-log contracts. `testing/undoFixtures.ts` contains an
explicit fixture for each of the 29 operation event types that can create an
Undo checkpoint. A new `GameSyncEvent` cannot silently go unclassified: the
fixture table must satisfy an exhaustive TypeScript record. A separate
test-owned field record requires assertions for every restorable state field.

This coverage enumerates the current operation types and meaningful condition
classes. It does not enumerate every possible game state or every possible
sequence of operations.

| Contract | Cases | Primary owner |
| --- | --- | --- |
| Every operation checkpoint | All 29 event types, host/guest, solo/online semantics; restore every state field, retain a preceding Undo, reject wrong actor/requester, emit a safe summary, then handle empty history | `gameBoardUndoPatterns.test.ts` |
| Preparation guards | All 29 fixtures, both actors; blocked actions cannot create history/logs and permitted actions remain restorable | `gameBoardUndoPatterns.test.ts` |
| Player numbers | Life, PP, max PP, EP, SEP, combo; either actor and either target; both initial directions and subsequent reverse direction; max PP cap and dependent PP | `gameBoardUndoPatterns.test.ts`, `gameSyncReducer.test.ts` |
| Card numbers | ATK/HP modifiers and generic counters; either side and both directions; grouping, cancellation, bounds and operation boundaries | `gameBoardUndoPatterns.test.ts`, `gameSyncReducer.test.ts` |
| Board batches | All 10 actions × own/opponent/mixed × normal/evolved/linked/three-card stack × both actors × solo/online; atomic restoration, number grouping, stale/invalid targets, no-op and cancelled groups | `gameBoardUndoPatterns.test.ts` |
| Movement variants | Drag, shortcuts, search single/batch, cross-side moves, automatic spell-to-cemetery, attach/link, evolve return, token deletion/restoration; unknown zone and within-zone movement fallback | `gameBoardUndoPatterns.test.ts`, `gameBoardUndoLog.test.ts` |
| Look | Hand, revealed hand, field, EX, cemetery, top and bottom; restore exact order and disclose only destination counts | `gameBoardUndoPatterns.test.ts` |
| Turn Undo | Both turn players, both requesters, solo/online; restore turn resources/draw/tapping, clear backup, avoid reviving operation history; success-only log | `gameBoardUndoPatterns.test.ts`, `useGameBoardLogic.test.tsx` |
| Public/private log policy | Private zones, face-down cards, either pre/post state private, mixed batches, missing/legacy counters, mismatched saved descriptions, unknown zones, malformed metadata; no IDs/images/positions | `gameBoardUndoLog.test.ts` |
| Shared notification transport | All 29 operation kinds from guest, one authoritative restoration and one effect to guest/spectator, forged/duplicate/empty requests; guest/spectator receipt, duplicate/stale snapshots, deferred multiple Undo effects | `useGameBoardLogic.test.tsx`, `gameBoardIncomingSharedUiEffects.test.ts` |
| Rendering and labels | English/Japanese, host/guest viewer, player labels for solo/spectator; real translation strings; life versus card modifiers | `gameBoardUndoPatterns.test.ts`, `gameBoardUndoLogMessage.test.ts` |
| Saved sessions | Metadata sanitization, legacy history, grouped checkpoint resume without reopening a numeric group | `gameBoardSavedSession.test.ts` |
| Browser wiring | Numeric group log without toast, move log, turn Undo, public/private Look restoration, movement/search/Look/shuffle Undo notifications, numeric/turn Undo without notifications, and counts-only Recent Events preserving the original log; existing movement/stack/multi-selection flows | `e2e/solo-turn-and-undo.spec.ts`, `e2e/solo-zone-actions.spec.ts`, existing E2E suite |

## Off-turn operation Undo

`gameBoardUndoAvailability.test.ts` owns the display eligibility rule: playing,
unlocked interaction, a valid history, correct actor/side and no spectator access.
Turn ownership is not an eligibility condition. `GameBoard.test.tsx` verifies the
host/guest buttons, selection mode, blocked states and history invalidation.
`gameBoardUndoPatterns.test.ts` characterizes both turns for all 29 event kinds,
including the continued rejection of off-turn attacks. `useGameBoardLogic.test.tsx`
checks guest off-turn operations and host-local Undo, shared summaries, duplicate
requests, invalidation races and disconnected guest dispatch. The off-turn tests
in `gameSyncReducer.test.ts` protect opponent barriers and the unchanged turn
Undo backup/restore behavior. No reducer or transport behavior is changed.

## Log retention and display

Recent Events keeps the newest 100 entries. `gameBoardTransientUi.test.ts` owns
the retention limit, ordering, repeated entries and immutable previous history.
`GameBoardHeader.test.tsx` verifies 100 long entries on fine/coarse input in the
existing bounded dropdown. `solo-turn-and-undo.spec.ts` checks actual scrolling
beyond the old five-entry limit and unchanged header height. These checks do not
establish a universal performance maximum for all devices.

## Coverage measurement

The targeted suite reaches 100% statements, branches, functions and lines for
`gameBoardUndoLog.ts` and `network/gameBoardIncomingSharedUiEffects.ts`.
These percentages are limited to those modules and are not a guarantee that
the whole game board has no bugs.

```sh
npx vitest run src/utils/gameBoard/gameBoardUndoLog.test.ts src/utils/gameBoard/gameBoardUndoLogMessage.test.ts src/utils/gameBoard/gameBoardUndoPatterns.test.ts src/utils/gameBoard/network/gameBoardIncomingSharedUiEffects.test.ts --coverage --coverage.include=src/utils/gameBoard/gameBoardUndoLog.ts --coverage.include=src/utils/gameBoard/network/gameBoardIncomingSharedUiEffects.ts --coverage.reporter=text
```

## Remaining manual scope

Real-device WebRTC timing and Safari/mobile platform quirks remain manual checks.
P2P orchestration is tested with mocked connections; browser E2E runs Chromium.
Privacy assertions apply to the newly added Undo effects, log text and
notifications. Existing snapshots still contain private card information;
transport-level secrecy is a separate change.

## Verification status (2026-10-12)

The latest full Vitest run passed all 2495 tests; lint, app type checking and build
also passed. The latest full Chromium E2E run passed all 33 tests. Off-turn online button
behavior is owned by page tests, and P2P synchronization uses mocked connections. A later
investigation reran the 1087 Undo-related Vitest tests successfully.

Existing drag movement and inspector-close E2E cases have had mixed results
across past runs and failed in the earlier investigation. Both failures also occurred
against the pre-change HEAD in an isolated checkout. This establishes that they
also occur without the new Undo logging; it does not establish whether the cause
is a UI defect or test timing. They remain unresolved, and the current full E2E
suite passed this time but must not be described as consistently passing.
