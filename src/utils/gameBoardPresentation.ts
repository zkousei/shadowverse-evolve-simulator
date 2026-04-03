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

type InspectorAnchor = {
  top: number;
  left: number;
  right: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

const INSPECTOR_POPOVER_WIDTH = 300;
const INSPECTOR_POPOVER_HEIGHT = 420;
const INSPECTOR_POPOVER_GAP = 12;
const INSPECTOR_VIEWPORT_PADDING = 16;

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

export const getInspectorPopoverStyle = (
  anchor: InspectorAnchor,
  viewport: ViewportSize
) => {
  let left = anchor.right + INSPECTOR_POPOVER_GAP;
  if (left + INSPECTOR_POPOVER_WIDTH > viewport.width - INSPECTOR_VIEWPORT_PADDING) {
    left = anchor.left - INSPECTOR_POPOVER_WIDTH - INSPECTOR_POPOVER_GAP;
  }
  if (left < INSPECTOR_VIEWPORT_PADDING) {
    left = Math.max(
      INSPECTOR_VIEWPORT_PADDING,
      viewport.width - INSPECTOR_POPOVER_WIDTH - INSPECTOR_VIEWPORT_PADDING
    );
  }

  let top = anchor.top;
  if (top + INSPECTOR_POPOVER_HEIGHT > viewport.height - INSPECTOR_VIEWPORT_PADDING) {
    top = viewport.height - INSPECTOR_POPOVER_HEIGHT - INSPECTOR_VIEWPORT_PADDING;
  }
  if (top < INSPECTOR_VIEWPORT_PADDING) {
    top = INSPECTOR_VIEWPORT_PADDING;
  }

  return {
    position: 'fixed',
    top,
    left,
    width: `min(${INSPECTOR_POPOVER_WIDTH}px, calc(100vw - 32px))`,
    maxHeight: 'min(420px, calc(100vh - 32px))',
    overflowY: 'auto',
    zIndex: 900,
    background: 'rgba(3, 7, 18, 0.97)',
    border: '1px solid rgba(148, 163, 184, 0.28)',
    borderRadius: '16px',
    boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
    padding: '0.85rem',
  };
};
