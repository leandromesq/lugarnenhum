// Ambient CG sky HDRIs -> web-ready visible sky + reflection panoramas.
//
// Run from the repository root: `node scripts/prepare-sky-assets.mjs [--force]`.
// Downloads are cached in $SKY_CACHE (default: <tmp>/lugarnenhum-sky-cache) and
// never land in the repository; only the reduced assets are published.
//
// Pipeline per period:
//   1. download the pinned 1K and 4K ambientCG zip (CC0) and verify its byte
//      size, writing through a .part file before renaming it into the cache;
//   2. unzip the Radiance .exr, decode the 1K one to linear float and encode a
//      standard RGBE scanline panorama for reflections. ImageMagick's HDR
//      writer does not round-trip these EXRs: three.js decodes its output 2.7x
//      too bright with saturated highlights, so the file is written here and
//      verified by decoding it back;
//   3. decode the 4K .exr, apply the pinned exposure and an ACES-style filmic
//      curve + sRGB transfer, then encode 4K and 2K WebP layers.
//
// Every step is idempotent: existing zips, extractions, HDR panoramas and WebP
// layers are reused, so a second run only re-validates and re-reports.
import { execFile } from "node:child_process";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);

const OUTPUT_DIR = resolve("public/assets/sky");

/** Pinned ambientCG releases (CC0). Byte sizes come from the ambientCG API. */
export const skyAssetPlan = [
  {
    period: "morning",
    assetId: "MorningSkyHDRI013B",
    zipBytes: { "1K": 2596178, "4K": 16821985 },
    hdr: "morning-sky-reflection-1k.hdr",
    visible: "morning-sky",
    // Auto exposure (0.5 / p85 luminance) is 1.44 and washes out the horizon;
    // 1.2 keeps the blue zenith deep while the low sun keeps its glow.
    exposure: 1.2,
  },
  {
    period: "day",
    assetId: "DaySkyHDRI071B",
    zipBytes: { "1K": 2553896, "4K": 16235967 },
    hdr: "day-sky-reflection-1k.hdr",
    visible: "day-sky",
    // 1.0 was a near-white haze; 0.8 restores a blue sky.
    exposure: 0.8,
  },
  {
    period: "sunset",
    assetId: "EveningSkyHDRI046B",
    zipBytes: { "1K": 2758978, "4K": 17311960 },
    hdr: "sunset-sky-reflection-1k.hdr",
    visible: "sunset-sky",
    // 2.2 (auto) turns the golden band white; 1.55 keeps the warm horizon.
    exposure: 1.55,
  },
  {
    period: "night",
    assetId: "NightSkyHDRI005",
    zipBytes: { "1K": 2644943, "4K": 17767000 },
    hdr: "night-sky-reflection-1k.hdr",
    visible: "night-sky",
    // This panorama is a hazy night sky (no heavy star field); a low exposure
    // keeps it night-dark with only the distant light-pollution glow visible.
    exposure: 1.25,
  },
];

const webpWidths = [
  ["4k", 4096],
  ["2k", 2048],
];

async function fileBytes(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return -1;
  }
}

async function downloadZip(
  cacheDir,
  assetId,
  resolution,
  expectedBytes,
  force,
) {
  const zipPath = join(cacheDir, `${assetId}_${resolution}.zip`);
  if (!force && (await fileBytes(zipPath)) === expectedBytes)
    return { zipPath, status: "cached" };
  const url = `https://ambientcg.com/get?file=${assetId}_${resolution}.zip`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      `${url} answered ${response.status} ${response.statusText}`,
    );
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length !== expectedBytes)
    throw new Error(
      `${assetId}_${resolution}.zip: expected ${expectedBytes} bytes, got ${body.length}`,
    );
  const partial = `${zipPath}.part`;
  await writeFile(partial, body);
  await rename(partial, zipPath);
  return { zipPath, status: "downloaded" };
}

async function extractExr(cacheDir, zipPath, force) {
  const entry = `${basename(zipPath, ".zip")}_HDR.exr`;
  const exrPath = join(cacheDir, entry);
  if (!force && (await fileBytes(exrPath)) > 0)
    return { exrPath, status: "extracted" };
  await run("unzip", ["-o", "-j", zipPath, entry, "-d", cacheDir]);
  return { exrPath, status: "unzipped" };
}

/** Decode a Radiance EXR into linear float32 RGB through ImageMagick. */
async function linearPixels(exrPath, width, height) {
  const rawPath = `${exrPath}.raw`;
  const expected = width * height * 3 * 4;
  if ((await fileBytes(rawPath)) !== expected) {
    await run("magick", [
      exrPath,
      "-depth",
      "32",
      "-endian",
      "LSB",
      "-define",
      "quantum:format=floating-point",
      `rgb:${rawPath}`,
    ]);
    if ((await fileBytes(rawPath)) !== expected)
      throw new Error(`unexpected raw size for ${rawPath}`);
  }
  const raw = await readFile(rawPath);
  // Float32Array needs 4-byte alignment; readFile buffers are pooled.
  return new Float32Array(
    raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
  );
}

