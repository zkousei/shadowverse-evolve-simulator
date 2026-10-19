export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ViewportLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CoarseSheetPlacement {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export interface ComputeCoarseSheetPlacementParams {
  cardRect: RectLike;
  viewport: ViewportLike;
  measuredSheetHeight: number;
  isExZoneCard: boolean;
}

export function computeCoarseSheetPlacement({
  cardRect,
  viewport,
  measuredSheetHeight,
  isExZoneCard,
}: ComputeCoarseSheetPlacementParams): CoarseSheetPlacement {
  const rect = cardRect;
  const viewportLeft = viewport.left;
  const viewportTop = viewport.top;
  const viewportWidth = viewport.width;
  const viewportHeight = viewport.height;
  const viewportRight = viewportLeft + viewportWidth;
  const viewportBottom = viewportTop + viewportHeight;
  const viewportMargin = 6;
  const anchorOffset = isExZoneCard ? 4 : 6;
  const desiredSheetWidth = Math.round(viewportWidth * (isExZoneCard ? 0.7 : 0.74));
  const sheetWidth = isExZoneCard
    ? Math.max(208, Math.min(desiredSheetWidth, 272))
    : Math.max(220, Math.min(desiredSheetWidth, 300));

  const desiredLeft = rect.left + (rect.width / 2) - (sheetWidth / 2);
  const minLeft = viewportLeft + viewportMargin;
  const maxLeft = Math.max(minLeft, viewportRight - sheetWidth - viewportMargin);
  const left = Math.min(Math.max(desiredLeft, minLeft), maxLeft);

  const rawBelowSpace = viewportBottom - (rect.bottom + anchorOffset) - viewportMargin;
  const rawAboveSpace = rect.top - anchorOffset - (viewportTop + viewportMargin);
  const belowSpace = Math.max(0, rawBelowSpace);
  const aboveSpace = Math.max(0, rawAboveSpace);

  const estimatedSheetHeight = measuredSheetHeight > 0 ? measuredSheetHeight : 220;
  const minPreferredSpace = Math.min(172, estimatedSheetHeight);

  const placeBelow = isExZoneCard
    ? (aboveSpace < minPreferredSpace && belowSpace > aboveSpace)
    : belowSpace >= minPreferredSpace
      ? true
      : aboveSpace >= minPreferredSpace
        ? false
        : belowSpace >= aboveSpace;

  const maxHeight = Math.floor(placeBelow ? belowSpace : aboveSpace);
  const effectiveHeight = measuredSheetHeight > 0 ? Math.min(measuredSheetHeight, maxHeight) : maxHeight;

  let top = placeBelow
    ? rect.bottom + anchorOffset
    : rect.top - anchorOffset - effectiveHeight;

  const minTop = viewportTop + viewportMargin;
  const maxTop = Math.max(minTop, viewportBottom - effectiveHeight - viewportMargin);
  top = Math.min(Math.max(top, minTop), maxTop);

  return {
    top: Math.round(top),
    left: Math.round(left),
    width: sheetWidth,
    maxHeight: Math.max(1, maxHeight),
  };
}
