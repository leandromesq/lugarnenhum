/**
 * Single-audio-element preview player with short volume ramps.
 *
 * The player owns playback intent and the audible source. React only mirrors
 * the intent (button state) and the audible source (disc spin, announcement).
 * Every async step carries a generation token so a newer play, pause, or
 * selection cancels stale fades, timers and pending play promises.
 */

export const DEFAULT_VOLUME = 0.25;
export const FADE_IN_MS = 350;
export const FADE_OUT_MS = 200;
export const SWAP_FADE_OUT_MS = 250;
export const SWAP_SILENCE_MS = 650;

export interface PreviewSource {
  id: string;
  src: string;
}

interface PreviewAudioCallbacks {
  /** Source that is audibly playing right now, or null during a gap. */
  onAudibleChange?: (id: string | null) => void;
  /** The intended source could not be played. */
  onError?: (id: string) => void;
}

function clampVolume(value: number) {
  return Math.min(1, Math.max(0, value));
}

export class PreviewAudio {
  private readonly audio: HTMLAudioElement;
  private readonly callbacks: PreviewAudioCallbacks;
  private volume = DEFAULT_VOLUME;
  private intent = false;
  private sourceId: string | null = null;
  private sourceSrc: string | null = null;
  private audible: string | null = null;
  private targetId: string | null = null;
  private generation = 0;
  private fadeFrame = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private readonly nativeVolume: boolean;
  private level = DEFAULT_VOLUME;
  private context?: AudioContext;
  private gain?: GainNode;
  private source?: MediaElementAudioSourceNode;

  constructor(audio: HTMLAudioElement, callbacks: PreviewAudioCallbacks = {}) {
    this.audio = audio;
    this.callbacks = callbacks;
    audio.volume = DEFAULT_VOLUME;
    this.nativeVolume = Math.abs(audio.volume - DEFAULT_VOLUME) < 0.001;
    this.audio.addEventListener("error", this.handleError);
  }

  setVolume(value: number) {
    this.volume = clampVolume(value);
    // A running ramp reads the latest volume, so only apply directly outside
    // transitions (and never override a fade out after a pause).
    if (!this.fadeFrame) this.setLevel(this.volume);
  }

  play(source: PreviewSource) {
    if (this.disposed) return;
    this.intent = true;
    this.targetId = source.id;
    this.resetSchedule();
    const generation = this.generation;
    this.setSource(source);
    this.setLevel(0);
    this.startPlayback(source.id, generation);
  }

  /** Keep the requested playback running, but move it to `source`. */
  select(source: PreviewSource) {
    if (this.disposed || !this.intent) return;
    this.targetId = source.id;
    this.resetSchedule();
    const generation = this.generation;
    this.setAudible(null);

    const beginGap = () => {
      if (generation !== this.generation) return;
      this.audio.pause();
      this.setLevel(0);
      this.timer = setTimeout(() => {
        this.timer = undefined;
        if (generation !== this.generation || !this.intent) return;
        this.setSource(source);
        this.setLevel(0);
        this.startPlayback(source.id, generation);
      }, SWAP_SILENCE_MS);
    };

    if (this.audio.paused) beginGap();
    else this.startFade(() => 0, SWAP_FADE_OUT_MS, beginGap);
  }

  pause() {
    if (this.disposed) return;
    this.intent = false;
    this.targetId = null;
    this.resetSchedule();
    const generation = this.generation;
    this.setAudible(null);
    if (this.audio.paused) {
      this.stopAudio();
      return;
    }
    this.startFade(
      () => 0,
      FADE_OUT_MS,
      () => {
        if (generation !== this.generation) return;
        this.stopAudio();
      },
    );
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.intent = false;
    this.targetId = null;
    this.resetSchedule();
    this.audio.removeEventListener("error", this.handleError);
    this.stopAudio();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.audible = null;
    this.source?.disconnect();
    this.gain?.disconnect();
    void this.context?.close();
  }

  private startPlayback(id: string, generation: number) {
    let request: Promise<unknown>;
    try {
      // Some mobile browsers ignore media.volume. Create their gain stage
      // only in response to the first user play gesture.
      if (!this.nativeVolume && !this.context) {
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.gain.value = this.level;
        this.source = this.context.createMediaElementSource(this.audio);
        this.source.connect(this.gain);
        this.gain.connect(this.context.destination);
      }
      const resumed = this.context?.resume();
      request = Promise.all([resumed, this.audio.play()]);
    } catch {
      this.fail(id);
      return;
    }
    void request.then(
      () => {
        if (generation !== this.generation || this.targetId !== id) return;
        this.setAudible(id);
        this.startFade(() => this.volume, FADE_IN_MS);
      },
      () => {
        if (generation !== this.generation) return;
        this.fail(id);
      },
    );
  }

  private fail(id: string) {
    if (!this.intent || this.targetId !== id) return;
    this.intent = false;
    this.targetId = null;
    this.resetSchedule();
    this.setAudible(null);
    this.stopAudio();
    // Force the next attempt to load the source again instead of reusing a
    // failed media element.
    this.sourceId = null;
    this.sourceSrc = null;
    this.callbacks.onError?.(id);
  }

  private setSource(source: PreviewSource) {
    if (this.sourceId === source.id && this.sourceSrc === source.src) return;
    this.sourceId = source.id;
    this.sourceSrc = source.src;
    this.audio.src = source.src;
    this.audio.load();
  }

  private setAudible(id: string | null) {
    if (this.audible === id) return;
    this.audible = id;
    this.callbacks.onAudibleChange?.(id);
  }

  private stopAudio() {
    this.audio.pause();
    this.setLevel(0);
  }

  private setLevel(level: number) {
    this.level = level;
    if (this.gain) this.gain.gain.value = level;
    else if (this.nativeVolume) this.audio.volume = level;
  }

  private resetSchedule() {
    this.generation += 1;
    this.stopFade();
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private stopFade() {
    if (!this.fadeFrame) return;
    cancelAnimationFrame(this.fadeFrame);
    this.fadeFrame = 0;
  }

  private startFade(target: () => number, duration: number, done?: () => void) {
    this.stopFade();
    const from = this.level;
    const started = performance.now();
    const generation = this.generation;
    const step = (now: number) => {
      if (generation !== this.generation || this.disposed) return;
      const progress = Math.min(1, (now - started) / duration);
      this.setLevel(clampVolume(from + (target() - from) * progress));
      if (progress < 1) this.fadeFrame = requestAnimationFrame(step);
      else {
        this.fadeFrame = 0;
        done?.();
      }
    };
    this.fadeFrame = requestAnimationFrame(step);
  }

  private readonly handleError = () => {
    const id = this.sourceId;
    if (!id || !this.intent || this.targetId !== id) return;
    if (!this.audio.error) return;
    this.fail(id);
  };
}
