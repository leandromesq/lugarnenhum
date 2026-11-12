"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, KeyboardEvent } from "react";
import { assetPath } from "@/lib/assets";
import { previewPath, type Release } from "@/data/band";
import { DiscStage } from "@/components/DiscStage";
import { setNowPlaying } from "@/lib/now-playing";
import { selectionSteps, wrapIndex } from "@/lib/carousel";
import { DEFAULT_VOLUME, PreviewAudio } from "@/lib/preview-audio";
import "./preview-player.css";

interface ReleaseCarouselProps {
  releases: readonly Release[];
}

export function ReleaseCarousel({ releases }: ReleaseCarouselProps) {
  const count = releases.length;
  const [cursor, setCursor] = useState(0);
  // Playback intent (the button) is separate from what is actually sounding.
  const [playing, setPlaying] = useState(false);
  const [soundingId, setSoundingId] = useState<string | null>(null);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState({ id: "", value: 0 });
  const [volume, setVolume] = useState(DEFAULT_VOLUME * 100);
  const [initialSrc] = useState(() =>
    releases[0] ? assetPath(previewPath(releases[0])) : undefined,
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<PreviewAudio | null>(null);
  const playingRef = useRef(false);
  const volumeRef = useRef(DEFAULT_VOLUME * 100);
  const releasesRef = useRef(releases);
  const activeIndex = wrapIndex(cursor, count);
  const release: Release | undefined = releases[activeIndex];
  const releaseId = release?.id;
  const previewError = failedPreview === releaseId;
  const progressValue = progress.id === releaseId ? progress.value : 0;
  const sounding = playing && soundingId === releaseId;

  useEffect(() => {
    releasesRef.current = releases;
  }, [releases]);

  const activeReleaseRef = useRef(release);
  useEffect(() => {
    activeReleaseRef.current = release;
  }, [release]);

  const applyPlaying = useCallback((next: boolean) => {
    playingRef.current = next;
    setPlaying(next);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const player = new PreviewAudio(audio, {
      onAudibleChange: (id) => {
        setSoundingId(id);
        const item = id
          ? releasesRef.current.find((entry) => entry.id === id)
          : undefined;
        setNowPlaying(item?.title ?? null);
      },
      onError: (id) => {
        applyPlaying(false);
        setSoundingId(null);
        setFailedPreview(id);
      },
    });
    playerRef.current = player;
    player.setVolume(volumeRef.current / 100);
    return () => {
      playerRef.current = null;
      player.dispose();
      setNowPlaying(null);
    };
  }, [applyPlaying]);

  // Follow navigation only while playback is intended. A paused carousel can
  // be browsed freely without the next preview starting on its own.
  useEffect(() => {
    if (!playingRef.current || !releaseId) return;
    const player = playerRef.current;
    const item = releasesRef.current.find((entry) => entry.id === releaseId);
    if (!player || !item) return;
    player.select({ id: item.id, src: assetPath(previewPath(item)) });
  }, [releaseId]);

  const move = useCallback((steps: number) => {
    setCursor((current) => current + steps);
  }, []);

  const togglePreview = useCallback(() => {
    const player = playerRef.current;
    const item = activeReleaseRef.current;
    if (!player || !item) return;
    if (playingRef.current) {
      player.pause();
      applyPlaying(false);
      return;
    }
    setFailedPreview(null);
    applyPlaying(true);
    player.play({ id: item.id, src: assetPath(previewPath(item)) });
  }, [applyPlaying]);

  function select(index: number) {
    setCursor(
      (current) =>
        current + selectionSteps(wrapIndex(current, count), index, count),
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      target.closest(".tracklist, .volume-control")
    )
      return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }
  }

  function handleVolumeChange(event: ChangeEvent<HTMLInputElement>) {
    const next = Number(event.target.value);
    setVolume(next);
    volumeRef.current = next;
    playerRef.current?.setVolume(next / 100);
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !soundingId) return;
    if (!Number.isFinite(audio.duration) || audio.duration === 0) return;
    setProgress({
      id: soundingId,
      value: Math.min(1, audio.currentTime / audio.duration),
    });
  }

  if (!release) return <p className="music-empty">Novas músicas em breve.</p>;

  return (
    <section
      className="release-carousel"
      aria-label="Lançamentos da banda"
      aria-roledescription="carrossel"
      onKeyDown={handleKeyDown}
    >
      <DiscStage
        releases={releases}
        cursor={cursor}
        playing={sounding}
        onStep={move}
        onToggle={togglePreview}
      />
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
        <div className="preview-controls">
          <button
            type="button"
            className="preview-button"
            aria-pressed={playing}
            onClick={togglePreview}
          >
            {playing ? "❚❚ PAUSAR" : "▶ OUVIR PRÉVIA"}
          </button>
          <div className="volume-control">
            <label htmlFor="preview-volume">Volume</label>
            <input
              id="preview-volume"
              type="range"
              aria-label="Volume"
              min={0}
              max={100}
              step={1}
              value={volume}
              onChange={handleVolumeChange}
              style={{ "--volume-fill": `${volume}%` } as CSSProperties}
            />
            <output htmlFor="preview-volume" aria-hidden="true">
              {volume}%
            </output>
          </div>
        </div>
        <p className="preview-note">
          {previewError
            ? "Prévia indisponível."
            : "PRÉVIA DE 15S · GUIA NÃO FINALIZADA"}
        </p>
        <span className="preview-progress" role="presentation">
          <span style={{ width: `${progressValue * 100}%` }} />
        </span>
        {/* The player owns src after mount; this prop keeps the initial URL
            stable so React never overwrites an imperative delayed swap. */}
        <audio
          ref={audioRef}
          preload="none"
          src={initialSrc}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            if (!releaseId || soundingId !== releaseId) return;
            playerRef.current?.pause();
            applyPlaying(false);
            setProgress({ id: releaseId, value: 0 });
          }}
        />
        <p className="carousel-hint">
          ESCOLHA UM CD. CLIQUE NO DISCO PARA OUVIR.
        </p>
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
