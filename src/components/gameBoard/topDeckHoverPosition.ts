export const HOVER_PREVIEW_WIDTH = 320;
export const HOVER_PREVIEW_HEIGHT = 420;
export const HOVER_PREVIEW_OFFSET = 18;
export const HOVER_PREVIEW_PADDING = 12;

export const getTopDeckHoverPreviewPosition = (clientX: number, clientY: number) => {
  const visualViewport = window.visualViewport;
  const viewportLeft = visualViewport?.offsetLeft ?? 0;
  const viewportTop = visualViewport?.offsetTop ?? 0;
  const viewportWidth = visualViewport?.width ?? window.innerWidth;
  const viewportHeight = visualViewport?.height ?? window.innerHeight;
  const minLeft = viewportLeft + HOVER_PREVIEW_PADDING;
  const minTop = viewportTop + HOVER_PREVIEW_PADDING;
  const maxLeft = Math.max(minLeft, viewportLeft + viewportWidth - HOVER_PREVIEW_WIDTH - HOVER_PREVIEW_PADDING);
  const maxTop = Math.max(minTop, viewportTop + viewportHeight - HOVER_PREVIEW_HEIGHT - HOVER_PREVIEW_PADDING);

  return {
    left: Math.max(minLeft, Math.min(clientX + HOVER_PREVIEW_OFFSET, maxLeft)),
    top: Math.max(minTop, Math.min(clientY + HOVER_PREVIEW_OFFSET, maxTop)),
  };
};
