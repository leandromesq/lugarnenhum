import type { Metadata } from "next";
import { BandPhoto } from "@/components/BandPhoto";
import { Brand } from "@/components/Brand";
import { SiteShell } from "@/components/SiteShell";
import { band } from "@/data/band";

export const metadata: Metadata = { title: "Quem somos" };

function Biography({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div
      className={`biography ${duplicate ? "biography--right" : "biography--left"}`}
      aria-hidden={duplicate || undefined}
    >
      {band.biography.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

export default function AboutPage() {
  return (
    <SiteShell variant="about">
      <h1 className="sr-only">Quem somos: Lugar Nenhum</h1>
      <BandPhoto scene="about" />
      <Brand centered />
      <section
        className="about-copy"
        aria-label="Sobre a banda, texto provisório"
      >
        <Biography />
        <Biography duplicate />
      </section>
    </SiteShell>
  );
}