/** ACES-style filmic curve followed by the sRGB opto-electronic transfer. */
export function toneMap(pixels, exposure) {
  const out = Buffer.allocUnsafe(pixels.length);
  for (let i = 0; i < pixels.length; i += 1) {
    const x = Math.max(0, pixels[i] * exposure);
    const filmic = Math.min(
      1,
      (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14),
    );
    const encoded =
      filmic <= 0.0031308
        ? 12.92 * filmic
        : 1.055 * Math.pow(filmic, 1 / 2.4) - 0.055;
    out[i] = Math.round(Math.min(1, Math.max(0, encoded)) * 255);
  }
  return out;
}

/**
 * Encode linear float RGB as a Radiance RGBE panorama with RLE scanlines.
 *
 * The mantissa/exponent split follows the reference `rgbe.c` (`frexp` keeps the
 * mantissa in `[0.5, 1)`), which is what three.js' HDRLoader and ffmpeg decode.
 * Returns the whole file: header, then one `2,2,hi,lo` scanline per row.
 */
export function encodeRgbe(pixels, width, height) {
  const parts = [
    Buffer.from(
      `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`,
      "latin1",
    ),
  ];
  const scanline = new Uint8Array(width * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 3;
      const red = pixels[source];
      const green = pixels[source + 1];
      const blue = pixels[source + 2];
      const peak = Math.max(red, green, blue);
      const target = x * 4;
      if (!(peak > 1e-32)) {
        scanline[target] = 0;
        scanline[target + 1] = 0;
        scanline[target + 2] = 0;
        scanline[target + 3] = 0;
        continue;
      }
      // Same split as rgbe.c: mantissa in [0.5, 1), so 256 / 2^exponent is the
      // factor that maps the peak channel to a full mantissa byte.
      const exponent = Math.floor(Math.log2(peak)) + 1;
      const scale = 256 / Math.pow(2, exponent);
      scanline[target] = Math.min(255, Math.floor(red * scale));
      scanline[target + 1] = Math.min(255, Math.floor(green * scale));
      scanline[target + 2] = Math.min(255, Math.floor(blue * scale));
      scanline[target + 3] = exponent + 128;
    }
    parts.push(Buffer.from([2, 2, (width >> 8) & 0xff, width & 0xff]));
    for (let channel = 0; channel < 4; channel += 1) {
      let x = 0;
      while (x < width) {
        let end = x;
        while (
          end < width &&
          scanline[end * 4 + channel] === scanline[x * 4 + channel] &&
          end - x < 127
        )
          end += 1;
        if (end - x >= 4) {
          parts.push(Buffer.from([128 + (end - x), scanline[x * 4 + channel]]));
          x = end;
          continue;
        }
        const start = x;
        while (x < width && x - start < 128) {
          let run = x;
          while (
            run < width &&
            scanline[run * 4 + channel] === scanline[x * 4 + channel] &&
            run - x < 4
          )
            run += 1;
          if (run - x >= 4) break;
          x = run;
        }
        // Repeat detection can overshoot the 128-pixel literal limit, so the
        // emitted length (and the cursor) are capped instead of trusted.
        const length = Math.min(x - start, 128);
        x = start + length;
        const bytes = Buffer.allocUnsafe(length + 1);
        bytes[0] = length;
        for (let i = 0; i < length; i += 1)
          bytes[i + 1] = scanline[(start + i) * 4 + channel];
        parts.push(bytes);
      }
    }
  }
  return Buffer.concat(parts);
}

/** Reference RGBE reader used to prove a written panorama round-trips. */
export function decodeRgbe(buffer) {
  const headerEnd = buffer.indexOf("\n\n", 0, "latin1") + 2;
  const resolution = buffer
    .subarray(headerEnd, buffer.indexOf("\n", headerEnd, "latin1"))
    .toString("latin1");
  const [, height, width] = resolution.match(/-Y (\d+) \+X (\d+)/).map(Number);
  const pixels = new Float32Array(width * height * 3);
  let position = headerEnd + resolution.length + 1;
  for (let y = 0; y < height; y += 1) {
    if (
      buffer[position] !== 2 ||
      buffer[position + 1] !== 2 ||
      ((buffer[position + 2] << 8) | buffer[position + 3]) !== width
    )
      throw new Error(
        `scanline ${y} at ${position}: expected 2,2,${(width >> 8) & 0xff},${width & 0xff}, got ${[...buffer.subarray(position, position + 8)].join(",")}`,
      );
    position += 4;
    const row = new Uint8Array(width * 4);
    for (let channel = 0; channel < 4; channel += 1) {
      let x = 0;
      while (x < width) {
        const count = buffer[position];
        position += 1;
        if (count > 128) {
          const value = buffer[position];
          position += 1;
          for (let i = 0; i < count - 128; i += 1)
            row[(x + i) * 4 + channel] = value;
          x += count - 128;
        } else {
          for (let i = 0; i < count; i += 1)
            row[(x + i) * 4 + channel] = buffer[position + i];
          position += count;
          x += count;
        }
      }
    }
    for (let x = 0; x < width; x += 1) {
      const exponent = row[x * 4 + 3];
      const scale = exponent === 0 ? 0 : Math.pow(2, exponent - 136);
      const target = (y * width + x) * 3;
      pixels[target] = row[x * 4] * scale;
      pixels[target + 1] = row[x * 4 + 1] * scale;
      pixels[target + 2] = row[x * 4 + 2] * scale;
    }
  }
  return { width, height, pixels };
}

