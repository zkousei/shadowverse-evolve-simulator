import React from 'react';
import { createPortal } from 'react-dom';

type TouchAction = {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'accent';
};

type GameBoardTouchActionSheetProps = {
  isOpen: boolean;
  actions: TouchAction[];
  anchor?: { x: number; y: number } | null;
  onClose: () => void;
};

const GameBoardTouchActionSheet: React.FC<GameBoardTouchActionSheetProps> = ({
  isOpen,
  actions,
  anchor = null,
  onClose,
}) => {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const isMultiActionLayout = actions.length >= 2;
  const useTwoColumnLayout = actions.length >= 3;
  const [placement, setPlacement] = React.useState<{ top: number; left: number; width: number } | null>(null);

  React.useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      setPlacement(null);
      return undefined;
    }
    const visualViewport = window.visualViewport;

    const computePlacement = () => {
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const viewportRight = viewportLeft + viewportWidth;
      const viewportBottom = viewportTop + viewportHeight;
      const margin = 8;
      const longestLabelLength = Math.max(1, ...actions.map((action) => action.label.length));
      const singleColumnWidth = Math.max(148, Math.min(268, Math.round(longestLabelLength * 11 + 74)));
      const twoColumnCellWidth = Math.max(112, Math.min(178, Math.round(longestLabelLength * 9.5 + 40)));
      const contentWidth = useTwoColumnLayout
        ? twoColumnCellWidth * 2 + 4 + 12
        : singleColumnWidth;
      const width = Math.min(Math.round(viewportWidth * 0.9), contentWidth);

      const rowCount = useTwoColumnLayout ? Math.ceil(actions.length / 2) : actions.length;
      const estimatedHeight = 12 + (rowCount * 34) + ((rowCount - 1) * 4);

      const targetX = anchor?.x ?? (viewportLeft + viewportWidth / 2);
      const targetY = anchor?.y ?? (viewportBottom - estimatedHeight - margin);

      const desiredLeft = targetX - (width / 2);
      const minLeft = viewportLeft + margin;
      const maxLeft = Math.max(minLeft, viewportRight - width - margin);
      const left = Math.min(Math.max(desiredLeft, minLeft), maxLeft);

      const belowSpace = viewportBottom - (targetY + 8) - margin;
      const aboveSpace = targetY - viewportTop - margin - 8;
      const placeBelow = !anchor || belowSpace >= estimatedHeight || belowSpace >= aboveSpace;
      const desiredTop = placeBelow ? targetY + 8 : targetY - 8 - estimatedHeight;
      const minTop = viewportTop + margin;
      const maxTop = Math.max(minTop, viewportBottom - estimatedHeight - margin);
      const top = Math.min(Math.max(desiredTop, minTop), maxTop);

      setPlacement({
        top: Math.round(top),
        left: Math.round(left),
        width,
      });
    };

    computePlacement();
    const rafId = window.requestAnimationFrame(computePlacement);
    window.addEventListener('resize', computePlacement);
    window.addEventListener('scroll', computePlacement, true);
    visualViewport?.addEventListener('resize', computePlacement);
    visualViewport?.addEventListener('scroll', computePlacement);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', computePlacement);
      window.removeEventListener('scroll', computePlacement, true);
      visualViewport?.removeEventListener('resize', computePlacement);
      visualViewport?.removeEventListener('scroll', computePlacement);
    };
  }, [actions, anchor, isOpen, useTwoColumnLayout]);

  React.useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(event.target as Node)) return;
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-testid="gameboard-touch-action-sheet"
      style={{
        position: 'fixed',
        top: placement ? `${placement.top}px` : '8px',
        left: placement ? `${placement.left}px` : '8px',
        display: 'flex',
        zIndex: 1300,
        pointerEvents: placement ? 'auto' : 'none',
        visibility: placement ? 'visible' : 'hidden',
      }}
    >
      <div
        ref={panelRef}
        style={{
          pointerEvents: 'auto',
          width: placement ? `${placement.width}px` : 'min(420px, 90vw)',
          display: 'grid',
          gridTemplateColumns: useTwoColumnLayout ? '1fr 1fr' : '1fr',
          gap: '0.28rem',
          background: 'rgba(2, 6, 23, 0.97)',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          borderRadius: '8px',
          padding: '0.34rem',
          boxShadow: '0 12px 20px rgba(0,0,0,0.4)',
        }}
      >
        {actions.map((action, index) => {
          const shouldSpanLastOddButton = useTwoColumnLayout && actions.length % 2 === 1 && index === actions.length - 1;
          return (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              action.onClick();
              onClose();
            }}
            style={{
              minHeight: '30px',
              width: '100%',
              gridColumn: shouldSpanLastOddButton ? '1 / -1' : undefined,
              borderRadius: '6px',
              fontSize: isMultiActionLayout ? '0.72rem' : '0.74rem',
              fontWeight: 700,
              border: action.tone === 'accent' ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.25)',
              background: action.tone === 'accent' ? '#3b82f6' : 'var(--bg-surface-elevated)',
              color: 'white',
              padding: '0.2rem 0.32rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            {action.label}
          </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
};

export default GameBoardTouchActionSheet;
