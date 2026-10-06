/** Calibration in the original photograph's pixels, not viewport units. */
export const asciiScene = {
  imageWidth: 1920,
  imageHeight: 1280,
  originX: -42,
  // The 1080px Pencil frame cropped 100px from the original photo's top.
  originY: 26,
  fontSize: 24,
  columnAdvance: 14.52,
  rowAdvance: 25.92,
  radius: 55,
  enterMs: 100,
  leaveMs: 220,
  cycleMinMs: 400,
  cycleMaxMs: 700,
  cycleFadeMs: 150,
  cycleCoreRatio: 0.6,
  /** Outer band of the interaction radius that eases the lens into the rest. */
  softEdge: 11,
  characters: ".+-#:*=%@",
} as const;

/**
 * Density-similar replacement targets. A cell only ever swaps within its own
 * family, so a dot becomes a colon or middle dot rather than an `@`.
 */
export const hoverTargets: Readonly<Record<string, readonly string[]>> = {
  ".": [":", "·"],
  ":": [".", "·"],
  "·": [".", ":"],
  "-": [":", "·"],
  "+": ["*", "="],
  "*": ["+", "="],
  "=": ["+", "*"],
  "#": ["%", "@"],
  "%": ["#", "@"],
  "@": ["#", "%"],
};

export interface Point {
  x: number;
  y: number;
}

export interface SceneTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface AsciiGlyph extends Point {
  character: string;
  index: number;
}

export function coverTransform(
  width: number,
  height: number,
  imageWidth = asciiScene.imageWidth,
  imageHeight = asciiScene.imageHeight,
): SceneTransform {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  return {
    scale,
    offsetX: (width - imageWidth * scale) / 2,
    offsetY: (height - imageHeight * scale) / 2,
  };
}

export function projectPoint(point: Point, transform: SceneTransform): Point {
  return {
    x: point.x * transform.scale + transform.offsetX,
    y: point.y * transform.scale + transform.offsetY,
  };
}

export function buildGlyphs(text: string): AsciiGlyph[] {
  const glyphs: AsciiGlyph[] = [];
  text.split("\n").forEach((line, row) => {
    Array.from(line).forEach((character, column) => {
      if (character.trim()) {
        glyphs.push({
          character,
          index: glyphs.length,
          x: asciiScene.originX + column * asciiScene.columnAdvance,
          y: asciiScene.originY + row * asciiScene.rowAdvance,
        });
      }
    });
  });
  return glyphs;
}

/** A density-similar state; the default is the cell's initial replacement. */
export function hoverCharacter(
  character: string,
  index: number,
  turn = 0,
): string {
  const alternatives = hoverTargets[character];
  if (!alternatives || alternatives.length === 0) return character;
  return alternatives[(index * 7 + turn) % alternatives.length];
}

export function stepHover(
  progress: number,
  active: boolean,
  deltaMs: number,
): number {
  return stepHoverAmount(progress, active ? 1 : 0, deltaMs);
}

/** Animate a radial amount, including its return after the pointer leaves. */
export function stepHoverAmount(
  progress: number,
  target: number,
  deltaMs: number,
): number {
  const bounded = Math.max(0, Math.min(1, target));
  const duration = bounded > progress ? asciiScene.enterMs : asciiScene.leaveMs;
  const step = Math.max(0, deltaMs) / duration;
  return bounded > progress
    ? Math.min(bounded, progress + step)
    : Math.max(bounded, progress - step);
}

/**
 * Rim softness for the outer `softEdge` pixels: 1 across the lens core, easing
 * to 0 at the radius so substitution and deformation never pop.
 */
export function rimSoftness(distance: number, radius: number): number {
  const edge = Math.min(asciiScene.softEdge, Math.max(0, radius));
  const inner = radius - edge;
  if (distance <= inner) return 1;
  if (distance >= radius) return 0;
  const t = (distance - inner) / edge;
  return 1 - t * t * (3 - 2 * t);
}

/** A compact, smooth lens: cells return exactly to their anchors outside it. */
export function distortPoint(
  point: Point,
  pointer: Point,
  radius: number,
  intensity: number,
): Point & { weight: number; zoom: number; softness: number } {
  const dx = point.x - pointer.x;
  const dy = point.y - pointer.y;
  const distance = Math.hypot(dx, dy);
  const falloff = Math.max(0, 1 - distance / radius);
  const softness = rimSoftness(distance, radius);
  const weight =
    falloff * falloff * softness * Math.max(0, Math.min(1, intensity));
  return {
    x: point.x + dx * weight * 0.3,
    y: point.y + dy * weight * 0.3,
    weight,
    softness,
    zoom: 1 + weight * 0.18,
  };
}
