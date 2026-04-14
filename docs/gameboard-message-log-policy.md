# GameBoard Message / Recent Events Policy

This document describes the current GameBoard policy for transient shared messages and Recent Events logs.

It is intentionally separate from `public-private-info-guidelines.md`. The public/private guide answers "what information is safe to reveal"; this document answers "where should the resulting notification appear".

## Notification Surfaces

The GameBoard currently has two different notification surfaces:

- Transient message / overlay:
  - `coinMessage`
  - `turnMessage`
  - `cardPlayMessage`
  - `attackMessage`
  - revealed-card overlays
- Recent Events:
  - `eventHistory`
  - shown only while `gameStatus === 'playing'`
  - capped at 5 entries

## General Policy

- Use transient messages for immediate feedback.
- Use Recent Events for public, rules-relevant actions that players may need to confirm after the message disappears.
- Do not log high-frequency ordinary play actions if they would make Recent Events noisy.
- Do not log setup-only or purely local UI toggles.
- Do not log private card names unless the action explicitly reveals them or the source card was already public.

## Message + Recent Events

These actions show a transient message or overlay and also add a Recent Events entry.

| Operation | Notes |
| --- | --- |
| Attack declaration | Shows attack message / visual, and logs the compact attack history entry. |
| Reveal hand | Shows revealed-card overlay and logs revealed card names. |
| Reveal searched cards to hand | Shows revealed-card overlay and logs revealed card names. |
| Look Top resolution | Logs the summary. If cards were revealed, the summary is merged into the reveal overlay instead of adding a second reveal log. |
| Shuffle deck | Logs that the deck was shuffled, without card names. |
| Random hand discard | Logs the discarded count, not card names. |
| Manual mill | Logs the milled card name because it becomes public in cemetery. |
| Move top card to EX | Logs the moved card name because EX is public. |
| Search from main deck to hand, not revealed | Logs only the fact/count, not card names. |
| Search from main deck to field / EX | Logs the public placement. During preparation, field placement stays generic. |
| Main deck to cemetery from search modal | Logs card names when known/public through the action result; batch logs show up to 5 names. |
| Cemetery to hand / field / EX | Logs card names because cemetery is public. |
| Cemetery to banish | Logs card names because both zones are public. |
| Cemetery to bottom of deck | Logs card names because the source card was public. |
| Banish to hand / field / EX | Logs card names because banish is public. |
| Banish to bottom of deck | Logs card names because the source card was public. |
| Evolve deck used/unused toggle during playing | Logs only during `playing`. Preparation-time toggles are message-only. |

## Message Only

These actions show immediate feedback, but do not add Recent Events entries.

| Operation | Reason |
| --- | --- |
| Coin flip | Short-lived random result; no persistent log. |
| Dice roll | Short-lived random result; no persistent log. |
| Decide first player | Setup/result banner; no persistent log. |
| Game start / turn banner | Turn-state feedback, not a game action log. |
| Reset game | System-level action; message only to avoid stale logs after reset. |
| Manual draw | Drawing is private information, so only the fact is shown temporarily. |
| Play card from hand / EX | High-frequency ordinary play action; kept message-only to avoid log noise. |
| Evolve deck to field | Kept message-only to match the previous behavior and avoid extra log noise. |
| Evolve deck used/unused toggle during preparation | Setup visibility state; no persistent log. |

## No Shared Message / No Recent Events

These actions update state but do not currently create shared notification effects.

| Operation | Notes |
| --- | --- |
| Ready toggle | Setup state only. |
| Phase change | Visible in the header. |
| End stop toggle | Local/turn-control state. |
| Reveal hands mode toggle | Setup/view mode state. |
| Player stat changes | HP / PP / Max PP / EP / SEP / Combo changes are visible in the UI. |
| Initial hand draw | Setup action; hand contents remain private. |
| Mulligan | Setup action; hand/deck contents remain private. |
| Deck import | Setup/deck state action. |
| Undo last turn | State restoration action; no dedicated notification. |
| Undo card move | State restoration action; no dedicated notification. |
| Token spawn | Board state changes visually; no notification. |
| Counter changes | Visible on the card. |
| Tap / untap | Visible on the card. |
| Ordinary drag/drop move | Visible on the board; no notification. |
| Link / attach by drag or auto-attach | Visible on the board; no notification unless it was also a searched placement effect. |
| Send to bottom from zones other than cemetery / banish | No dedicated notification. |
| Send to cemetery from zones other than main deck search | No dedicated notification. |
| Banish from zones other than cemetery | No dedicated notification. |
| Return evolve card to deck | No dedicated notification. |

## Implementation Notes

- Most shared messages are represented as `SharedUiEffect`.
- Effects embedded in `STATE_SNAPSHOT.pendingEffects` are used when the notification must stay synchronized with the state change.
- No-op events generally produce no shared notification because effects are created after `applyGameSyncEvent` confirms a state change.
- If adding a new effect, decide both surfaces explicitly:
  - transient message / overlay
  - Recent Events entry
  - neither
