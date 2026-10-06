import type { Metadata } from "next";
import { ReleaseCarousel } from "@/components/ReleaseCarousel";
import { SiteShell } from "@/components/SiteShell";
import { releases } from "@/data/band";

export const metadata: Metadata = { title: "Ouça nossa música" };

export default function MusicPage() {
  return (
    <SiteShell variant="music">
      <h1 className="sr-only">Ouça nossa música</h1>
      <ReleaseCarousel releases={releases} />
    </SiteShell>
  );
}
