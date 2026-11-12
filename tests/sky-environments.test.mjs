import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  getSkyPeriod,
  skyEnvironments,
  skyPeriodHours,
  skyPeriods,
} from "../src/lib/sky-environments.ts";
import { decodeRgbe, encodeRgbe } from "../scripts/prepare-sky-assets.mjs";

const skyDir = fileURLToPath(new URL("../public/assets/sky", import.meta.url));

function luminance(pixels) {
  let sum = 0;
  let max = 0;
  for (let i = 0; i < pixels.length; i += 3) {
    const value =
      0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    sum += value;
    if (value > max) max = value;
  }
  return { mean: sum / (pixels.length / 3), max };
}

test("A visitor's local hour maps to the documented half-open periods", () => {
  const hours = [
    [0, "night"],
    [5.99, "night"],
    [6, "morning"],
    [7.5, "morning"],
    [9.99, "morning"],
    [10, "day"],
    [12, "day"],
    [15.99, "day"],
    [16, "sunset"],
    [18.5, "sunset"],
    [18.99, "sunset"],
    [19, "night"],
    [21.25, "night"],
    [23.99, "night"],
  ];
  for (const [hour, period] of hours)
    assert.equal(getSkyPeriod(hour), period, `${hour}h`);
});

test("Hours outside 0–23 wrap around midnight instead of falling through", () => {
  assert.equal(getSkyPeriod(24), "night");
  assert.equal(getSkyPeriod(30), "morning");
  assert.equal(getSkyPeriod(-1), "night");
  assert.equal(getSkyPeriod(-14), "day");
});

test("A clock that is not a finite number is rejected", () => {
  for (const value of [Number.NaN, Infinity, -Infinity])
    assert.throws(() => getSkyPeriod(value), TypeError);
});

test("The documented periods cover the whole day exactly once", () => {
  assert.deepEqual(Object.keys(skyPeriodHours).sort(), [
    "day",
    "morning",
    "night",
    "sunset",
  ]);
  let covered = 0;
  for (const period of skyPeriods) {
    const { start, end } = skyPeriodHours[period];
    covered += (end - start + 24) % 24;
  }
  assert.equal(covered, 24);
  assert.deepEqual([...skyPeriods], ["morning", "day", "sunset", "night"]);
});

test("Each period publishes one reflection panorama and two sky layers", () => {
  assert.deepEqual(Object.keys(skyEnvironments).sort(), [
    "day",
    "morning",
    "night",
    "sunset",
  ]);
  const paths = new Set();
  for (const period of skyPeriods) {
    const sky = skyEnvironments[period];
    assert.equal(sky.period, period);
    assert.ok(sky.label.length > 0);
    for (const path of [
      sky.reflection,
      sky.background.webp2k,
      sky.background.webp4k,
    ]) {
      assert.match(path, /^\/assets\/sky\/[\w-]+\.(webp|hdr)$/);
      assert.ok(!paths.has(path), `${path} is shared between periods`);
      paths.add(path);
    }
    assert.ok(sky.exposure > 0 && sky.exposure <= 1.5);
  }
  assert.equal(paths.size, skyPeriods.length * 3);
});

test("Every period keeps the sun at the same azimuth", () => {
  for (const period of skyPeriods)
    assert.equal(skyEnvironments[period].rotationDeg, 0);
});

test("RGBE encoding round-trips inside its own quantisation step", () => {
  const width = 16;
  const height = 4;
  const pixels = new Float32Array(width * height * 3);
  for (let i = 0; i < pixels.length; i += 1)
    pixels[i] = ((i % 7) + 1) * 0.05 * (i % 3 === 0 ? 1 : 0.4);
  const file = encodeRgbe(pixels, width, height);
  const decoded = decodeRgbe(file);
  assert.equal(decoded.width, width);
  assert.equal(decoded.height, height);
  for (let i = 0; i < pixels.length; i += 3) {
    const peak = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
    for (let channel = 0; channel < 3; channel += 1)
      assert.ok(
        Math.abs(decoded.pixels[i + channel] - pixels[i + channel]) <=
          peak / 128 + 1e-6,
        `pixel ${i / 3} channel ${channel} drifted`,
      );
  }
  assert.deepEqual(
    decodeRgbe(encodeRgbe(decoded.pixels, width, height)).pixels,
    decoded.pixels,
  );
});

test("Reflection panoramas decode to a faithful 1K sky", async () => {
  // Tone-mapped range from the source EXRs; a scaled or truncated encoder
  // (for example half-float saturation at 65504) falls outside these bounds.
  const expected = {
    morning: { mean: 0.277, tolerance: 0.06 },
    day: { mean: 0.557, tolerance: 0.06 },
    sunset: { mean: 0.179, tolerance: 0.05 },
    night: { mean: 0.111, tolerance: 0.04 },
  };
  for (const period of skyPeriods) {
    const file = join(
      skyDir,
      skyEnvironments[period].reflection.split("/").pop(),
    );
    const decoded = decodeRgbe(await readFile(file));
    assert.deepEqual([decoded.width, decoded.height], [1024, 512]);
    const { mean, max } = luminance(decoded.pixels);
    assert.ok(
      Math.abs(mean - expected[period].mean) < expected[period].tolerance,
      `${period} mean luminance ${mean.toFixed(4)}`,
    );
    assert.ok(max < 40_000, `${period} peak ${max.toFixed(0)} looks truncated`);
  }
});

test("Visible sky layers are WebP panoramas at 2K and 4K", async () => {
  const expected = { webp2k: [2048, 1024], webp4k: [4096, 2048] };
  for (const period of skyPeriods) {
    for (const [layer, [width, height]] of Object.entries(expected)) {
      const file = join(
        skyDir,
        skyEnvironments[period].background[layer].split("/").pop(),
      );
      const metadata = await sharp(file).metadata();
      assert.equal(metadata.format, "webp");
      assert.deepEqual([metadata.width, metadata.height], [width, height]);
      assert.ok((await stat(file)).size > 10_000);
    }
  }
});
