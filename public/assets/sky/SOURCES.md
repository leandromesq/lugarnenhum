# Sky environment sources

All four sky panoramas come from [ambientCG](https://ambientcg.com), which
releases its assets under the
[Creative Commons CC0 1.0 Universal license](https://ambientcg.com/license)
("All ambientCG assets are provided under the Creative Commons CC0 1.0
Universal License"; attribution is appreciated, not required). The license was
read on the primary site, not on a mirror. No asset from any other site is used
here.

Credit line, if we ever want to show one:
`Created using <asset name> from ambientCG.com, licensed under the Creative Commons CC0 1.0 Universal License.`

| Period | Visible hours | ambientCG asset | Original files downloaded |
| --- | --- | --- | --- |
| `morning` | 06:00–10:00 | [`MorningSkyHDRI013B`](https://ambientcg.com/a/MorningSkyHDRI013B) — *Morning Sky HDRI 013 B* | `MorningSkyHDRI013B_1K.zip` (2 596 178 B), `MorningSkyHDRI013B_4K.zip` (16 821 985 B) |
| `day` | 10:00–16:00 | [`DaySkyHDRI071B`](https://ambientcg.com/a/DaySkyHDRI071B) — *Day Sky HDRI 071 B* | `DaySkyHDRI071B_1K.zip` (2 553 896 B), `DaySkyHDRI071B_4K.zip` (16 235 967 B) |
| `sunset` | 16:00–19:00 | [`EveningSkyHDRI046B`](https://ambientcg.com/a/EveningSkyHDRI046B) — *Evening Sky HDRI 046 B* | `EveningSkyHDRI046B_1K.zip` (2 758 978 B), `EveningSkyHDRI046B_4K.zip` (17 311 960 B) |
| `night` | 19:00–06:00 | [`NightSkyHDRI005`](https://ambientcg.com/a/NightSkyHDRI005) — *Night Sky HDRI 005* | `NightSkyHDRI005_1K.zip` (2 644 943 B), `NightSkyHDRI005_4K.zip` (17 767 000 B) |

Zips come from `https://ambientcg.com/get?file=<filename>` and each contains
`<assetId>_<size>_HDR.exr` (linear Radiance EXR) next to a `.blend`, `.usdc`,
`.tres` and a preview PNG/JPG that this project never publishes.

The selection keeps every period a pure sky: no buildings, terrain or street
furniture in frame, and no dense star field or Milky Way at night.
`NightSkyHDRI005` is a hazy night sky with a distant light-pollution glow, so
the night scene stays readable without a wall of stars.

## What is published

| Period | Reflections (lighting) | Visible sky 2K | Visible sky 4K |
| --- | --- | --- | --- |
| `morning` | `morning-sky-reflection-1k.hdr` (897 751 B) | `morning-sky-2k.webp` (21 566 B) | `morning-sky-4k.webp` (61 020 B) |
| `day` | `day-sky-reflection-1k.hdr` (914 743 B) | `day-sky-2k.webp` (21 494 B) | `day-sky-4k.webp` (61 044 B) |
| `sunset` | `sunset-sky-reflection-1k.hdr` (889 731 B) | `sunset-sky-2k.webp` (44 884 B) | `sunset-sky-4k.webp` (119 496 B) |
| `night` | `night-sky-reflection-1k.hdr` (1 257 729 B) | `night-sky-2k.webp` (34 848 B) | `night-sky-4k.webp` (188 088 B) |

- Reflections: a 1024×512 RGBE `.hdr` panorama whose values are the source
  EXR's linear radiance, for `scene.environment`.
- Visible sky: WebP equirectangular layers at 2048×1024 and 4096×2048, loaded
  one at a time by the client.

`day-sky-1k.hdr` is **not** produced by this pipeline. It predates it and is
retained as an unused original asset. The disc stage uses the reflection files above. Measured
through three.js' `HDRLoader`, that older file decodes to a mean luminance of
1.486 with highlights saturated at the half-float ceiling (65 504), while its
source EXR has a mean of 0.557 and a peak near 29 700 — it was written by
ImageMagick's Radiance writer, which does not round-trip these EXRs faithfully.
`day-sky-reflection-1k.hdr` is the faithful replacement (mean 0.5574, peak
29 777).

## Transformation

`scripts/prepare-sky-assets.mjs` is the only producer of these files:

```
node scripts/prepare-sky-assets.mjs          # fetch what is missing, keep the rest
node scripts/prepare-sky-assets.mjs --force  # re-download and re-encode everything
```

Downloads and extractions are cached in `$SKY_CACHE`
(default `<tmp>/lugarnenhum-sky-cache`), so the 16–18 MB source zips never
enter the repository. Each zip is checked against the byte size published by
the ambientCG API and written through a `.part` file before being renamed, and
so is every published asset. A second run reuses the cache and the existing
outputs and leaves their timestamps untouched.

Reflection panoramas:

1. ImageMagick decodes the 1K EXR to raw linear float32 RGB
   (`magick … -depth 32 -define quantum:format=floating-point rgb:…`).
2. The script encodes RGBE itself, following the reference `rgbe.c` split
   (mantissa in `[0.5, 1)`, exponent biased by 128) with per-scanline RLE, and
   rewrites the file only after decoding it back and confirming that the mean
   luminance moved by less than 2 %.
3. The written files were compared against the source EXRs through three
   independent readers — three.js `HDRLoader`, ffmpeg's Radiance decoder and a
   separate RGBE reader: mean luminance `0.2770 / 0.5574 / 0.1794 / 0.1111`
   against EXR values `0.2768 / 0.5569 / 0.1794 / 0.1111` for
   morning/day/sunset/night. Re-encoding a decoded panorama reproduces the file
   byte for byte.

Visible sky layers come from the 4K EXR only:

1. The same ImageMagick decode yields linear float32 RGB.
2. Each channel is multiplied by the pinned exposure below, then passed through
   the Narkowicz ACES filmic fit
   `(x(2.51x + 0.03)) / (x(2.43x + 0.59) + 0.14)` and the sRGB
   opto-electronic transfer before quantising to 8 bits.
3. sharp resizes with Lanczos to 4096×2048 and 2048×1024 and encodes WebP at
   quality 88, effort 6.

Exposure is pinned per asset so the result does not drift between runs:

| Asset | Exposure | Why |
| --- | --- | --- |
| `MorningSkyHDRI013B` | 1.2 | keeps the blue zenith deep while the low sun keeps its glow |
| `DaySkyHDRI071B` | 0.8 | 1.0 was a near-white haze; 0.8 restores a blue sky |
| `EveningSkyHDRI046B` | 1.55 | an auto-exposed 2.2 washed the golden band out |
| `NightSkyHDRI005` | 1.25 | stays night-dark; higher values turn the haze into grey fog |

No cropping, stitching or colour grading beyond that exposure and tone curve is
applied, and the panoramas keep their original 2:1 longitude coverage.

## Sun placement

For every asset the brightest region of the 1K EXR (top 0.03 % of luminance)
sits at `u = 0.499 ± 0.001`, that is azimuth ≈ 0° in three.js' equirectangular
mapping (from +X toward −Z). All four panoramas therefore share one sun
direction, which is why `rotationDeg` is `0` for every period in
`src/lib/sky-environments.ts`: switching periods does not swing the light
around the stage.
