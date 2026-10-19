# GEMINI.md

This file defines rules and workflows specifically for Gemini in this repository.

## Base Development Rules

Follow all rules, workflows, test-first layering, and completion checklists defined in `AGENTS.md` as the default foundation.

## Gemini-Specific Overrides / Differences

### Branch Workflow
When creating branches, use the `gemini/` prefix by default (instead of `codex/`):
- `gemini/feature-...`
- `gemini/fix-...`
- `gemini/refactor-...`
- `gemini/test-...`

All other branch conventions (short-lived branches, working tree checks, preserving unrelated changes) follow `AGENTS.md`.
