"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getNowPlaying, subscribe } from "@/lib/now-playing";

interface AnnouncementProps {
  text: string;
}

export function Announcement({ text }: AnnouncementProps) {
  const title = useSyncExternalStore(subscribe, getNowPlaying, () => null);
  const label = title
    ? `TOCANDO AGORA - LUGAR NENHUM - ${title.toUpperCase()}.WAV`
    : text;
  return (
    <header className="announcement">
      <Link className="announcement__link" href="/musica" aria-label={label}>
        <span className="announcement__track" aria-hidden="true">
          {[0, 1].map((group) => (
            <span className="announcement__segment" key={group}>
              <span>{label}</span>
              <span>{label}</span>
            </span>
          ))}
        </span>
      </Link>
    </header>
  );
}
