import { BrowserNavbar } from "@/components/BrowserNavbar";
import { FakePlayer } from "@/components/FakePlayer";
import { Reveal } from "@/components/Motion";
import { merch, socialLinks, transmissions } from "@/data/site";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-void text-bone selection:bg-acid selection:text-void">
      <BrowserNavbar />
      <div className="site-noise" />

      <section id="inicio" className="relative flex min-h-screen items-end px-5 pb-16 pt-32 md:px-10 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(88,199,255,.18),transparent_30%),radial-gradient(circle_at_85%_0%,rgba(255,106,26,.2),transparent_28%),radial-gradient(circle_at_10%_85%,rgba(183,255,42,.16),transparent_26%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:url('/assets/texture-dither.svg')]" />
        <div className="relative z-10 grid w-full items-end gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <Reveal>
            <p className="mb-4 font-mono text-sm text-acid">nova transmissão encontrada</p>
            <h1 className="max-w-4xl font-serif text-[clamp(5rem,15vw,13rem)] italic leading-[.72] tracking-[-.07em] text-bone">Lugar Nenhum</h1>
            <p className="mt-8 max-w-xl text-xl leading-relaxed text-bone/78 md:text-2xl">músicas vindas de lugar nenhum, indo pra lugar algum</p>
            <a href="#musica" className="mt-8 inline-flex rounded-full bg-acid px-6 py-4 font-mono text-sm text-void shadow-[0_0_50px_rgba(183,255,42,.25)] transition hover:scale-[1.02]">ouvir besorro FM</a>
          </Reveal>
          <Reveal delay={0.15} className="grid gap-4 md:grid-cols-2 lg:mb-10">
            <div className="window-card rotate-[-2deg]"><img src="/assets/release-placeholder.svg" alt="janela visual provisória" /></div>
            <div className="window-card translate-y-10 rotate-[3deg]"><div className="h-64 bg-[radial-gradient(circle,rgba(183,255,42,.9),transparent_35%),repeating-linear-gradient(90deg,rgba(242,239,231,.2)_0_1px,transparent_1px_8px)]" /></div>
          </Reveal>
        </div>
      </section>

      <section id="sobre" className="px-5 py-28 md:px-10 lg:px-16">
        <Reveal className="max-w-4xl">
          <p className="font-mono text-sm text-holo">sobre / arquivo parcial</p>
          <h2 className="mt-5 font-serif text-6xl italic leading-none md:text-8xl">quem somos quando o sinal falha?</h2>
          <p className="mt-8 max-w-2xl text-xl leading-9 text-bone/70">Lugar Nenhum é uma banda independente construindo canções como janelas antigas, folhas escaneadas e ruídos guardados em algum canto da internet.</p>
        </Reveal>
      </section>

      <section id="musica" className="px-5 py-24 md:px-10 lg:px-16">
        <Reveal><FakePlayer /></Reveal>
      </section>

      <section id="transmissoes" className="px-5 py-24 md:px-10 lg:px-16">
        <Reveal>
          <h2 className="font-serif text-6xl italic">transmissões recentes</h2>
          <div className="mt-8 divide-y divide-bone/10 rounded-[2rem] border border-bone/15 bg-panel/70 font-mono">
            {transmissions.map((item) => <div key={item.title} className="grid gap-2 p-5 text-sm md:grid-cols-[160px_1fr_120px]"><span className="text-acid">{item.date}</span><span>{item.title}</span><span className="text-bone/45">{item.type}</span></div>)}
          </div>
        </Reveal>
      </section>

      <section id="merch" className="px-5 py-24 md:px-10 lg:px-16">
        <Reveal>
          <h2 className="font-mono text-5xl text-acid">merch.exe</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {merch.map((item) => <article key={item.code} className="rounded-[2rem] border border-bone/15 bg-bone/[.035] p-5"><div className="aspect-[4/3] rounded-3xl bg-[linear-gradient(135deg,rgba(88,199,255,.22),rgba(183,255,42,.12),rgba(255,106,26,.18))]" /><p className="mt-4 font-mono text-xs text-bone/45">{item.code}</p><h3 className="mt-2 text-xl">{item.name}</h3><p className="mt-4 font-mono text-sm text-acid">em breve</p></article>)}
          </div>
        </Reveal>
      </section>

      <section id="links" className="px-5 py-24 md:px-10 lg:px-16">
        <Reveal>
          <h2 className="font-serif text-6xl italic">links importantes</h2>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {socialLinks.map((link) => <a key={link.label} href={link.href} className="flex items-center justify-between rounded-full border border-bone/15 px-5 py-4 font-mono hover:border-acid hover:text-acid"><span>{link.label}</span><span className="text-bone/50">{link.handle}</span></a>)}
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-bone/10 px-5 py-10 font-mono text-sm text-bone/50 md:px-10 lg:px-16">Lugar Nenhum, 2026. presskit em /presskit</footer>
    </main>
  );
}
