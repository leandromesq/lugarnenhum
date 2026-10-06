import type { Metadata } from "next";
import Image from "next/image";
import { SiteShell } from "@/components/SiteShell";
import { assetPath } from "@/lib/assets";

export const metadata: Metadata = { title: "Nossa loja" };

export default function ShopPage() {
  return (
    <SiteShell variant="shop">
      <section className="shop-coming-soon">
        <Image
          className="shop-symbol"
          src={assetPath("/assets/pencil/symbol-dark.webp")}
          alt=""
          loading="eager"
          width={600}
          height={507}
          sizes="(max-width: 767px) 180px, 240px"
        />
        <h1>NOSSA LOJA</h1>
        <p>EM BREVE.</p>
        <p className="shop-note">
          Estamos preparando as próximas peças.
          <br />
          Acompanhe as novidades no Instagram.
        </p>
      </section>
    </SiteShell>
  );
}
