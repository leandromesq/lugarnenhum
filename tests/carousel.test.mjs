import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rebaseCursor,
  selectionSteps,
  wrapIndex,
} from "../src/lib/carousel.ts";

test("Carousel indexes wrap in either direction", () => {
  assert.equal(wrapIndex(-1, 3), 2);
  assert.equal(wrapIndex(3, 3), 0);
  assert.equal(wrapIndex(17, 3), 2);
  assert.equal(wrapIndex(0, 0), 0);
});

test("Rebasing preserves the selected disc and both neighbours", () => {
  for (const count of [2, 3, 5, 6, 10]) {
    for (const cursor of [count - 1, count, count * 2 - 1, count * 2]) {
      const rebased = rebaseCursor(cursor, count);
      assert.ok(rebased >= count && rebased < count * 2);
      for (const neighbour of [-1, 0, 1]) {
        assert.equal(
          wrapIndex(cursor + neighbour, count),
          wrapIndex(rebased + neighbour, count),
        );
      }
    }
  }
  assert.equal(rebaseCursor(1, 1), 0);
});

test("Direct selection takes the shortest continuous route", () => {
  assert.equal(selectionSteps(0, 1, 3), 1);
  assert.equal(selectionSteps(0, 2, 3), -1);
  assert.equal(selectionSteps(2, 0, 3), 1);
  assert.equal(selectionSteps(1, 1, 3), 0);
  assert.equal(selectionSteps(0, 2, 5), 2);
});
