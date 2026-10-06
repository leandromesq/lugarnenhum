import { test } from "node:test";
import assert from "node:assert/strict";
import { darkSymbolPixel } from "../scripts/create-symbol-variant.mjs";

test("Dark symbol changes neutral ink/paper without shifting the coloured figures", () => {
  assert.deepEqual(darkSymbolPixel(255, 255, 255), [8, 9, 9]);
  assert.deepEqual(darkSymbolPixel(0, 0, 0), [245, 245, 245]);
  for (const colour of [
    [25, 205, 75],
    [20, 175, 225],
    [175, 230, 80],
  ]) {
    assert.deepEqual(darkSymbolPixel(...colour), colour);
  }
});
