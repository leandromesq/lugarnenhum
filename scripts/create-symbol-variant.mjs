import sharp from "sharp";

/** Invert only neutral ink/paper. The coloured figures keep their original hues. */
export function darkSymbolPixel(red, green, blue) {
  if (Math.max(red, green, blue) - Math.min(red, green, blue) > 24)
    return [red, green, blue];
  return [
    Math.round(8 + ((255 - red) * 237) / 255),
    Math.round(9 + ((255 - green) * 236) / 255),
    Math.round(9 + ((255 - blue) * 236) / 255),
  ];
}

export async function createDarkSymbol(input, output) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += info.channels) {
    if (!data[offset + 3]) continue;
    const [red, green, blue] = darkSymbolPixel(
      data[offset],
      data[offset + 1],
      data[offset + 2],
    );
    data[offset] = red;
    data[offset + 1] = green;
    data[offset + 2] = blue;
  }
  await sharp(data, { raw: info }).webp({ lossless: true }).toFile(output);
}
