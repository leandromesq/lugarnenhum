import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asciiScene,
  hoverCharacter,
  hoverTargets,
} from "../src/lib/ascii-scene.ts";
import {
  advanceGlyphCycle,
  createGlyphCycle,
  cycleBlend,
  cycleInterval,
} from "../src/lib/ascii-cycle.ts";

const advance = (state, active, time) =>
  advanceGlyphCycle(state, hoverTargets["."], 3, active, time, asciiScene);

test("Periodic intervals vary between cells and beats, within 400–700ms", () => {
  const intervals = new Set();
  for (let index = 0; index < 20; index++)
    for (let turn = 0; turn < 5; turn++) {
      const interval = cycleInterval(index, turn, asciiScene);
      assert.ok(interval >= 400 && interval <= 700);
      assert.equal(interval, cycleInterval(index, turn, asciiScene));
      intervals.add(interval);
    }
  assert.ok(intervals.size > 20);
});

test("A core glyph holds its state, then crossfades to a similar character", () => {
  const initial = createGlyphCycle(hoverCharacter(".", 3));
  const armed = advance(initial, true, 0);
  assert.equal(advance(armed, true, armed.nextAt - 1), armed);
  const changed = advance(armed, true, armed.nextAt);
  assert.equal(changed.from, armed.to);
  assert.notEqual(changed.to, changed.from);
  assert.ok(hoverTargets["."].includes(changed.to));
  assert.equal(cycleBlend(changed, changed.changedAt, asciiScene), 0);
  assert.equal(cycleBlend(changed, changed.changedAt + 75, asciiScene), 0.5);
  assert.equal(cycleBlend(changed, changed.changedAt + 150, asciiScene), 1);
});

test("Leaving the core cancels beats, lets a fade finish and never catches up in bursts", () => {
  const armed = advance(createGlyphCycle(":"), true, 0);
  const changed = advance(armed, true, armed.nextAt);
  const stopped = advance(changed, false, changed.changedAt + 30);
  assert.equal(stopped.nextAt, Infinity);
  assert.equal(advance(stopped, false, 99999), stopped);
  assert.equal(cycleBlend(stopped, changed.changedAt + 150, asciiScene), 1);
  const resumed = advance(stopped, true, 100000);
  assert.ok(resumed.nextAt > 100000);
  assert.equal(advance(resumed, true, 200000).turn, resumed.turn + 1);
});
