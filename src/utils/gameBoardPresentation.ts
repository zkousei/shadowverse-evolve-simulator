export type GameBoardConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

type TranslationFn = (key: string) => string;

export type ConnectionBadgeTone = {
  label: string;
  background: string;
  border: string;
  color: string;
};

export const getConnectionBadgeTone = (
  connectionState: GameBoardConnectionState,
  t: TranslationFn
): ConnectionBadgeTone => {
  if (connectionState === 'connected') {
    return {
      label: t('gameBoard.status.connected'),
      background: 'rgba(16, 185, 129, 0.18)',
      border: 'rgba(16, 185, 129, 0.38)',
      color: '#d1fae5',
    };
  }

  if (connectionState === 'reconnecting' || connectionState === 'connecting') {
    return {
      label: t('gameBoard.status.reconnecting'),
      background: 'rgba(245, 158, 11, 0.18)',
      border: 'rgba(245, 158, 11, 0.38)',
      color: '#fde68a',
    };
  }

  return {
    label: t('gameBoard.status.disconnected'),
    background: 'rgba(239, 68, 68, 0.18)',
    border: 'rgba(239, 68, 68, 0.38)',
    color: '#fecaca',
  };
};

export const getInteractionBlockedTitle = (
  isGuestConnectionBlocked: boolean,
  connectionState: GameBoardConnectionState,
  t: TranslationFn
): string | undefined => {
  if (!isGuestConnectionBlocked) return undefined;

  return connectionState === 'connecting' || connectionState === 'reconnecting'
    ? t('gameBoard.status.reconnectingTitle')
    : t('gameBoard.status.connectionRequired');
};

export const formatSavedSessionTimestamp = (savedAt: string): string => {
  try {
    return new Date(savedAt).toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      month: 'numeric',
      day: 'numeric',
    });
  } catch {
    return savedAt;
  }
};

export const filterSavedDeckOptionsBySearch = <T extends { deck: { name: string } }>(
  options: T[],
  search: string
): T[] => {
  const normalizedSearch = search.trim().toLowerCase();
  return options.filter(option => option.deck.name.toLowerCase().includes(normalizedSearch));
};
