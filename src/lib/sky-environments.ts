/**
 * Sky environment selection for the disc stage.
 *
 * Assets are published by `scripts/prepare-sky-assets.mjs` from ambientCG
 * CC0 HDRIs; see `public/assets/sky/SOURCES.md` for the exact sources and the
 * tone-mapping applied to the visible-sky layers.
 *
 * The visitor's local hour is read on the client only: rendering this module
 * never touches the system clock, so the exported map stays stable during SSR.
 */

/** Coherent outdoor periods, in the order the sun crosses them. */
export type SkyPeriod = "morning" | "day" | "sunset" | "night";

export interface SkyEnvironment {
  readonly period: SkyPeriod;
  readonly label: string;
  /**
   * Equirectangular (2:1) visible-sky layers, already tone-mapped. Load one of
   * them per visit — `webp4k` for large/retina viewports, `webp2k` otherwise.
   */
  readonly background: {
    readonly webp2k: string;
    readonly webp4k: string;
  };
  /** 1K Radiance panorama for `scene.environment` reflections. */
  readonly reflection: string;
  /** Suggested `scene.environmentIntensity`, normalised to the day sky. */
  readonly exposure: number;
  /**
   * Y rotation in degrees that aligns this panorama's sun azimuth with the day
   * sky. Every asset already places its sun at the same azimuth (measured, see
   * SOURCES.md), so the value is zero for all periods and switching periods
   * does not swing the light around.
   */
  readonly rotationDeg: number;
}

/**
 * Half-open local-hour intervals: `[start, end)`. Night wraps midnight, so
 * `getSkyPeriod` normalises the hour before it compares.
 */
export const skyPeriodHours: Readonly<
  Record<SkyPeriod, { readonly start: number; readonly end: number }>
> = {
  night: { start: 19, end: 6 },
  morning: { start: 6, end: 10 },
  day: { start: 10, end: 16 },
  sunset: { start: 16, end: 19 },
};

/** Periods from the earliest interval to the latest, for UI ordering. */
export const skyPeriods: readonly SkyPeriod[] = [
  "morning",
  "day",
  "sunset",
  "night",
];

/**
 * Paths are public-relative, exactly like the disc stage's existing HDR path.
 * Wrap them with `assetPath()` when handing them to the renderer, because
 * Next.js does not prepend `basePath` to files under `public/`.
 */
export const skyEnvironments: Readonly<Record<SkyPeriod, SkyEnvironment>> = {
  morning: {
    period: "morning",
    label: "Manhã",
    background: {
      webp2k: "/assets/sky/morning-sky-2k.webp",
      webp4k: "/assets/sky/morning-sky-4k.webp",
    },
    reflection: "/assets/sky/morning-sky-reflection-1k.hdr",
    exposure: 0.85,
    rotationDeg: 0,
  },
  day: {
    period: "day",
    label: "Dia",
    background: {
      webp2k: "/assets/sky/day-sky-2k.webp",
      webp4k: "/assets/sky/day-sky-4k.webp",
    },
    reflection: "/assets/sky/day-sky-reflection-1k.hdr",
    exposure: 1,
    rotationDeg: 0,
  },
  sunset: {
    period: "sunset",
    label: "Fim de tarde",
    background: {
      webp2k: "/assets/sky/sunset-sky-2k.webp",
      webp4k: "/assets/sky/sunset-sky-4k.webp",
    },
    reflection: "/assets/sky/sunset-sky-reflection-1k.hdr",
    exposure: 0.9,
    rotationDeg: 0,
  },
  night: {
    period: "night",
    label: "Noite",
    background: {
      webp2k: "/assets/sky/night-sky-2k.webp",
      webp4k: "/assets/sky/night-sky-4k.webp",
    },
    reflection: "/assets/sky/night-sky-reflection-1k.hdr",
    exposure: 0.35,
    rotationDeg: 0,
  },
};

/**
 * Map a visitor's local hour (0–23, fractions allowed) to a sky period.
 *
 * Hours outside 0–23 wrap around midnight, so a caller may pass `24 + hour`
 * from a live clock without guarding it. Values that are not finite numbers
 * are rejected instead of silently falling back to a day sky.
 */
export function getSkyPeriod(localHour: number): SkyPeriod {
  if (!Number.isFinite(localHour))
    throw new TypeError(`localHour must be a finite number, got ${localHour}`);
  const hour = ((localHour % 24) + 24) % 24;
  if (hour >= skyPeriodHours.night.start || hour < skyPeriodHours.night.end)
    return "night";
  if (hour < skyPeriodHours.morning.end) return "morning";
  if (hour < skyPeriodHours.day.end) return "day";
  return "sunset";
}
