import { test } from "node:test";
import assert from "node:assert/strict";
import { selectionSteps, wrapIndex } from "../src/lib/carousel.ts";

test("Carousel indexes wrap in either direction", () => {
  assert.equal(wrapIndex(-1, 3), 2);
  assert.equal(wrapIndex(3, 3), 0);
  assert.equal(wrapIndex(17, 3), 2);
  assert.equal(wrapIndex(0, 0), 0);
});

test("Direct selection takes the shortest continuous route", () => {
  assert.equal(selectionSteps(0, 1, 3), 1);
  assert.equal(selectionSteps(0, 2, 3), -1);
  assert.equal(selectionSteps(2, 0, 3), 1);
  assert.equal(selectionSteps(1, 1, 3), 0);
  assert.equal(selectionSteps(0, 2, 5), 2);
  assert.equal(selectionSteps(4, 0, 6), 2);
});
