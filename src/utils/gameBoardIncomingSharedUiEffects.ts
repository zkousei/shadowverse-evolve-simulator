import type { SharedUiEffect, SyncMessage } from '../types/sync';

export const getIncomingSharedUiEffects = (message: SyncMessage): SharedUiEffect[] => {
  if (message.type === 'SHARED_UI_EFFECT') {
    return [message.effect];
  }

  if (message.type === 'STATE_SNAPSHOT') {
    return message.pendingEffects ?? [];
  }

  return [];
};
