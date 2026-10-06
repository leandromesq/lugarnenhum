import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asciiScene,
  buildGlyphs,
  coverTransform,
  distortPoint,
  projectPoint,
  hoverCharacter,
  hoverTargets,
  rimSoftness,
  stepHover,
  stepHoverAmount,
} from "../src/lib/ascii-scene.ts";

const close = (a, b) => assert.ok(Math.abs(a - b) < 0.000001, `${a} != ${b}`);

test("Interaction radius and transition timings match the approved refinement", () => {
  assert.equal(asciiScene.radius, 55);
  assert.ok(asciiScene.softEdge >= 10 && asciiScene.softEdge <= 12);
  assert.equal(asciiScene.enterMs, 100);
  assert.equal(asciiScene.leaveMs, 220);
});

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
  assert.ok(lens.weight > 0 && lens.softness > 0);
  const outside = distortPoint({ x: 130, y: 0 }, { x: 0, y: 0 }, 120, 1);
  assert.deepEqual(outside, { x: 130, y: 0, weight: 0, softness: 0, zoom: 1 });
});

test("Lens is stable at its center and returns precisely to the base scene", () => {
  const center = distortPoint({ x: 0, y: 0 }, { x: 0, y: 0 }, 120, 1);
  assert.ok(Number.isFinite(center.x) && Number.isFinite(center.y));
  const inactive = distortPoint({ x: 40, y: 20 }, { x: 0, y: 0 }, 120, 0);
  assert.equal(inactive.x, 40);
  assert.equal(inactive.y, 20);
  assert.equal(inactive.weight, 0);
  assert.equal(inactive.zoom, 1);
});

test("Rim softness eases the outer band into the rest of the scene", () => {
  const radius = 120;
  const inner = radius - asciiScene.softEdge;
  assert.equal(rimSoftness(0, radius), 1);
  assert.equal(rimSoftness(inner, radius), 1);
  close(rimSoftness(inner + asciiScene.softEdge / 2, radius), 0.5);
  assert.equal(rimSoftness(radius, radius), 0);
  assert.equal(rimSoftness(radius + 20, radius), 0);
  // Monotonic and exactly zero at the boundary.
  const band = [inner, inner + 3, inner + 6, inner + 9, radius];
  for (let index = 1; index < band.length; index++) {
    assert.ok(
      rimSoftness(band[index], radius) < rimSoftness(band[index - 1], radius),
    );
  }
});

test("Glitch replacements use richer alphabets while keeping approximate density", () => {
  for (const character of [".", "+", "#"])
    assert.ok(hoverTargets[character].length >= 8);
  assert.ok(new Set(Object.values(hoverTargets).flat()).size >= 25);
  for (const [character, family] of Object.entries(hoverTargets)) {
    assert.ok(family.length > 0, `${character} has no family`);
    for (let index = 0; index < 24; index++) {
      const replacement = hoverCharacter(character, index);
      assert.notEqual(replacement, character);
      assert.ok(family.includes(replacement), `${character} -> ${replacement}`);
      assert.equal(hoverCharacter(character, index), replacement);
    }
  }
  // Every glyph the wordmark actually uses has a replacement.
  for (const character of asciiScene.characters) {
    assert.notEqual(hoverCharacter(character, 0), character);
  }
});

test("Radial hover amounts retain their exit animation instead of snapping to zero", () => {
  close(stepHoverAmount(1, 0, 110), 0.5);
  close(stepHoverAmount(0.5, 0, 110), 0);
  close(stepHoverAmount(0, 0.5, 50), 0.5);
  close(stepHoverAmount(0.5, 0.5, 1000), 0.5);
});

test("Hover transition settles, stays stable, and reverses smoothly", () => {
  // Entry is roughly 100ms, the return is a calmer 220ms.
  close(stepHover(0, true, 50), 0.5);
  close(stepHover(0.5, true, 50), 1);
  close(stepHover(1, true, 5000), 1);
  close(stepHover(1, false, 110), 0.5);
  close(stepHover(0.5, false, 110), 0);
  close(stepHover(0, false, 5000), 0);
  close(stepHover(0.5, false, 55), 0.25);
  close(stepHover(0.25, true, 25), 0.5);
  close(stepHover(0, true, 100), 1);
  assert.ok(stepHover(1, false, 100) > 0);
});
