import { BrowserNavbar } from "@/components/BrowserNavbar";
import { Reveal } from "@/components/Motion";
import { presskitDownloads, presskitSections } from "@/data/presskit";

export default function PresskitPage() {
  return (
    <main className="min-h-screen bg-bone text-void">
      <BrowserNavbar />
      <section className="px-5 pb-16 pt-32 md:px-10 lg:px-16">
        <Reveal className="mx-auto max-w-5xl">
          <p className="font-mono text-sm text-void/55">arquivo oficial provisório</p>
          <h1 className="mt-4 font-serif text-7xl italic leading-none md:text-9xl">presskit</h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-void/70">Informações, imagens e arquivos para imprensa, shows e divulgações. Todo conteúdo abaixo é provisório.</p>
        </Reveal>
      </section>

      <section className="px-5 pb-24 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          {presskitSections.map((section, index) => (
            <Reveal key={section.title} delay={index * 0.05} className="rounded-[2rem] border border-void/10 bg-void/[.04] p-6">
              <h2 className="font-mono text-sm text-void/50">{section.title}</h2>
              <p className="mt-4 text-lg leading-8 text-void/75">{section.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-5 pb-28 md:px-10 lg:px-16">
        <Reveal className="mx-auto max-w-5xl rounded-[2rem] bg-void p-6 text-bone">
          <h2 className="font-serif text-5xl italic">downloads</h2>
          <div className="mt-6 grid gap-3">
            {presskitDownloads.map((item) => <a key={item.label} href={item.href} className="flex items-center justify-between rounded-full border border-bone/15 px-5 py-4 font-mono hover:border-acid hover:text-acid"><span>{item.label}</span><span className="text-bone/45">{item.meta}</span></a>)}
          </div>
        </Reveal>
      </section>
    </main>
  );
}
