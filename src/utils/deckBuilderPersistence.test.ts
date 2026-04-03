import { beforeEach, describe, expect, it } from 'vitest';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckRuleConfig } from '../models/deckRule';
import { createDeckSnapshot, clearDraft, getSavedDeckById, loadDraft, saveDeck, saveDraft } from './deckStorage';
import { DeckLogImportError, type DeckLogImportResult } from './decklogImport';
import {
  buildContinuedDraftRestoreSessionState,
  buildDeckBuilderSaveState,
  buildDeckLogImportFeedback,
  buildDeckLogImportedDeckState,
  buildDetachedDeckBuilderTrackingState,
  buildDraftPersistencePayload,
  buildImportedDeckSessionState,
  buildJsonImportedDeckState,
  buildLoadedSavedDeckSessionState,
  buildPendingDraftRestoreState,
  buildResetDeckBuilderSessionState,
  buildSavedDeckLoadState,
  getDraftPersistenceAction,
  getDeckLogImportMessage,
  shouldDetachSavedDeckTracking,
} from './deckBuilderPersistence';

const t = (key: string, params?: Record<string, string | number>): string => {
  const messages: Record<string, string> = {
    'deckBuilder.alerts.deckLogInvalidInput': 'Invalid input',
    'deckBuilder.alerts.deckLogNotFound': 'Deck not found',
    'deckBuilder.alerts.deckLogUnsupportedGame': 'Unsupported game',
    'deckBuilder.alerts.deckLogFetchFailed': 'Fetch failed',
    'deckBuilder.alerts.deckLogInvalidResponse': 'Invalid response',
    'deckBuilder.alerts.deckLogImportPartial': 'Imported with {{count}} missing cards',
    'deckBuilder.alerts.deckLogImportSuccess': 'Imported "{{name}}" from DeckLog.',
  };

  let value = messages[key] ?? key;
  if (!params) return value;

  Object.entries(params).forEach(([paramKey, paramValue]) => {
    value = value.replaceAll(`{{${paramKey}}}`, String(paramValue));
  });

  return value;
};

const otherRuleConfig: DeckRuleConfig = {
  format: 'other',
  identityType: 'class',
  selectedClass: null,
  selectedTitle: null,
  selectedClasses: [null, null],
};

const mainCard: DeckBuilderCardData = {
  id: 'BP01-001',
  name: 'Alpha Knight',
  image: '/alpha.png',
  class: 'ロイヤル',
  title: 'Hero Tale',
  type: 'フォロワー',
  subtype: '兵士',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
  related_cards: [{ id: 'TK01-001', name: 'Knight Token' }],
};

