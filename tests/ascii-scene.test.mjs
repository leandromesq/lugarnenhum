import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asciiScene,
  buildGlyphs,
  coverTransform,
  distortPoint,
  projectPoint,
  hoverCharacter,
  stepHover,
} from "../src/lib/ascii-scene.ts";

const close = (a, b) => assert.ok(Math.abs(a - b) < 0.000001, `${a} != ${b}`);

for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
  [1024, 768],
  [2560, 1080],
]) {
  test(`Photo and ASCII share the same cover projection at ${width}x${height}`, () => {
    const transform = coverTransform(width, height);
    assert.ok(asciiScene.imageWidth * transform.scale >= width);
    assert.ok(asciiScene.imageHeight * transform.scale >= height);
    const center = projectPoint({ x: 960, y: 640 }, transform);
    close(center.x, width / 2);
    close(center.y, height / 2);
    const point = { x: 820, y: 450 };
    const projected = projectPoint(point, transform);
    close((projected.x - transform.offsetX) / transform.scale, point.x);
    close((projected.y - transform.offsetY) / transform.scale, point.y);
  });
}

test("Reference frame preserves the design's original ASCII origin", () => {
  const transform = coverTransform(1920, 1080);
  close(transform.scale, 1);
  close(transform.offsetY, -100);
  const origin = projectPoint(
    { x: asciiScene.originX, y: asciiScene.originY },
    transform,
  );
  close(origin.x, -42);
  close(origin.y, -74);
});

test("Whitespace remains empty while glyphs keep their row and column anchors", () => {
  const glyphs = buildGlyphs(" + \n  #");
  assert.equal(glyphs.length, 2);
  assert.equal(glyphs[0].character, "+");
  close(glyphs[0].x, asciiScene.originX + asciiScene.columnAdvance);
  close(glyphs[1].x, asciiScene.originX + asciiScene.columnAdvance * 2);
  close(glyphs[1].y, asciiScene.originY + asciiScene.rowAdvance);
});

test("Lens pushes characters outward only inside the interaction radius", () => {
  const lens = distortPoint({ x: 40, y: 0 }, { x: 0, y: 0 }, 120, 1);
  assert.ok(lens.x > 40 && lens.x < 52);
  assert.ok(lens.zoom > 1 && lens.zoom <= 1.18);
  const outside = distortPoint({ x: 130, y: 0 }, { x: 0, y: 0 }, 120, 1);
  assert.deepEqual(outside, { x: 130, y: 0, weight: 0, zoom: 1 });
});

test("Lens is stable at its center and returns precisely to the base scene", () => {
  const center = distortPoint({ x: 0, y: 0 }, { x: 0, y: 0 }, 120, 1);
  assert.ok(Number.isFinite(center.x) && Number.isFinite(center.y));
  const inactive = distortPoint({ x: 40, y: 20 }, { x: 0, y: 0 }, 120, 0);
  assert.deepEqual(inactive, { x: 40, y: 20, weight: 0, zoom: 1 });
});

test("Every hovered glyph has one distinct and stable replacement", () => {
  for (const character of asciiScene.characters) {
    for (let index = 0; index < 20; index++) {
      const replacement = hoverCharacter(character, index);
      assert.notEqual(replacement, character);
      assert.equal(hoverCharacter(character, index), replacement);
      assert.ok(asciiScene.characters.includes(replacement));
    }
  }
});

test("Hover transition settles, stays stable, and reverses smoothly", () => {
  close(stepHover(0, true, 90), 0.5);
  close(stepHover(0.5, true, 90), 1);
  close(stepHover(1, true, 5000), 1);
  close(stepHover(1, false, 90), 0.5);
  close(stepHover(0.5, false, 90), 0);
  close(stepHover(0, false, 5000), 0);
  close(stepHover(0.5, false, 45), 0.25);
  close(stepHover(0.25, true, 45), 0.5);
});
