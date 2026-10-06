import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  officialBrandSources,
  prepareBrandAssets,
} from "../scripts/prepare-brand-assets.mjs";

test("Official light/dark icons keep their own original ink and coloured figures", async () => {
  const root = await mkdtemp(join(tmpdir(), "lugarnenhum-brand-"));
  const source = join(root, "source");
  const target = join(root, "prepared");
  await mkdir(source);
  const palettes = {
    darkSymbol: [0, 0, 0, 255, 0, 151, 70, 255, 0, 169, 158, 255, 0, 0, 0, 0],
    lightSymbol: [
      255, 255, 255, 255, 0, 151, 70, 255, 0, 169, 158, 255, 0, 0, 0, 0,
    ],
    wordmark: [0, 0, 0, 255, 0, 0, 0, 128, 0, 0, 0, 0],
  };
  for (const [key, pixels] of Object.entries(palettes))
    await sharp(Buffer.from(pixels), {
      raw: { width: pixels.length / 4, height: 1, channels: 4 },
    })
      .png()
      .toFile(join(source, officialBrandSources[key]));
  await prepareBrandAssets(source, target);
  for (const [key, filename] of [
    ["darkSymbol", "symbol-dark.webp"],
    ["lightSymbol", "symbol.webp"],
    ["wordmark", "wordmark-dark.webp"],
  ]) {
    const image = sharp(join(target, filename));
    assert.equal((await image.metadata()).hasAlpha, true);
    assert.deepEqual([...(await image.raw().toBuffer())], palettes[key]);
  }
  const white = [
    ...(await sharp(join(target, "wordmark.webp")).raw().toBuffer()),
  ];
  assert.deepEqual(white.slice(0, 4), [255, 255, 255, 255]);
  assert.deepEqual(white.slice(4, 8), [255, 255, 255, 128]);
  assert.equal(white[11], 0);
});
