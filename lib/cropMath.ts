/**
 * Crop maths for the visa-photo tool, kept out of the React component so it can
 * be tested without a browser or a build step.
 *
 * The invariant every function here protects: **the photo always covers the crop
 * frame**. A gap would export as a blank strip, which is exactly what an embassy
 * rejects.
 */

export type Size = { w: number; h: number };
export type Offset = { x: number; y: number };
export type SourceRect = { x: number; y: number; w: number; h: number };

/** Smallest scale at which `img` still covers the whole `frame`. */
export function baseScaleFor(img: Size, frame: Size): number {
  if (!img.w || !img.h) return 1;
  return Math.max(frame.w / img.w, frame.h / img.h);
}

/**
 * Clamp a drag offset so the image keeps covering the frame.
 *
 * `scale` is a parameter rather than ambient state so that *changing the zoom*
 * re-clamps against the new scale. Dragging to an edge and then zooming out used
 * to leave a blank strip on the right/bottom of the export, because the old
 * offset was only legal at the old scale.
 */
export function clampOffset(
  offset: Offset,
  scale: number,
  img: Size,
  frame: Size,
): Offset {
  const minX = Math.min(0, frame.w - img.w * scale);
  const minY = Math.min(0, frame.h - img.h * scale);
  return {
    x: Math.max(minX, Math.min(0, offset.x)),
    y: Math.max(minY, Math.min(0, offset.y)),
  };
}

/** The visible frame, in source-image pixels, for `drawImage`'s source rect. */
export function cropSourceRect(
  offset: Offset,
  scale: number,
  frame: Size,
): SourceRect {
  if (!(scale > 0)) throw new Error("scale must be positive");
  return {
    // `=== 0 ? 0 : …` keeps -0 out of the result; callers compare rects exactly.
    x: offset.x === 0 ? 0 : -offset.x / scale,
    y: offset.y === 0 ? 0 : -offset.y / scale,
    w: frame.w / scale,
    h: frame.h / scale,
  };
}
