import type { ReactNode } from "react";
import { band } from "@/data/band";
import { Brand } from "@/components/Brand";
import { SiteNavigation } from "@/components/SiteNavigation";
import { Announcement } from "@/components/Announcement";
import { SiteFooter } from "@/components/SiteFooter";
import { MobiusModel } from "@/components/MobiusModel";

interface SiteShellProps {
  children: ReactNode;
  variant: "home" | "music" | "shop" | "about" | "presskit";
}

export function SiteShell({ children, variant }: SiteShellProps) {
  return (
    <div className={`site-shell site-shell--${variant}`}>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Announcement text={band.announcement} />
      {variant !== "about" && (
        <Brand symbol={variant === "home"} dark={variant === "shop"} />
      )}
      <main id="conteudo" tabIndex={-1}>
        {children}
      </main>
      {variant === "home" ? (
        <div className="home-navigation">
          <MobiusModel />
          <SiteNavigation />
        </div>
      ) : (
        <SiteNavigation />
      )}
      <SiteFooter presskit={variant === "presskit"} />
    </div>
  );
}
