import type { SharedUiEffect, SyncMessage } from '../../../types/sync';

export const getIncomingSharedUiEffects = (message: SyncMessage): SharedUiEffect[] => {
  if (message.type === 'SHARED_UI_EFFECT') {
    return [message.effect];
  }

  if (message.type === 'STATE_SNAPSHOT') {
    return message.pendingEffects ?? [];
  }

  return [];
};

// Scope deduplication to the new undo logs; existing shared effects retain their behavior.
export const createIncomingUndoLogFilter = () => {
  let lastUndoRevision = -1;
  return (message: SyncMessage): SharedUiEffect[] => {
    const effects = getIncomingSharedUiEffects(message);
    if (message.type !== 'STATE_SNAPSHOT' || !effects.some(effect => effect.type === 'UNDO_COMPLETED')) return effects;
    if (message.state.revision <= lastUndoRevision) return effects.filter(effect => effect.type !== 'UNDO_COMPLETED');
    lastUndoRevision = message.state.revision;
    return effects;
  };
};
