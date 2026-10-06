import type { Metadata } from "next";
import Image from "next/image";
import { SiteShell } from "@/components/SiteShell";
import { assetPath } from "@/lib/assets";

export const metadata: Metadata = { title: "Presskit" };

export default function PresskitPage() {
  return (
    <SiteShell variant="presskit">
      <section className="presskit-content">
        <h1>PRESSKIT</h1>
        <p>Material de divulgação do Lugar Nenhum.</p>
        <Image
          src={assetPath("/assets/pencil/about-desktop.webp")}
          alt="Os quatro integrantes do Lugar Nenhum em uma colina."
          loading="eager"
          width={2200}
          height={1627}
          sizes="(max-width: 767px) 90vw, 700px"
        />
        <div className="presskit-downloads">
          <a href={assetPath("/assets/pencil/about-desktop.webp")} download>
            BAIXAR FOTO ↓
          </a>
          <a href={assetPath("/assets/pencil/wordmark.webp")} download>
            BAIXAR LOGO ↓
          </a>
        </div>
        <p>Biografia e demais materiais em breve.</p>
      </section>
    </SiteShell>
  );
}
