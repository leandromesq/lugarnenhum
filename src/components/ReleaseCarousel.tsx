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
  moving: boolean;
}

export function ReleaseCarousel({ releases }: ReleaseCarouselProps) {
  const count = releases.length;
  const [track, setTrack] = useState<TrackState>({
    cursor: count > 1 ? count : 0,
    moving: false,
  });
  const trackState = useRef(track);
  const pendingSteps = useRef(0);
  const frame = useRef(0);
  const rebasing = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<number | null>(null);
  const didSwipe = useRef(false);
  const activeIndex = wrapIndex(track.cursor, count);
  const release = releases[activeIndex];
  const cycles = count > 1 ? [0, 1, 2] : [0];

  function update(next: TrackState) {
    trackState.current = next;
    setTrack(next);
  }

  function advance() {
    if (
      trackState.current.moving ||
      rebasing.current ||
      !pendingSteps.current ||
      count < 2
    )
      return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const cursor = rebaseCursor(
        trackState.current.cursor + pendingSteps.current,
        count,
      );
      pendingSteps.current = 0;
      update({ cursor, moving: false });
      settle();
      return;
    }
    const step = Math.sign(pendingSteps.current);
    pendingSteps.current -= step;
    update({ cursor: trackState.current.cursor + step, moving: true });
  }

  function move(steps: number) {
    pendingSteps.current += steps;
    // Coalesce full queued laps so rapid inputs do not create a long backlog.
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
    rebasing.current = true;
    update({ cursor, moving: false });
    // The clone and its central counterpart have identical neighbours. Rebase
    // without animation, then let a queued input start on the following paint.
    frame.current = requestAnimationFrame(() => {
      if (focusWasOnDisc) {
        railRef.current
          ?.querySelector<HTMLButtonElement>(`[data-slot="${cursor}"]`)
          ?.focus({ preventScroll: true });
      }
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        rebasing.current = false;
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
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(distance) > 45) {
      didSwipe.current = true;
      move(distance < 0 ? 1 : -1);
    }
  }

  useEffect(() => {
    return () => cancelAnimationFrame(frame.current);
  }, []);

  // Native non-passive listener: consume horizontal scrolling only, leaving
  // ordinary vertical page scrolling intact. A gesture advances one step.
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
      accumulated += event.deltaX;
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
          pointerStart.current = event.clientX;
          didSwipe.current = false;
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
                    data-visible={Math.abs(slot - track.cursor) <= 1}
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
        <p className="carousel-hint">ESCOLHA UM CD. EXPLORE O SINAL.</p>
      </div>
    </section>
  );
}
