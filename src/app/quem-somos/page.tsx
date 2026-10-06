import type { Metadata } from "next";
import { BandPhoto } from "@/components/BandPhoto";
import { Brand } from "@/components/Brand";
import { SiteShell } from "@/components/SiteShell";
import { band } from "@/data/band";

export const metadata: Metadata = { title: "Quem somos" };

function Biography({
  paragraphs,
  side,
}: {
  paragraphs: readonly string[];
  side: "left" | "right";
}) {
  return (
    <div className={`biography biography--${side}`}>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

export default function AboutPage() {
  const split = Math.ceil(band.biography.length / 2);
  return (
    <SiteShell variant="about">
      <h1 className="sr-only">Quem somos: Lugar Nenhum</h1>
      <BandPhoto scene="about" />
      <Brand centered />
      <section
        className="about-copy"
        aria-label="Sobre a banda, texto provisório"
      >
        <Biography side="left" paragraphs={band.biography.slice(0, split)} />
        <Biography side="right" paragraphs={band.biography.slice(split)} />
      </section>
    </SiteShell>
  );
}
