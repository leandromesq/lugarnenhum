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
  radius: 45,
  transitionMs: 180,
  characters: ".+-#:*= %@".replace(/ /g, ""),
} as const;

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

/** One stable replacement per cell, always distinct from its original glyph. */
export function hoverCharacter(character: string, index: number): string {
  const alternatives = asciiScene.characters.replaceAll(character, "");
  return alternatives[(index * 7) % alternatives.length];
}

export function stepHover(
  progress: number,
  active: boolean,
  deltaMs: number,
): number {
  const step = Math.max(0, deltaMs) / asciiScene.transitionMs;
  return active ? Math.min(1, progress + step) : Math.max(0, progress - step);
}

/** A compact, smooth lens: cells return exactly to their anchors outside it. */
export function distortPoint(
  point: Point,
  pointer: Point,
  radius: number,
  intensity: number,
): Point & { weight: number; zoom: number } {
  const dx = point.x - pointer.x;
  const dy = point.y - pointer.y;
  const distance = Math.hypot(dx, dy);
  const falloff = Math.max(0, 1 - distance / radius);
  const weight = falloff * falloff * Math.max(0, Math.min(1, intensity));
  return {
    x: point.x + dx * weight * 0.3,
    y: point.y + dy * weight * 0.3,
    weight,
    zoom: 1 + weight * 0.18,
  };
}
