/** Minimal external store for the track whose preview is playing. */

type Listener = () => void;

let current: string | null = null;
const listeners = new Set<Listener>();

export function getNowPlaying(): string | null {
  return current;
}

export function setNowPlaying(title: string | null): void {
  if (title === current) return;
  current = title;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
