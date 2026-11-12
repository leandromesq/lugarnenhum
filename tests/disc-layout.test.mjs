import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SLOT_FIELD,
  damp,
  glide,
  slotAtPoint,
  slotPose,
  slotRank,
} from "../src/lib/disc-layout.ts";

const COUNT = 6;

test("CDs keep separate depth lanes whenever their faces overlap during a swap", () => {
  for (const count of [2, 3, 6]) {
    for (let frame = 0; frame <= 1000; frame++) {
      const cursor = frame / 1000;
      const poses = Array.from({ length: count }, (_, index) =>
        slotPose(slotRank(index, cursor, count), count),
      );
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const a = poses[i];
          const b = poses[j];
          const distance = Math.abs(a.x - b.x);
          if (distance >= (a.scale + b.scale) / 2) continue;
          // Thickness plus clearance for the shared yaw lean during movement.
          const clearance = 0.04 + distance * 0.15;
          assert.ok(
            Math.abs(a.z - b.z) > clearance,
            `CDs ${i}/${j} intersect at cursor ${cursor}, count ${count}`,
          );
        }
      }
    }
  }
});

test("Every inactive CD stays to the left, leaving the selected CD's hole clear", () => {
  for (const count of [2, 3, 6]) {
    for (let rank = 1; rank < count; rank++) {
      const pose = slotPose(rank, count);
      assert.ok(
        pose.x + pose.scale / 2 < -0.5,
        `inactive CD ${rank} must not sit behind the selected CD`,
      );
    }
  }
});

test("Ranks follow the fractional cursor and wrap in both directions", () => {
  assert.equal(slotRank(0, 0, COUNT), 0);
  assert.equal(slotRank(1, 0, COUNT), 1);
  assert.equal(slotRank(5, 0, COUNT), 5);
  assert.equal(slotRank(0, 1, COUNT), 5);
  assert.equal(slotRank(5, 1, COUNT), 4);
  assert.equal(slotRank(2, 6, COUNT), 2);
  assert.equal(slotRank(2, -6, COUNT), 2);
  assert.equal(slotRank(0, -0.25, COUNT), 0.25);
  assert.equal(slotRank(0, 0.25, COUNT), 5.75);
  for (let index = 0; index < COUNT; index++)
    for (let cursor = -6; cursor <= 12; cursor += 0.25) {
      const rank = slotRank(index, cursor, COUNT);
      assert.ok(rank >= 0 && rank < COUNT, "rank stays inside the ring");
      const resumed = slotRank(index, cursor + COUNT, COUNT);
      assert.ok(Math.abs(resumed - rank) < 1e-9, "one lap is the same rank");
    }
  assert.equal(slotRank(3, 3, 1), 0);
});

const close = (actual, expected) => {
  assert.ok(Math.abs(actual.x - expected.x) < 1e-9, "x matches");
  assert.ok(Math.abs(actual.z - expected.z) < 1e-9, "z matches");
  assert.ok(Math.abs(actual.scale - expected.scale) < 1e-9, "scale matches");
  assert.ok(Math.abs(actual.yaw - expected.yaw) < 1e-9, "yaw matches");
};

test("The selection sits centred and in front of the whole stack", () => {
  const selected = slotPose(0, COUNT);
  assert.deepEqual(selected, { x: 0, z: 0, scale: 1, yaw: 0 });
  for (let rank = 1; rank < COUNT; rank++) {
    const pose = slotPose(rank, COUNT);
    assert.ok(pose.x <= 0, "no disc is placed to the right of the selection");
    assert.ok(pose.scale < selected.scale, "stacked discs are smaller");
    assert.ok(pose.z < selected.z, "stacked discs sit behind the selection");
  }
});

