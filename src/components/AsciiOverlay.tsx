"use client";

import { useEffect, useRef } from "react";
import { homeAscii } from "@/data/home-ascii";
import {
  asciiScene,
  buildGlyphs,
  coverTransform,
  distortPoint,
  projectPoint,
  hoverCharacter,
  hoverTargets,
  stepHoverAmount,
  rimSoftness,
} from "@/lib/ascii-scene";
import type { Point } from "@/lib/ascii-scene";
import {
  advanceGlyphCycle,
  createGlyphCycle,
  cycleBlend,
} from "@/lib/ascii-cycle";

const glyphs = buildGlyphs(homeAscii);
const lines = homeAscii.split("\n");

/** Below this residual the lens snaps exactly, so the RAF loop can stop. */
const INTENSITY_EPSILON = 0.002;

export function AsciiOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const cached = document.createElement("canvas");
    const cachedContext = cached.getContext("2d");
    if (!context || !cachedContext) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 768px)");
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const events = new AbortController();
    let disposed = false;
    let frame = 0;
    let wakeTimer = 0;
    let lastTime = 0;
    let intensity = 0;
    const hoverProgress = new Float32Array(glyphs.length);
    let cycles = glyphs.map((glyph) =>
      createGlyphCycle(hoverCharacter(glyph.character, glyph.index)),
    );
    let inside = false;
    let rect = canvas.getBoundingClientRect();
    let pixelRatio = 1;
    let projected: (Point & { character: string; index: number })[] = [];
    let fontSize = 24;
    let baseline = 22;
    let family = "monospace";
    let color = "#f5f5f5";
    let glow = 3.5;
    let pointer = { x: -1000, y: -1000 };
    let target = { ...pointer };

    function paintBase() {
      if (!context) return;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas!.width, canvas!.height);
      context.drawImage(cached, 0, 0);
    }

    function rebuild() {
      if (disposed || !context || !cachedContext) return;
      rect = canvas!.getBoundingClientRect();
      if (!desktop.matches || rect.width === 0 || rect.height === 0) return;
      // Bound both resolution and memory on high-DPI / ultrawide screens.
      pixelRatio = Math.min(
        devicePixelRatio || 1,
        2,
        4096 / Math.max(rect.width, rect.height),
      );
      canvas!.width = cached.width = Math.round(rect.width * pixelRatio);
      canvas!.height = cached.height = Math.round(rect.height * pixelRatio);
      const transform = coverTransform(rect.width, rect.height);
      const style = getComputedStyle(canvas!);
      family = style.fontFamily;
      color = style.color;
      fontSize = asciiScene.fontSize * transform.scale;
      // One glow value shared by the cached raster and local redraws.
      glow = 3.5 * transform.scale;
      cachedContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      cachedContext.font = `${fontSize}px ${family}`;
      const metrics = cachedContext.measureText("Mg");
      const ascent = metrics.fontBoundingBoxAscent ?? fontSize;
      const descent = metrics.fontBoundingBoxDescent ?? fontSize * 0.2;
      baseline =
        (asciiScene.rowAdvance * transform.scale - ascent - descent) / 2 +
        ascent;
      cachedContext.fillStyle = color;
      cachedContext.textBaseline = "alphabetic";
      cachedContext.shadowColor = color;
      cachedContext.shadowBlur = glow;
      projected = glyphs.map((glyph) => ({
        ...glyph,
        ...projectPoint(glyph, transform),
      }));
      for (const glyph of projected) {
        cachedContext.fillText(glyph.character, glyph.x, glyph.y + baseline);
      }
      hoverProgress.fill(0);
      cycles = glyphs.map((glyph) =>
        createGlyphCycle(hoverCharacter(glyph.character, glyph.index)),
      );
      clearTimeout(wakeTimer);
      wakeTimer = 0;
      paintBase();
      canvas!.dataset.ready = "true";
      if (inside) schedule();
    }

    function schedule() {
      clearTimeout(wakeTimer);
      wakeTimer = 0;
      if (
        !frame &&
        !disposed &&
        !document.hidden &&
        desktop.matches &&
        !reducedMotion.matches &&
        finePointer.matches
      ) {
        frame = requestAnimationFrame(draw);
      }
    }

    function draw(time: number) {
      frame = 0;
      if (disposed || !context) return;
      const radius = asciiScene.radius;
      const delta = Math.min(lastTime ? time - lastTime : 16, 64);
      lastTime = time;
      const smoothing = 1 - Math.exp(-delta / 75);
      const wanted = inside ? 1 : 0;
      intensity += (wanted - intensity) * smoothing;
      pointer.x += (target.x - pointer.x) * smoothing;
      pointer.y += (target.y - pointer.y) * smoothing;

      // Bounded float epsilon: once the radial/fractional residue is inside it,
      // snap exactly so the loop settles instead of redrawing forever.
      const pointerEpsilon = Math.max(0.5, radius * 0.005);
      let settling = false;
      if (
        Math.hypot(target.x - pointer.x, target.y - pointer.y) <= pointerEpsilon
      ) {
        pointer = { x: target.x, y: target.y };
      } else {
        settling = true;
      }
      if (Math.abs(wanted - intensity) <= INTENSITY_EPSILON) {
        intensity = wanted;
      } else {
        settling = true;
      }

      const padding = fontSize * 2;
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      let nextBeat = Infinity;
      for (const glyph of projected) {
        const centerX = glyph.x + fontSize * 0.3;
        const centerY = glyph.y + baseline - fontSize * 0.35;
        // Activation, cycling and deformation share the same smoothed center.
        const distance = Math.hypot(centerX - pointer.x, centerY - pointer.y);
        const wantedAmount = inside ? rimSoftness(distance, radius) : 0;
        const stepped = stepHoverAmount(
          hoverProgress[glyph.index],
          wantedAmount,
          delta,
        );
        const settled = Math.abs(stepped - wantedAmount) <= 0.001;
        const progress = settled ? wantedAmount : stepped;
        hoverProgress[glyph.index] = progress;
        if (!settled) settling = true;
        let cycle = cycles[glyph.index];
        if (
          progress === 0 &&
          (cycle.turn > 0 || Number.isFinite(cycle.nextAt))
        ) {
          cycle = createGlyphCycle(
            hoverCharacter(glyph.character, glyph.index),
          );
        } else {
          cycle = advanceGlyphCycle(
            cycle,
            hoverTargets[glyph.character] ?? [glyph.character],
            glyph.index,
            inside &&
              distance < radius * asciiScene.cycleCoreRatio &&
              progress > 0,
            time,
            asciiScene,
          );
        }
        cycles[glyph.index] = cycle;
        if (progress > 0) {
          if (cycleBlend(cycle, time, asciiScene) < 1) settling = true;
          nextBeat = Math.min(nextBeat, cycle.nextAt);
          left = Math.min(left, glyph.x - padding);
          top = Math.min(top, glyph.y - padding);
          right = Math.max(right, glyph.x + padding);
          bottom = Math.max(bottom, glyph.y + padding);
        }
      }
      // The lens reaches beyond any tracked cell; keep its whole radius clipped.
      if (intensity > 0) {
        const reach = radius + padding;
        left = Math.min(left, pointer.x - reach);
        top = Math.min(top, pointer.y - reach);
        right = Math.max(right, pointer.x + reach);
        bottom = Math.max(bottom, pointer.y + reach);
      }
      paintBase();
      if (Number.isFinite(left)) {
        const width = right - left;
        const height = bottom - top;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.save();
        context.beginPath();
        context.rect(left, top, width, height);
        context.clip();
        context.clearRect(left, top, width, height);
        context.fillStyle = color;
        context.textBaseline = "alphabetic";
        context.shadowColor = color;
        context.shadowBlur = glow;
        for (const glyph of projected) {
          if (
            glyph.x < left - padding ||
            glyph.x > right + padding ||
            glyph.y < top - padding ||
            glyph.y > bottom + padding
          )
            continue;
          const center = {
            x: glyph.x + fontSize * 0.3,
            y: glyph.y + baseline - fontSize * 0.35,
          };
          const lens = distortPoint(center, pointer, radius, intensity);
          const progress = hoverProgress[glyph.index];
          // Animate the radial amount itself; multiplying by the current rim
          // would erase the character instantly when the pointer leaves it.
          const blend = progress * progress * (3 - 2 * progress);
          const x = glyph.x + lens.x - center.x;
          const y = glyph.y + baseline + lens.y - center.y;
          const slide = fontSize * 0.1;
          context.font = `${fontSize * lens.zoom}px ${family}`;
          if (blend < 1) {
            context.globalAlpha = 1 - blend;
            context.fillText(glyph.character, x, y - slide * blend);
          }
          if (blend > 0) {
            const cycle = cycles[glyph.index];
            const pulse = cycleBlend(cycle, time, asciiScene);
            const hoverY = y + slide * (1 - blend);
            if (pulse < 1) {
              context.globalAlpha = blend * (1 - pulse);
              context.fillText(cycle.from, x, hoverY);
            }
            if (pulse > 0) {
              context.globalAlpha = blend * pulse;
              context.fillText(cycle.to, x, hoverY);
            }
          }
          context.globalAlpha = 1;
        }
        context.restore();
      }
      if (settling) schedule();
      else {
        lastTime = 0;
        // Sleep between beats: RAF runs only while the lens or a crossfade moves.
        if (Number.isFinite(nextBeat)) {
          wakeTimer = window.setTimeout(schedule, Math.max(1, nextBeat - time));
        }
      }
    }

    function reset() {
      inside = false;
      intensity = 0;
      hoverProgress.fill(0);
      cycles = glyphs.map((glyph) =>
        createGlyphCycle(hoverCharacter(glyph.character, glyph.index)),
      );
      clearTimeout(wakeTimer);
      wakeTimer = 0;
      lastTime = 0;
      cancelAnimationFrame(frame);
      frame = 0;
      paintBase();
    }

    function move(event: PointerEvent) {
      if (
        event.pointerType === "touch" ||
        reducedMotion.matches ||
        !finePointer.matches ||
        !desktop.matches ||
        document.hidden
      )
        return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const nextInside =
        x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      if (nextInside) {
        target = { x, y };
        if (!inside && intensity < 0.005) pointer = { ...target };
      }
      inside = nextInside;
      schedule();
    }

    const observer = new ResizeObserver(rebuild);
    observer.observe(canvas);
    window.addEventListener("pointermove", move, {
      passive: true,
      signal: events.signal,
    });
    window.addEventListener(
      "pointerout",
      (event) => {
        if (!event.relatedTarget) {
          inside = false;
          schedule();
        }
      },
      { signal: events.signal },
    );
    window.addEventListener("blur", reset, { signal: events.signal });
    window.addEventListener("resize", rebuild, {
      passive: true,
      signal: events.signal,
    });
    window.addEventListener(
      "scroll",
      () => {
        rect = canvas.getBoundingClientRect();
      },
      { passive: true, signal: events.signal },
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) reset();
      },
      { signal: events.signal },
    );
    reducedMotion.addEventListener("change", reset, { signal: events.signal });
    finePointer.addEventListener("change", reset, { signal: events.signal });
    desktop.addEventListener(
      "change",
      () => {
        reset();
        rebuild();
      },
      { signal: events.signal },
    );
    rebuild();
    // Recalibrate the raster once the locally hosted design font is ready.
    void document.fonts.ready.then(() => {
      if (!disposed) rebuild();
    });

    return () => {
      disposed = true;
      events.abort();
      observer.disconnect();
      clearTimeout(wakeTimer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="ascii-layer" aria-hidden="true">
      <canvas className="home-ascii" ref={canvasRef} />
      <svg
        className="ascii-fallback"
        viewBox="0 0 1920 1280"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {lines.map((line, row) => (
          <text
            key={row}
            x={asciiScene.originX}
            y={asciiScene.originY + row * asciiScene.rowAdvance + 22}
            xmlSpace="preserve"
          >
            {line}
          </text>
        ))}
      </svg>
    </div>
  );
}
