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

function cycleSeed(index: number, turn: number): number {
  const seed =
    Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(turn + 1, 0x85ebca6b);
  const mixed = Math.imul(seed ^ (seed >>> 16), 0x7feb352d);
  return (mixed ^ (mixed >>> 15)) >>> 0;
}

/** Deterministic jitter varies both cells and successive beats, without RNG. */
export function cycleInterval(
  index: number,
  turn: number,
  settings: CycleSettings,
): number {
  const seed = cycleSeed(index, turn);
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
  // Independent symbol choices never repeat the current state.
  const alternatives = family.filter((character) => character !== state.to);
  const replacement =
    alternatives[cycleSeed(index, turn) % alternatives.length] ?? state.to;
  // A late timer advances just once, never bursts through missed beats.
  return {
    from: state.to,
    to: replacement,
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
