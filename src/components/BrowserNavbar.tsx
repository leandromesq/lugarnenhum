"use client";

import Link from "next/link";
import { navItems } from "@/data/site";
import { useState } from "react";

export function BrowserNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-3 pt-3 md:px-6">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-[1.35rem] border border-bone/20 bg-void/75 px-3 py-2 shadow-[0_0_40px_rgba(183,255,42,.08)] backdrop-blur-xl">
        <Link href="/#inicio" className="flex items-center gap-3">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-signal" />
            <span className="h-3 w-3 rounded-full bg-acid" />
            <span className="h-3 w-3 rounded-full bg-holo" />
          </span>
          <span className="font-serif text-xl italic tracking-tight text-bone">Lugar Nenhum</span>
        </Link>

        <button className="rounded-full border border-bone/20 px-3 py-1 font-mono text-xs text-bone md:hidden" onClick={() => setOpen(!open)}>
          menu
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => item.href.startsWith("#") ? (
            <Link key={item.href} href={`/${item.href}`} className="rounded-full px-3 py-2 font-mono text-xs text-bone/75 transition hover:bg-bone/10 hover:text-acid">
              {item.label}
            </Link>
          ) : (
            <Link key={item.href} href={item.href} className="rounded-full px-3 py-2 font-mono text-xs text-bone/75 transition hover:bg-bone/10 hover:text-acid">
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {open && (
        <div className="mx-3 mt-2 grid rounded-3xl border border-bone/15 bg-panel/95 p-3 backdrop-blur-xl md:hidden">
          {navItems.map((item) => item.href.startsWith("#") ? (
            <Link key={item.href} href={`/${item.href}`} onClick={() => setOpen(false)} className="px-3 py-3 font-mono text-sm text-bone">{item.label}</Link>
          ) : <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="px-3 py-3 font-mono text-sm text-bone">{item.label}</Link>)}
        </div>
      )}
    </header>
  );
}
