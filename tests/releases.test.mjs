import { test } from "node:test";
import assert from "node:assert/strict";
import { releases } from "../src/data/band.ts";

test("The six mock CDs preserve the supplied song order and durations", () => {
  assert.deepEqual(
    releases.map(({ title, duration }) => [title, duration]),
    [
      ["conselhos/promessas", "3:46"],
      ["passo tanto tempo só", "3:18"],
      ["Sempre andei no seu caminho", "2:21"],
      ["interlúdio", "1:00"],
      ["o que eu vejo em você", "4:06"],
      ["todas as coisas", "2:46"],
    ],
  );
  assert.equal(new Set(releases.map(({ id }) => id)).size, 6);
});
