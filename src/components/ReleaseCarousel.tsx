"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  TransitionEvent,
} from "react";
import type { Release } from "@/data/band";
import { rebaseCursor, selectionSteps, wrapIndex } from "@/lib/carousel";

interface ReleaseCarouselProps {
  releases: readonly Release[];
}
interface TrackState {
  cursor: number;
  start: number;
  moving: boolean;
  rebasing: boolean;
}

export function ReleaseCarousel({ releases }: ReleaseCarouselProps) {
  const count = releases.length;
  const initial = count > 1 ? count : 0;
  const [track, setTrack] = useState<TrackState>({
    cursor: initial,
    start: initial,
    moving: false,
    rebasing: false,
  });
  const trackState = useRef(track);
  const pendingSteps = useRef(0);
  const frame = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(
    null,
  );
  const didSwipe = useRef(false);
  const activeIndex = wrapIndex(track.cursor, count);
  const release = releases[activeIndex];
  const cycles = count > 1 ? [0, 1, 2] : [0];

  function update(next: TrackState) {
    trackState.current = next;
    setTrack(next);
  }

  function advance() {
    const current = trackState.current;
    if (current.rebasing || !pendingSteps.current || count < 2) return;
    // Finish a clone-boundary crossing before rebasing. Within the middle copy,
    // retarget the ongoing CSS transition immediately instead of queuing steps.
    if (
      current.moving &&
      (current.cursor < count || current.cursor >= count * 2)
    )
      return;
    const steps = pendingSteps.current;
    pendingSteps.current = 0;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const cursor = rebaseCursor(current.cursor + steps, count);
      update({ cursor, start: cursor, moving: false, rebasing: false });
      settle();
      return;
    }
    update({
      cursor: current.cursor + steps,
      start: current.moving ? current.start : current.cursor,
      moving: true,
      rebasing: false,
    });
  }

  function move(steps: number) {
    pendingSteps.current += steps;
    if (count > 1) pendingSteps.current %= count;
    advance();
  }

  function select(index: number) {
    const destination = wrapIndex(
      trackState.current.cursor + pendingSteps.current,
      count,
    );
    move(selectionSteps(destination, index, count));
  }

  function settle() {
    const cursor = rebaseCursor(trackState.current.cursor, count);
    const focusWasOnDisc = railRef.current?.contains(document.activeElement);
    cancelAnimationFrame(frame.current);
    update({ cursor, start: cursor, moving: false, rebasing: true });
    // Offscreen copies have identical neighbours. Paint the unanimated rebase
    // before enabling hover transitions or applying the latest queued intent.
    frame.current = requestAnimationFrame(() => {
      if (focusWasOnDisc)
        railRef.current
          ?.querySelector<HTMLButtonElement>(`.disc[data-slot="${cursor}"]`)
          ?.focus({ preventScroll: true });
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        update({ ...trackState.current, rebasing: false });
        advance();
      });
    });
  }

  function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (
      event.target === event.currentTarget &&
      event.propertyName === "transform" &&
      trackState.current.moving
    )
      settle();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.target as HTMLElement).closest(".tracklist")
    )
      return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) return;
    pointerStart.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      didSwipe.current = true;
      move(dx < 0 ? 1 : -1);
    }
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let accumulated = 0;
    function wheel(event: WheelEvent) {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (trackState.current.moving) {
        accumulated = 0;
        return;
      }
      accumulated += event.deltaX * (event.deltaMode === 1 ? 16 : 1);
      if (Math.abs(accumulated) >= 50) {
        move(Math.sign(accumulated));
        accumulated = 0;
      }
    }
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    function motionChanged() {
      if (motion.matches && trackState.current.moving) settle();
    }
    stage.addEventListener("wheel", wheel, { passive: false });
    motion.addEventListener("change", motionChanged);
    return () => {
      stage.removeEventListener("wheel", wheel);
      motion.removeEventListener("change", motionChanged);
    };
  });

  if (!release) return <p className="music-empty">Novas músicas em breve.</p>;
  const visibleStart = Math.min(track.start, track.cursor) - 1;
  const visibleEnd = Math.max(track.start, track.cursor) + 1;

  return (
    <section
      className="release-carousel"
      aria-label="Lançamentos da banda"
      aria-roledescription="carrossel"
      onKeyDown={handleKeyDown}
    >
      <div
        className="disc-stage"
        ref={stageRef}
        onPointerDown={(event) => {
          if (event.isPrimary && event.button === 0) {
            pointerStart.current = {
              x: event.clientX,
              y: event.clientY,
              id: event.pointerId,
            };
            didSwipe.current = false;
          }
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
        onClickCapture={(event) => {
          if (didSwipe.current) {
            event.preventDefault();
            event.stopPropagation();
            didSwipe.current = false;
          }
        }}
      >
        <div
          className="disc-track"
          ref={railRef}
          data-moving={track.moving}
          data-rebasing={track.rebasing}
          style={{ "--cursor": track.cursor } as CSSProperties}
          onTransitionEnd={handleTransitionEnd}
        >
          {cycles.flatMap((cycle) =>
            releases.map((item, index) => {
              const slot = cycle * count + index;
              const active = slot === track.cursor;
              const exposed =
                Math.abs(slot - track.cursor) <= 1 &&
                (count > 2 || slot >= track.cursor);
              return (
                <div
                  className="disc-slot"
                  data-active={active}
                  key={`${cycle}-${item.id}`}
                >
                  <button
                    type="button"
                    className={`disc disc--edition-${index % 3}`}
                    data-slot={slot}
                    data-active={active}
                    data-side={
                      slot < track.cursor
                        ? "left"
                        : slot > track.cursor
                          ? "right"
                          : "center"
                    }
                    data-visible={slot >= visibleStart && slot <= visibleEnd}
                    onClick={() => select(index)}
                    aria-label={`Selecionar ${item.title}`}
                    aria-hidden={!exposed || undefined}
                    aria-pressed={exposed ? active : undefined}
                    tabIndex={exposed ? 0 : -1}
                  >
                    <span className="disc__artist">
                      LUGAR
                      <br />
                      NENHUM
                    </span>
                    <span className="disc__format">{item.duration}</span>
                    <span className="disc__hub" aria-hidden="true" />
                    <span className="disc__title">{item.title}</span>
                  </button>
                </div>
              );
            }),
          )}
        </div>
      </div>
      <div className="release-details">
        <div className="carousel-controls" aria-label="Controles do carrossel">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={count < 2}
            aria-label="Lançamento anterior"
          >
            ←
          </button>
          <span className="carousel-count">
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(count).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={count < 2}
            aria-label="Próximo lançamento"
          >
            →
          </button>
        </div>
        <div
          className="release-details__copy"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="release-details__transition" key={release.id}>
            <h2>{release.title}</h2>
            <p>
              {release.format} · {release.duration} · {release.status}
            </p>
            {release.listenUrl && (
              <a
                className="text-link"
                href={release.listenUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                OUVIR AGORA ↗
              </a>
            )}
          </div>
        </div>
        <p className="carousel-hint">ESCOLHA UM CD. EXPLORE O SINAL.</p>
        <details className="tracklist">
          <summary>VER FAIXAS</summary>
          <ol>
            {releases.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => select(index)}
                  aria-label={`Ir para ${item.title}`}
                  aria-pressed={index === activeIndex}
                >
                  <span className="tracklist__number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.title}</span>
                  <span className="tracklist__duration">{item.duration}</span>
                </button>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </section>
  );
}
