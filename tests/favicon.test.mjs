import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

test("Favicon uses the official white icon with transparent canvas and padding", async () => {
  const png = await readFile("src/app/icon.png");
  const ico = await readFile("src/app/favicon.ico");
  const expected = await sharp("public/assets/pencil/symbol.webp")
    .resize(64, 64, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  assert.deepEqual(png, expected);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 1);
  assert.equal(ico[6], 64);
  assert.equal(ico[7], 64);
  assert.equal(ico.readUInt32LE(14), png.length);
  assert.deepEqual(ico.subarray(ico.readUInt32LE(18)), png);
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 64);
  assert.equal(info.height, 64);
  for (const [x, y] of [
    [0, 0],
    [63, 0],
    [0, 63],
    [63, 63],
  ])
    assert.equal(data[(y * 64 + x) * 4 + 3], 0);
  let transparent = 0;
  let white = 0;
  let colored = 0;
  for (let index = 0; index < data.length; index += 4) {
    const [r, g, b, alpha] = data.subarray(index, index + 4);
    if (alpha === 0) transparent++;
    if (alpha > 200 && Math.min(r, g, b) > 220) white++;
    if (alpha > 200 && Math.max(r, g, b) - Math.min(r, g, b) > 30) colored++;
  }
  assert.ok(
    transparent > 64 * 64 * 0.3,
    "Original negative space stays transparent",
  );
  assert.ok(white > 30, "Official white ink remains visible");
  assert.ok(colored > 5, "Coloured figures are preserved");
});
