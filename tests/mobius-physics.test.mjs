import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coast,
  dragRotation,
  dragVelocity,
  fidgetPhysics,
} from "../src/lib/mobius-physics.ts";

test("Drag directions map to screen-aligned horizontal and vertical rotation", () => {
  assert.deepEqual(dragRotation(0, 0, 140), { x: 0, y: 0 });
  assert.ok(dragRotation(30, 0, 140).y > 0);
  assert.ok(dragRotation(-30, 0, 140).y < 0);
  assert.ok(dragRotation(0, -30, 140).x < 0);
  assert.ok(dragRotation(0, 30, 140).x > 0);
  assert.equal(dragRotation(30, 0, 140).x, 0);
});

test("Faster drags transfer more impulse; rapid reversals never coast the wrong way", () => {
  const angle = dragRotation(30, 0, 140);
  const slow = dragVelocity({ x: 0, y: 0 }, angle, 200);
  const fast = dragVelocity({ x: 0, y: 0 }, angle, 20);
  assert.ok(fast.y > slow.y);
  assert.ok(Math.hypot(fast.x, fast.y) <= fidgetPhysics.maxSpeed);
  const reversed = dragVelocity(fast, dragRotation(-30, 0, 140), 10);
  assert.ok(reversed.y < 0);
});

test("Momentum keeps the drag axis and direction while losing speed smoothly", () => {
  const initial = { x: -4, y: 0 };
  const next = coast(initial, 0.5);
  assert.ok(next.rotation.x < 0);
  assert.equal(next.rotation.y, 0);
  assert.ok(next.velocity.x > initial.x && next.velocity.x < 0);
  assert.equal(next.velocity.y, 0);
  assert.deepEqual(coast({ x: 0.001, y: 0 }, 1).velocity, { x: 0, y: 0 });
});

test("Coasting integrates equally at 30 and 120 fps", () => {
  const simulate = (fps) => {
    let velocity = { x: 4, y: -2 };
    const rotation = { x: 0, y: 0 };
    for (let frame = 0; frame < fps; frame++) {
      const next = coast(velocity, 1 / fps);
      velocity = next.velocity;
      rotation.x += next.rotation.x;
      rotation.y += next.rotation.y;
    }
    return { velocity, rotation };
  };
  const slow = simulate(30);
  const fast = simulate(120);
  for (const key of ["x", "y"]) {
    assert.ok(Math.abs(slow.velocity[key] - fast.velocity[key]) < 1e-10);
    assert.ok(Math.abs(slow.rotation[key] - fast.rotation[key]) < 1e-10);
  }
});
