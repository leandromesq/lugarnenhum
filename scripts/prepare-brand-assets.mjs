import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

/** Original files referenced by Pencil nodes x1Gr2t, vRHFs and t6AMC. */
export const officialBrandSources = {
  darkSymbol: "LOGO ICONE COM BONECOS.png",
  lightSymbol: "LOGO ICONE COM BONECOS branco.png",
  wordmark: "LOGO LUGAR NENHUM ESCRITO.png",
};

export async function prepareBrandAssets(source, target) {
  await mkdir(target, { recursive: true });
  for (const [name, filename] of [
    ["symbol-dark", officialBrandSources.darkSymbol],
    ["symbol", officialBrandSources.lightSymbol],
  ]) {
    await sharp(join(source, filename))
      .resize({ width: 600, withoutEnlargement: true })
      .webp({ lossless: true })
      .toFile(join(target, `${name}.webp`));
  }
  const wordmark = sharp(join(source, officialBrandSources.wordmark)).resize({
    width: 900,
    withoutEnlargement: true,
  });
  await wordmark
    .clone()
    .webp({ lossless: true })
    .toFile(join(target, "wordmark-dark.webp"));
  // Only tint the monochrome wordmark; never derive the coloured icon variants.
  await wordmark
    .clone()
    .negate({ alpha: false })
    .webp({ lossless: true })
    .toFile(join(target, "wordmark.webp"));
}