const leaderCard: DeckBuilderCardData = {
  id: 'LDR01-001',
  name: 'Leader Luna',
  image: '/leader.png',
  class: 'ロイヤル',
  title: 'Hero Tale',
  type: 'リーダー',
  card_kind_normalized: 'leader',
  deck_section: 'leader',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const tokenCard: DeckBuilderCardData = {
  id: 'TK01-001',
  name: 'Knight Token',
  image: '/token.png',
  class: 'ロイヤル',
  title: 'Hero Tale',
  type: 'アミュレット・トークン',
  card_kind_normalized: 'token_amulet',
  deck_section: 'token',
  is_token: true,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

const availableCards = [mainCard, leaderCard, tokenCard];

describe('deckBuilderPersistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearDraft();
  });

  it('builds JSON import state with fallback deck names and sanitized tokens', () => {
    const imported = buildJsonImportedDeckState({
      deckName: '',
      rule: 'constructed',
      identityType: 'class',
      selectedClass: 'ロイヤル',
      mainDeck: [mainCard],
      leaderCards: [leaderCard],
      tokenDeck: [],
    }, 'Fallback Deck.json', availableCards);

    expect(imported.deckName).toBe('Fallback Deck');
    expect(imported.ruleConfig).toMatchObject({
      format: 'constructed',
      identityType: 'class',
      selectedClass: 'ロイヤル',
    });
    expect(imported.deckState.mainDeck).toEqual([mainCard]);
    expect(imported.deckState.tokenDeck).toEqual([tokenCard]);
  });

  it('builds reusable session states for reset, imports, and detached tracking', () => {
    expect(buildDetachedDeckBuilderTrackingState()).toEqual({
      selectedSavedDeckId: null,
      savedBaselineSnapshot: null,
      draftRestored: false,
      pendingDraftRestore: null,
    });

    expect(buildResetDeckBuilderSessionState()).toEqual({
      deckName: '',
      ruleConfig: {
        format: 'constructed',
        identityType: 'class',
        selectedClass: null,
        selectedTitle: null,
        selectedClasses: [null, null],
      },
      deckState: {
        mainDeck: [],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
      selectedSavedDeckId: null,
      savedBaselineSnapshot: null,
      draftRestored: false,
      pendingDraftRestore: null,
    });

    expect(buildImportedDeckSessionState({
      deckName: 'Imported Deck',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mainCard],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [tokenCard],
      },
    })).toEqual({
      deckName: 'Imported Deck',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mainCard],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [tokenCard],
      },
      selectedSavedDeckId: null,
      savedBaselineSnapshot: null,
      draftRestored: false,
      pendingDraftRestore: null,
    });

    expect(buildImportedDeckSessionState({
      deckName: null,
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mainCard],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    })).not.toHaveProperty('deckName');
  });

  it('builds save-state status for pristine, dirty, and limit-reached builders', () => {
    const pristineSnapshot = createDeckSnapshot('', otherRuleConfig, {
      mainDeck: [],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    });
    const dirtySnapshot = createDeckSnapshot('Working Deck', otherRuleConfig, {
      mainDeck: [mainCard],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [tokenCard],
    });

    expect(buildDeckBuilderSaveState(
      pristineSnapshot,
      pristineSnapshot,
      null,
      null,
      0,
      t
    )).toMatchObject({
      hasReachedSoftLimit: false,
      hasReachedHardLimit: false,
      wouldCreateNewSavedDeck: true,
      canCreateNewSavedDeck: true,
      canSaveCurrentDeck: true,
      isDirty: false,
      hasBuilderState: false,
      saveStateMessage: 'deckBuilder.status.notSaved',
    });

    expect(buildDeckBuilderSaveState(
      dirtySnapshot,
      pristineSnapshot,
      pristineSnapshot,
      'deck-1',
      100,
      t
    )).toMatchObject({
      hasReachedSoftLimit: true,
      hasReachedHardLimit: false,
      wouldCreateNewSavedDeck: false,
      canCreateNewSavedDeck: true,
      canSaveCurrentDeck: true,
      isDirty: true,
      hasBuilderState: true,
      saveStateMessage: 'deckBuilder.status.unsavedChanges',
    });

    expect(buildDeckBuilderSaveState(
      dirtySnapshot,
      pristineSnapshot,
      null,
      null,
      200,
      t
    )).toMatchObject({
      hasReachedSoftLimit: true,
      hasReachedHardLimit: true,
      wouldCreateNewSavedDeck: true,
      canCreateNewSavedDeck: false,
      canSaveCurrentDeck: false,
      isDirty: true,
      hasBuilderState: true,
      saveStateMessage: 'deckBuilder.status.notSaved',
    });
  });

  it('builds saved deck load state with a normalized baseline snapshot', () => {
    const savedDeck = saveDeck({
      name: 'Saved Royal',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mainCard],
        evolveDeck: [],
        leaderCards: [leaderCard],
        tokenDeck: [],
      },
    });

    const restored = buildSavedDeckLoadState(savedDeck, availableCards);

    expect(restored.deckName).toBe('Saved Royal');
    expect(restored.selectedSavedDeckId).toBe(savedDeck.id);
    expect(restored.deckState.mainDeck).toEqual([mainCard]);
    expect(restored.deckState.tokenDeck).toEqual([tokenCard]);
    expect(restored.savedBaselineSnapshot.deckState.tokenDeck).toEqual([tokenCard]);
    expect(buildLoadedSavedDeckSessionState(restored)).toEqual({
      deckName: 'Saved Royal',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mainCard],
        evolveDeck: [],
        leaderCards: [leaderCard],
        tokenDeck: [tokenCard],
      },
      selectedSavedDeckId: savedDeck.id,
      savedBaselineSnapshot: restored.savedBaselineSnapshot,
      draftRestored: false,
      pendingDraftRestore: null,
    });
  });

  it('builds pending draft restore state with the matching saved baseline when present', () => {
    const savedDeck = saveDeck({
      name: 'Saved Royal',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mainCard],
        evolveDeck: [],
        leaderCards: [leaderCard],
        tokenDeck: [],
      },
    });

    saveDraft({
      selectedDeckId: savedDeck.id,
      name: 'Draft Royal',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mainCard],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    const pending = buildPendingDraftRestoreState(loadDraft()!, availableCards, getSavedDeckById(savedDeck.id));

    expect(pending.selectedDeckId).toBe(savedDeck.id);
    expect(pending.snapshot.name).toBe('Draft Royal');
    expect(pending.snapshot.deckState.tokenDeck).toEqual([tokenCard]);
    expect(pending.baselineSnapshot?.name).toBe('Saved Royal');
    expect(pending.baselineSnapshot?.deckState.tokenDeck).toEqual([tokenCard]);
    expect(buildContinuedDraftRestoreSessionState(pending)).toEqual({
      deckName: 'Draft Royal',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mainCard],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [tokenCard],
      },
      selectedSavedDeckId: savedDeck.id,
      savedBaselineSnapshot: pending.baselineSnapshot,
      draftRestored: true,
      pendingDraftRestore: null,
    });
  });

  it('decides whether draft persistence should skip, clear, or save', () => {
    expect(getDraftPersistenceAction(0, true, false, true)).toBe('skip');
    expect(getDraftPersistenceAction(1, false, false, true)).toBe('skip');
    expect(getDraftPersistenceAction(1, true, true, true)).toBe('skip');
    expect(getDraftPersistenceAction(1, true, false, false)).toBe('clear');
    expect(getDraftPersistenceAction(1, true, false, true)).toBe('save');
  });

  it('builds a normalized draft persistence payload', () => {
    const payload = buildDraftPersistencePayload(null, '  Working Deck  ', otherRuleConfig, {
      mainDeck: [mainCard],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [tokenCard],
    });

    expect(payload).toMatchObject({
      schemaVersion: 1,
      selectedDeckId: null,
      name: 'Working Deck',
      ruleConfig: otherRuleConfig,
    });
    expect(payload.deckState.mainDeck).toEqual([mainCard]);
    expect(payload.deckState.tokenDeck).toEqual([tokenCard]);
    expect(typeof payload.lastEditedAt).toBe('string');
  });

  it('builds DeckLog import state and feedback', () => {
    const importedDeck: DeckLogImportResult = {
      deckName: 'DeckLog Royal',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mainCard],
        evolveDeck: [],
        leaderCards: [leaderCard],
        tokenDeck: [],
      },
      missingCardIds: [],
    };

    const restored = buildDeckLogImportedDeckState(importedDeck, availableCards);

    expect(restored.deckName).toBe('DeckLog Royal');
    expect(restored.deckState.tokenDeck).toEqual([tokenCard]);
    expect(buildDeckLogImportFeedback(importedDeck, t)).toEqual({
      kind: 'success',
      message: 'Imported "DeckLog Royal" from DeckLog.',
    });
  });

  it('maps DeckLog import errors and partial imports to the expected feedback', () => {
    expect(getDeckLogImportMessage(new DeckLogImportError('invalid-input', 'bad input'), t)).toBe('Invalid input');
    expect(getDeckLogImportMessage(new DeckLogImportError('not-found', 'missing'), t)).toBe('Deck not found');
    expect(getDeckLogImportMessage(new Error('other'), t)).toBe('Fetch failed');

    expect(buildDeckLogImportFeedback({
      deckName: 'DeckLog Royal',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
      missingCardIds: ['MISSING-001', 'MISSING-002'],
    }, t)).toEqual({
      kind: 'warning',
      message: 'Imported with 2 missing cards',
    });
  });

  it('detaches tracking only when the loaded saved deck is among the deleted ids', () => {
    expect(shouldDetachSavedDeckTracking('deck-1', ['deck-2'])).toBe(false);
    expect(shouldDetachSavedDeckTracking('deck-1', ['deck-1', 'deck-2'])).toBe(true);
    expect(shouldDetachSavedDeckTracking(null, ['deck-1'])).toBe(false);
  });
});
