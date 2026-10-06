export interface Spin {
  x: number;
  y: number;
}

export const fidgetPhysics = {
  friction: 0.9,
  maxSpeed: 12,
  restSpeed: 0.035,
  idleAfterMs: 3000,
  returnSeconds: 0.9,
  idleSpeed: 0.18,
} as const;

/** Screen-aligned angles: right = positive Y; up = negative X. */
export function dragRotation(dx: number, dy: number, size: number): Spin {
  const sensitivity = Math.PI / Math.max(1, size);
  return { x: dy * sensitivity, y: dx * sensitivity };
}

export function dragVelocity(
  previous: Spin,
  rotation: Spin,
  milliseconds: number,
): Spin {
  const seconds = Math.max(0.008, milliseconds / 1000);
  const measured = { x: rotation.x / seconds, y: rotation.y / seconds };
  const speed = Math.hypot(measured.x, measured.y);
  const limit = Math.min(1, fidgetPhysics.maxSpeed / Math.max(speed, 0.000001));
  const blend = 1 - Math.exp(-seconds / 0.025);
  const previousX = previous.x * measured.x < 0 ? 0 : previous.x;
  const previousY = previous.y * measured.y < 0 ? 0 : previous.y;
  return {
    x: previousX + (measured.x * limit - previousX) * blend,
    y: previousY + (measured.y * limit - previousY) * blend,
  };
}

/** Exact exponential integration keeps momentum independent of frame rate. */
export function coast(
  velocity: Spin,
  seconds: number,
): { rotation: Spin; velocity: Spin } {
  if (Math.hypot(velocity.x, velocity.y) < fidgetPhysics.restSpeed)
    return { rotation: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
  const decay = Math.exp(-fidgetPhysics.friction * Math.max(0, seconds));
  const distance = (1 - decay) / fidgetPhysics.friction;
  return {
    rotation: { x: velocity.x * distance, y: velocity.y * distance },
    velocity: { x: velocity.x * decay, y: velocity.y * decay },
  };
}
