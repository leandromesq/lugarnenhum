"use client";

import { useState } from "react";
import Link from "next/link";

interface AnnouncementProps {
  text: string;
}

export function Announcement({ text }: AnnouncementProps) {
  const [paused, setPaused] = useState(false);

  return (
    <header className="announcement" data-paused={paused}>
      <Link className="announcement__link" href="/musica" aria-label={text}>
        <span className="announcement__track" aria-hidden="true">
          {[0, 1].map((group) => (
            <span className="announcement__segment" key={group}>
              <span>{text}</span>
              <span>{text}</span>
            </span>
          ))}
        </span>
      </Link>
      <button
        type="button"
        className="announcement__pause"
        aria-label={paused ? "Retomar anúncio" : "Pausar anúncio"}
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
      >
        <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
      </button>
    </header>
  );
}
