/**
 * Geometry of the disc stack and the motion that walks it.
 *
 * Positions are in disc-diameter units: the selected disc is one unit wide,
 * so `x: -1` means one disc diameter to the left of the stage centre.
 */

export interface SlotPose {
  /** Horizontal offset from the stage centre. */
  x: number;
  /** Depth along the view axis; negative values recede from the camera. */
  z: number;
  /** Uniform scale, 1 for the selected disc. */
  scale: number;
  /** Rotation about the vertical axis in radians; positive faces right. */
  yaw: number;
}

/**
 * Reviewable tunables of the composition: one large disc in front, the others
 * queued behind one another on the same level to its left, with no mirror
 * neighbour. Each queued disc is `falloff` times the size of the one before
 * it and the spacing shrinks by the same ratio: a shallow recession, seen
 * almost head-on.
 */
export const SLOT_FIELD = {
  /** Selection centre to the centre of the first stacked disc. */
  gap: 1.1,
  /** Spacing after a queued disc, as a fraction of that disc's size. */
  step: 0.44,
  /** Scale of the first queued disc. */
  scale: 0.81,
  /** Size of each queued disc relative to the one in front of it. */
  falloff: 0.99,
  /**
   * Turn of the queued discs towards the selection. Parallel tilted faces
   * read as standing one behind another while staying on one level.
   */
  yaw: 0.5,
  /** Depth lost per stack slot. */
  depth: 0.22,
  /** Extra depth for the returning disc to clear the entire stack. */
  returnDepth: 1.2,
} as const;

const SELECTED: SlotPose = Object.freeze({ x: 0, z: 0, scale: 1, yaw: 0 });

function stackPose(rank: number): SlotPose {
  const shrink = SLOT_FIELD.falloff ** (rank - 1);
  // Sum of the sizes of the discs in front: a geometric series.
  const travelled =
    (SLOT_FIELD.scale * (1 - shrink)) / (1 - SLOT_FIELD.falloff);
  return {
    x: -(SLOT_FIELD.gap + travelled * SLOT_FIELD.step),
    z: -rank * SLOT_FIELD.depth,
    scale: SLOT_FIELD.scale * shrink,
    yaw: SLOT_FIELD.yaw,
  };
}

function blend(from: SlotPose, to: SlotPose, progress: number): SlotPose {
  return {
    x: from.x + (to.x - from.x) * progress,
    z: from.z + (to.z - from.z) * progress,
    scale: from.scale + (to.scale - from.scale) * progress,
    yaw: from.yaw + (to.yaw - from.yaw) * progress,
  };
}

/** Smoothstep, so the far slots ease in and out of their anchors. */
function ease(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

/**
 * Rank of a disc: 0 is the selection, 1..count-1 sit in the left stack. The rank
 * follows the fractional cursor, so a glide keeps every disc on its lane.
 */
export function slotRank(index: number, cursor: number, count: number): number {
  if (count < 1) return 0;
  const rank = (index - cursor) % count;
  return rank < 0 ? rank + count : rank;
}

/**
 * Pose of a disc at `rank` in a stack of `count` discs.
 *
 * The next disc enters from the front of the left stack. The outgoing disc
 * recedes first, then moves behind the stack to its final slot.
 */
export function slotPose(rank: number, count: number): SlotPose {
  if (count < 2) return SELECTED;
  const span = Math.floor(count);
  const r = Math.min(Math.max(rank, 0), span);
  if (r === 0) return SELECTED;
  const lastStack = span - 1;
  if (r < 1) return blend(SELECTED, stackPose(1), r);
  if (r <= lastStack) return stackPose(r);
  const edge = stackPose(lastStack);
  const progress = r - lastStack;
  const pose = blend(edge, SELECTED, ease(progress));
  return {
    ...pose,
    z: pose.z - Math.sin(Math.PI * progress) * SLOT_FIELD.returnDepth,
  };
}

/**
 * Rank of the frontmost disc under a point measured in disc diameters from the
 * stage centre, or null when the point misses every disc. Ranks are ordered
 * front to back, so the first hit is the disc in front.
 */
export function slotAtPoint(
  x: number,
  y: number,
  count: number,
): number | null {
  for (let rank = 0; rank < Math.max(0, Math.floor(count)); rank++) {
    const pose = slotPose(rank, count);
    const dx = x - pose.x;
    const radius = pose.scale / 2;
    if (dx * dx + y * y <= radius * radius) return rank;
  }
  return null;
}

/** Frame-rate independent exponential approach. */
export function damp(
  current: number,
  target: number,
  lambda: number,
  dtSeconds: number,
): number {
  return target + (current - target) * Math.exp(-lambda * dtSeconds);
}

export interface TrackMotion {
  /** Fractional selection position. */
  cursor: number;
  /** Cursor units per second, kept across retargets. */
  velocity: number;
}

/** Distance below which a glide is finished (a fraction of a pixel). */
const TRACK_REST = 2e-3;

/**
 * One step of a critically damped glide towards `target`.
 *
 * Critically damped means a glide from rest never overshoots, the analytic
 * step is exact for any frame length, and retargeting mid-glide keeps the
 * velocity continuous instead of restarting from a standstill.
 */
export function glide(
  motion: TrackMotion,
  target: number,
  omega: number,
  dtSeconds: number,
): TrackMotion {
  if (!(dtSeconds > 0) || !(omega > 0)) return motion;
  const offset = motion.cursor - target;
  if (offset === 0 && motion.velocity === 0) return motion;
  const decay = Math.exp(-omega * dtSeconds);
  const slope = motion.velocity + omega * offset;
  const nextOffset = (offset + slope * dtSeconds) * decay;
  if (Math.abs(nextOffset) < TRACK_REST) return { cursor: target, velocity: 0 };
  return {
    cursor: target + nextOffset,
    velocity: (motion.velocity - omega * slope * dtSeconds) * decay,
  };
}