test("Stacked discs overlap and step away from the selection to the left", () => {
  let previous = slotPose(1, COUNT);
  for (let rank = 2; rank < COUNT; rank++) {
    const pose = slotPose(rank, COUNT);
    assert.ok(pose.x < previous.x, "each slot is further left");
    assert.ok(pose.scale <= previous.scale, "scale never grows inward");
    const reach = (pose.scale + previous.scale) / 2;
    assert.ok(
      Math.abs(pose.x - previous.x) < reach,
      "neighbouring discs overlap instead of standing apart",
    );
    previous = pose;
  }
  // The nearest stack slot clears the selection by a visible gap.
  const first = slotPose(1, COUNT);
  assert.ok(
    SLOT_FIELD.gap - first.scale / 2 - 0.5 > 0.05,
    "a gap separates the selection from the stack",
  );
});

test("Queued discs wait on one level, each slightly smaller and closer than the last", () => {
  let previous = slotPose(1, COUNT);
  let previousGap = Infinity;
  for (let rank = 2; rank < COUNT; rank++) {
    const pose = slotPose(rank, COUNT);
    assert.ok(
      Math.abs(pose.scale / previous.scale - SLOT_FIELD.falloff) < 1e-9,
      "each disc shrinks by the same ratio",
    );
    const gap = previous.x - pose.x;
    assert.ok(gap < previousGap, "the spacing closes up with distance");
    assert.ok(
      gap > previous.scale / 3,
      "while most of each label stays visible",
    );
    assert.equal(pose.yaw, SLOT_FIELD.yaw, "all turned alike: parallel faces");
    previous = pose;
    previousGap = gap;
  }
});

test("The ring closes by bringing the last stacked disc back to the selection", () => {
  const last = slotPose(COUNT - 1, COUNT);
  const returning = slotPose(COUNT - 0.5, COUNT);
  assert.ok(returning.x > last.x && returning.x < 0);
  assert.ok(returning.scale > last.scale && returning.scale < 1);
  close(slotPose(COUNT, COUNT), slotPose(0, COUNT));
});

test("Every disc moves continuously, including across the wrap", () => {
  const step = 0.01;
  let previous = Array.from({ length: COUNT }, (_, index) =>
    slotPose(slotRank(index, 0, COUNT), COUNT),
  );
  for (let cursor = step; cursor <= COUNT; cursor += step) {
    const current = Array.from({ length: COUNT }, (_, index) =>
      slotPose(slotRank(index, cursor, COUNT), COUNT),
    );
    for (let index = 0; index < COUNT; index++) {
      const from = previous[index];
      const to = current[index];
      assert.ok(
        Math.abs(to.x - from.x) < 0.05,
        `disc ${index} keeps its position at cursor ${cursor.toFixed(2)}`,
      );
      assert.ok(Math.abs(to.z - from.z) < 0.05, "and its depth");
      assert.ok(Math.abs(to.yaw - from.yaw) < 0.02, "and its turn");
      assert.ok(Math.abs(to.scale - from.scale) < 0.02, "and its scale");
    }
    previous = current;
  }
});

test("Small stacks degrade without parking a disc out of sight", () => {
  for (const count of [1, 2, 3]) {
    assert.deepEqual(slotPose(0, count), { x: 0, z: 0, scale: 1, yaw: 0 });
    for (let index = 0; index < count; index++) {
      const pose = slotPose(slotRank(index, 0, count), count);
      assert.ok(pose.x <= 0);
    }
    close(slotPose(count, count), slotPose(0, count));
  }
  const second = slotPose(1, 2);
  assert.ok(second.x < -0.5, "the only other disc waits beside the selection");
});

test("Picking a disc resolves the frontmost one under the pointer", () => {
  assert.equal(slotAtPoint(0, 0, COUNT), 0);
  const first = slotPose(1, COUNT);
  assert.equal(slotAtPoint(first.x, 0, COUNT), 1);
  for (let rank = 1; rank < COUNT; rank++) {
    const pose = slotPose(rank, COUNT);
    const crescent = pose.x - pose.scale / 2 + 0.01;
    assert.equal(
      slotAtPoint(crescent, 0, COUNT),
      rank,
      "the visible sliver of a covered disc selects that disc",
    );
  }
  const gap = -(0.5 + (SLOT_FIELD.gap - first.scale / 2 - 0.5) / 2);
  assert.equal(slotAtPoint(gap, 0, COUNT), null, "the gap is not a disc");
  assert.equal(slotAtPoint(-40, 0, COUNT), null);
  assert.equal(slotAtPoint(0, 3, COUNT), null);
});