function meanLuminance(pixels) {
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 3)
    sum += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
  return sum / (pixels.length / 3);
}

async function writeHdr(exrPath, hdrPath) {
  const width = 1024;
  const height = 512;
  const pixels = await linearPixels(exrPath, width, height);
  const encoded = encodeRgbe(pixels, width, height);
  const decoded = decodeRgbe(encoded);
  const expected = meanLuminance(pixels);
  const actual = meanLuminance(decoded.pixels);
  const drift = Math.abs(actual - expected) / expected;
  if (decoded.width !== width || decoded.height !== height || drift > 0.02)
    throw new Error(
      `${basename(hdrPath)} failed its round trip (drift ${drift.toFixed(4)})`,
    );
  const partial = `${hdrPath}.part`;
  await writeFile(partial, encoded);
  await rename(partial, hdrPath);
  return { bytes: encoded.length, drift };
}

async function writeWebp(
  outputDir,
  pixels,
  width,
  height,
  asset,
  name,
  targetWidth,
  force,
) {
  const path = join(outputDir, `${asset.visible}-${name}.webp`);
  if (!force && (await fileBytes(path)) > 0) return { path, status: "cached" };
  const partial = `${path}.part.webp`;
  await sharp(pixels, { raw: { width, height, channels: 3 } })
    .resize(targetWidth, targetWidth / 2, { kernel: "lanczos3" })
    .webp({ quality: 88, effort: 6 })
    .toFile(partial);
  await rename(partial, path);
  return { path, status: "encoded" };
}

export async function prepareSkyAssets({
  cacheDir = process.env.SKY_CACHE ?? join(tmpdir(), "lugarnenhum-sky-cache"),
  outputDir = OUTPUT_DIR,
  force = false,
  log = console.log,
} = {}) {
  await mkdir(cacheDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  for (const asset of skyAssetPlan) {
    const source1k = await downloadZip(
      cacheDir,
      asset.assetId,
      "1K",
      asset.zipBytes["1K"],
      force,
    );
    const source4k = await downloadZip(
      cacheDir,
      asset.assetId,
      "4K",
      asset.zipBytes["4K"],
      force,
    );
    const exr1k = await extractExr(cacheDir, source1k.zipPath, force);
    const exr4k = await extractExr(cacheDir, source4k.zipPath, force);
    const hdrPath = join(outputDir, asset.hdr);
    let hdr = { status: "kept" };
    if (force || (await fileBytes(hdrPath)) < 0) {
      await writeHdr(exr1k.exrPath, hdrPath);
      hdr = { status: "encoded" };
    }
    const pixels = await linearPixels(exr4k.exrPath, 4096, 2048);
    const layers = [];
    for (const [name, targetWidth] of webpWidths)
      layers.push(
        await writeWebp(
          outputDir,
          toneMap(pixels, asset.exposure),
          4096,
          2048,
          asset,
          name,
          targetWidth,
          force,
        ),
      );
    log(
      [
        `${asset.period.padEnd(7)} ${asset.assetId}`,
        `zip 1K/4K ${source1k.status}/${source4k.status}`,
        `exr ${exr1k.status}/${exr4k.status}`,
        `hdr ${hdr.status}`,
        ...layers.map((layer) => `${basename(layer.path)} ${layer.status}`),
      ].join(" | "),
    );
  }

  let total = 0;
  for (const asset of skyAssetPlan) {
    for (const file of [
      asset.hdr,
      ...webpWidths.map(([name]) => `${asset.visible}-${name}.webp`),
    ]) {
      const bytes = await fileBytes(join(outputDir, file));
      total += bytes;
      log(`${file} ${(bytes / 1024).toFixed(1)} KiB`);
    }
  }
  log(`total ${(total / 1024 / 1024).toFixed(2)} MiB`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
  await prepareSkyAssets({ force: process.argv.includes("--force") });
