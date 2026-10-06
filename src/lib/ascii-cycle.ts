import type { asciiScene } from "./ascii-scene";

type CycleSettings = Pick<
  typeof asciiScene,
  "cycleMinMs" | "cycleMaxMs" | "cycleFadeMs"
>;

export interface GlyphCycle {
  from: string;
  to: string;
  turn: number;
  changedAt: number;
  nextAt: number;
}

/** Deterministic jitter varies both cells and successive beats, without RNG. */
export function cycleInterval(
  index: number,
  turn: number,
  settings: CycleSettings,
): number {
  const seed =
    (Math.imul(index + 1, 1103515245) ^ Math.imul(turn + 1, 12345)) >>> 0;
  return (
    settings.cycleMinMs +
    (seed % (settings.cycleMaxMs - settings.cycleMinMs + 1))
  );
}

export function createGlyphCycle(initial: string): GlyphCycle {
  return {
    from: initial,
    to: initial,
    turn: 0,
    changedAt: -Infinity,
    nextAt: Infinity,
  };
}

/** Stop future beats outside the core, but let an ongoing crossfade finish. */
export function advanceGlyphCycle(
  state: GlyphCycle,
  family: readonly string[],
  index: number,
  active: boolean,
  time: number,
  settings: CycleSettings,
): GlyphCycle {
  if (!active)
    return Number.isFinite(state.nextAt)
      ? { ...state, nextAt: Infinity }
      : state;
  if (!Number.isFinite(state.nextAt))
    return {
      ...state,
      nextAt: time + cycleInterval(index, state.turn, settings),
    };
  if (time < state.nextAt) return state;
  const turn = state.turn + 1;
  // A late timer advances just once, never bursts through missed beats.
  return {
    from: state.to,
    to: family[(family.indexOf(state.to) + 1) % family.length] ?? state.to,
    turn,
    changedAt: time,
    nextAt: time + cycleInterval(index, turn, settings),
  };
}

export function cycleBlend(
  state: GlyphCycle,
  time: number,
  settings: CycleSettings,
): number {
  const progress = Math.max(
    0,
    Math.min(1, (time - state.changedAt) / settings.cycleFadeMs),
  );
  return progress * progress * (3 - 2 * progress);
}
