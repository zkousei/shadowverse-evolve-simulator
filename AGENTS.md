# AGENTS.md

This file defines the default development rules for Codex in this repository.

## Primary Goal

Make feature development safe enough that most changes can be validated with
`lint`, `test`, and `build`, with only minimal manual verification left for
drag/drop feel, P2P browser behavior, and visual layout.

## Default Development Style

- Prefer TDD by default.
- For new features, write a failing test first whenever practical.
- For bug fixes, write a reproducing test first.
- Do not change production code without adding or updating the relevant test,
  unless the user explicitly asks for investigation only.
- Favor small, behavior-preserving changes.

## Where Tests Should Go

- Pure card movement and zone rules:
  - `src/utils/cardLogic.test.ts`
- Reducer event handling, guards, no-op behavior, undo/turn rules:
  - `src/utils/gameSyncReducer.test.ts`
- P2P, reconnect, snapshot, saved-session, and shared UI effect contracts:
  - `src/hooks/useGameBoardLogic.test.tsx`
- Action hook dispatch and internal branching logic:
  - `src/hooks/useGameBoardFieldActions.test.tsx` — drag-end, link, evolve auto-attach, counters, spawn tokens
  - `src/hooks/useGameBoardCardActions.test.tsx` — draw, mill, discard, look-at-top, undo card move
  - `src/hooks/useGameBoardSystemActions.test.tsx` — stat change, phase, turn, coin flip, dice roll
  - `src/hooks/useGameBoardMulliganActions.test.tsx` — mulligan start, select, execute
  - `src/hooks/useGameBoardSetupActions.test.tsx` — deck import, deck upload, reset
- ViewModel and presentation logic:
  - `src/hooks/gameBoardViewModel.test.ts` — board layout, roles, import, hand visibility, end stop
  - `src/hooks/gameBoardDialogViewModel.test.ts` — saved deck picker, token spawn
  - `src/components/gameBoardMenuActions.test.ts` — menu action builders
  - `src/components/gameBoardZoneActionViewModel.test.ts` — zone action config builders
- Page-level user flows and dialog behavior (DOM integration):
  - `src/pages/GameBoard.test.tsx`
  - `src/pages/DeckBuilder.test.tsx`
- End-to-End browser usage, drag/drop, and full UI flows:
  - `e2e/*.spec.ts`

Choose the lowest-level test that can fully express the behavior.

## Test-First Layering Rule

When implementing a change, decide the layer first:

1. If the behavior is a pure rule, test it in `cardLogic` or `gameSyncReducer`.
2. If the behavior is a dispatch or action-hook concern (what event payload to
   send, internal branching like auto-attach or solo-mode actor resolution),
   test it in the relevant action hook test file.
3. If the behavior is a synchronization or orchestration contract (P2P,
   reconnect, snapshot), test it in `useGameBoardLogic`.
4. If the behavior is a DOM/View wiring concern, test it at the page integration level.
5. If the behavior involves multi-page flows, real DOM coordinate drag-and-drop, or exact layout changes, test it at the E2E level via Playwright.

Do not start by editing page code if the behavior can be specified at a lower,
more stable layer.

## Manual Verification Policy

Manual verification should be the exception, not the default.

Keep manual checks limited to:

- Extremely nuanced UI animations and exact visual "feel"
- Safari/Mobile specific quirks (as we currently focus E2E locally on Chromium)
- Real network P2P timing anomalies (WebRTC across devices)

(Note: With Playwright now available in `e2e/`, drag/drop flows and modal visibility should be automated where ROI is reasonable).

If a manual check reveals an important regression risk, add an automated test
for the underlying rule, contract, or E2E flow as soon as practical.

## Safe Change Rules

- Prefer characterization tests before refactoring risky behavior.
- Keep refactors and behavior changes separate when possible.
- Do not weaken existing tests just to make a change pass.
- Do not remove safety-net tests unless they are genuinely obsolete and the
  replacement coverage is clear.

## Completion Checklist

Unless the user explicitly asks for a narrower scope, aim to finish changes with:

- `npm run lint`
- `npx tsc --noEmit`
- `npx vitest run` (or `npm test`)
- `npm run test:e2e` (when UI/flow actions are changed)

If only a targeted test run is appropriate, explain why and choose the smallest
relevant test scope that still protects the change.

## Communication Expectations

- Be explicit about which behavior is being fixed or specified.
- Mention which test file owns the new contract.
- Call out any remaining manual-check-only risk.

