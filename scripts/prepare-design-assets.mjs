import sharp from "sharp";
import { prepareBrandAssets } from "./prepare-brand-assets.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";

const source = process.argv[2];
if (!source)
  throw new Error(
    "Usage: node scripts/prepare-design-assets.mjs <Pencil assets directory> [official logos directory]",
  );
// Official logos live beside the .pen file, not among the older image imports.
const brandSource = process.argv[3] ?? dirname(resolve(source));
const target = resolve("public/assets/pencil");
await mkdir(target, { recursive: true });
const assets = [
  ["image-import-2.jpg", "home-desktop", 1920],
  ["image-import-4.jpg", "home-mobile", 1080],
  ["image-import-5.jpg", "about-desktop", 2200],
  ["image-import-7.jpg", "about-mobile", 1080],
];
for (const [input, name, width] of assets) {
  await sharp(join(source, input))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(join(target, `${name}.webp`));
  console.log(`Prepared ${name}.webp`);
}

await prepareBrandAssets(brandSource, target);
console.log("Prepared official light/dark symbols and wordmarks");

const icon = await sharp(join(target, "symbol.webp"))
  .resize(64, 64, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();
await writeFile("src/app/icon.png", icon);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 64;
header[7] = 64;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(icon.length, 14);
header.writeUInt32LE(22, 18);
await writeFile("src/app/favicon.ico", Buffer.concat([header, icon]));
