import test from "node:test";
import assert from "node:assert/strict";

import {
  baseScaleFor,
  clampOffset,
  cropSourceRect,
  type Size,
} from "./cropMath.ts";

const IMG: Size = { w: 1000, h: 800 };
const FRAME: Size = { w: 320, h: 320 };

function covers(offset: { x: number; y: number }, scale: number, img: Size, frame: Size) {
  const right = offset.x + img.w * scale;
  const bottom = offset.y + img.h * scale;
  return offset.x <= 0 && offset.y <= 0 && right >= frame.w && bottom >= frame.h;
}

test("baseScaleFor makes the image cover the frame exactly on one axis", () => {
  const scale = baseScaleFor(IMG, FRAME);
  assert.equal(scale, 0.4); // height binds: 320 / 800
  assert.ok(IMG.w * scale >= FRAME.w);
  assert.ok(IMG.h * scale >= FRAME.h);
});

test("clampOffset keeps the photo covering the frame at any scale", () => {
  const scale = 0.8;
  const clamped = clampOffset({ x: -9999, y: 9999 }, scale, IMG, FRAME);
  assert.ok(covers(clamped, scale, IMG, FRAME), JSON.stringify(clamped));
  assert.equal(clamped.x, FRAME.w - IMG.w * scale);
  assert.equal(clamped.y, 0);
});

test("zooming out re-clamps the offset instead of leaving a blank strip", () => {
  // The regression: at scale 0.8 the image is 800×640, so dragging to the edge
  // gives x = -480, y = -320. Zooming out to the base scale (0.4, image 400×320)
  // leaves only 80px of horizontal slack and none vertically, so the old offset
  // is illegal and must be re-clamped instead of keeping a blank strip.
  const dragged = { x: FRAME.w - IMG.w * 0.8, y: FRAME.h - IMG.h * 0.8 };
  const zoomedOut = clampOffset(dragged, 0.4, IMG, FRAME);
  assert.deepEqual(zoomedOut, { x: -80, y: 0 });
  assert.ok(covers(zoomedOut, 0.4, IMG, FRAME));
});

test("cropSourceRect maps the visible frame in source pixels", () => {
  const rect = cropSourceRect({ x: -480, y: 0 }, 0.8, FRAME);
  assert.deepEqual(rect, { x: 600, y: 0, w: 400, h: 400 });
});

test("the source rect never leaves the image", () => {
  for (const scale of [0.4, 0.55, 0.9, 1.4, 3]) {
    for (const offset of [
      { x: -9999, y: -9999 },
      { x: 0, y: 0 },
      { x: -480, y: -320 },
    ]) {
      const clamped = clampOffset(offset, scale, IMG, FRAME);
      const rect = cropSourceRect(clamped, scale, FRAME);
      assert.ok(rect.x >= -1e-9 && rect.y >= -1e-9, JSON.stringify({ scale, rect }));
      assert.ok(rect.x + rect.w <= IMG.w + 1e-6, JSON.stringify({ scale, rect }));
      assert.ok(rect.y + rect.h <= IMG.h + 1e-6, JSON.stringify({ scale, rect }));
    }
  }
});
