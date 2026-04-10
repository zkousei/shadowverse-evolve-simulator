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
- Page-level user flows and dialog behavior:
  - `src/pages/GameBoard.test.tsx`
  - `src/pages/DeckBuilder.test.tsx`

Choose the lowest-level test that can fully express the behavior.

## Test-First Layering Rule

When implementing a change, decide the layer first:

1. If the behavior is a pure rule, test it in `cardLogic` or `gameSyncReducer`.
2. If the behavior is a synchronization or orchestration contract, test it in
   `useGameBoardLogic`.
3. If the behavior is a user flow, modal flow, or page wiring concern, test it
   at the page level.

Do not start by editing page code if the behavior can be specified at a lower,
more stable layer.

## Manual Verification Policy

Manual verification should be the exception, not the default.

Keep manual checks limited to:

- Drag/drop hit behavior and feel
- Real browser P2P timing differences
- Visual layout, overlay, and z-index issues

If a manual check reveals an important regression risk, add an automated test
for the underlying rule or contract as soon as practical.

## Safe Change Rules

- Prefer characterization tests before refactoring risky behavior.
- Keep refactors and behavior changes separate when possible.
- Do not weaken existing tests just to make a change pass.
- Do not remove safety-net tests unless they are genuinely obsolete and the
  replacement coverage is clear.

## Completion Checklist

Unless the user explicitly asks for a narrower scope, aim to finish changes with:

- `npm run lint`
- `npm test -- --run`
- `npm run build`

If only a targeted test run is appropriate, explain why and choose the smallest
relevant test scope that still protects the change.

## Communication Expectations

- Be explicit about which behavior is being fixed or specified.
- Mention which test file owns the new contract.
- Call out any remaining manual-check-only risk.

