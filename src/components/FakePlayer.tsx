"use client";

import { useState } from "react";
import { releaseLinks } from "@/data/site";

export function FakePlayer() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="overflow-hidden rounded-[2rem] border border-bone/15 bg-bone/[0.04] p-5 shadow-2xl shadow-black/40">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <img src="/assets/release-placeholder.svg" alt="capa provisória de besorro FM" className="aspect-square w-full rounded-3xl border border-bone/10 object-cover md:w-48" />
        <div className="flex-1">
          <p className="font-mono text-xs text-acid">primeira transmissão</p>
          <h3 className="mt-2 font-serif text-5xl italic text-bone">besorro FM</h3>
          <p className="mt-3 text-bone/65">primeiro EP disponível em breve nas plataformas digitais.</p>
          <button onClick={() => setPlaying(!playing)} className="mt-6 rounded-full border border-acid/60 bg-acid px-5 py-3 font-mono text-sm text-void transition hover:brightness-110">
            {playing ? "pausar sinal" : "tocar transmissão"}
          </button>
        </div>
      </div>
      <div className={`mt-6 flex h-20 items-end gap-1 rounded-2xl bg-void/60 p-4 ${playing ? "wave-on" : ""}`} aria-hidden>
        {Array.from({ length: 44 }).map((_, i) => <span key={i} className="wavebar" style={{ height: `${18 + ((i * 17) % 54)}%`, animationDelay: `${i * 35}ms` }} />)}
      </div>
      <p className="mt-3 font-mono text-xs text-bone/50">{playing ? "tocando transmissão visual..." : "pausado"}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {releaseLinks.map((link) => <a key={link.label} href={link.href} className="rounded-full border border-bone/15 px-4 py-2 font-mono text-xs text-bone/75 hover:border-acid hover:text-acid">{link.label}</a>)}
      </div>
    </div>
  );
}