test("A glide from rest approaches without overshoot and stops there", () => {
  const target = 3;
  let motion = { cursor: 0, velocity: 0 };
  let offset = -target;
  for (let frame = 0; frame < 240; frame++) {
    motion = glide(motion, target, 4.6, 1 / 60);
    const next = motion.cursor - target;
    assert.ok(
      Math.abs(next) <= Math.abs(offset) + 1e-12,
      "the glide never turns back on itself",
    );
    assert.ok(
      next === 0 || offset === 0 || Math.sign(next) === Math.sign(offset),
      "and never overshoots",
    );
    offset = next;
  }
  assert.equal(motion.cursor, target);
  assert.equal(motion.velocity, 0);
});

test("A glide is frame-rate independent and perceptible for about a second", () => {
  const single = glide({ cursor: 0, velocity: 0 }, 1, 4.6, 1);
  let stepped = { cursor: 0, velocity: 0 };
  for (let frame = 0; frame < 60; frame++)
    stepped = glide(stepped, 1, 4.6, 1 / 60);
  assert.ok(Math.abs(stepped.cursor - single.cursor) < 1e-9);
  assert.ok(Math.abs(stepped.velocity - single.velocity) < 1e-9);

  const remaining = (seconds, distance) => {
    let motion = { cursor: 0, velocity: 0 };
    for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 120)
      motion = glide(motion, distance, 4.6, 1 / 120);
    return Math.abs(motion.cursor - distance) / distance;
  };
  for (const distance of [1, 3]) {
    assert.ok(
      remaining(0.5, distance) > 0.15,
      "still travelling at half a second",
    );
    assert.ok(remaining(0.8, distance) < 0.25, "but mostly there by 0.8s");
    assert.equal(remaining(2.5, distance), 0, "and parked after two seconds");
  }
});

test("Retargeting mid-glide keeps the cursor continuous", () => {
  let motion = { cursor: 0, velocity: 0 };
  for (let frame = 0; frame < 20; frame++)
    motion = glide(motion, 1, 4.6, 1 / 60);
  const before = motion.cursor;
  const after = glide(motion, 4, 4.6, 1 / 60);
  assert.ok(
    Math.abs(after.cursor - before) < 0.1,
    "no jump when the target moves",
  );
});

test("Damping converges without overshoot and is frame-rate independent", () => {
  const single = damp(0, 1, 4.6, 1);
  let stepped = 0;
  for (let frame = 0; frame < 60; frame++)
    stepped = damp(stepped, 1, 4.6, 1 / 60);
  assert.ok(Math.abs(stepped - single) < 1e-9);
  assert.ok(single > 0.98 && single < 1 + 1e-9);
  assert.ok(damp(1, 0, 9, 0) === 1);
  assert.ok(damp(-3, 2, 5, 0.016) > -3 && damp(-3, 2, 5, 0.016) < 2);
  assert.ok(
    damp(5, 0, 3, 0.1) > 0,
    "an approach from above never crosses zero",
  );
});

test("The active disc reaches full spin in about a second and coasts down", () => {
  const ramp = (from, to, lambda) => {
    let value = from;
    let elapsed = 0;
    while (Math.abs(value - to) > Math.abs(to - from) * 0.02 && elapsed < 10) {
      value = damp(value, to, lambda, 1 / 60);
      elapsed += 1 / 60;
    }
    return elapsed;
  };
  const accelerate = ramp(0, 1.6, 2.8);
  const decelerate = ramp(1.6, 0, 1.9);
  assert.ok(
    accelerate > 0.6 && accelerate < 1.5,
    "spin-up is gradual, not instant",
  );
  assert.ok(decelerate > accelerate, "spin-down is gentler than spin-up");
});
