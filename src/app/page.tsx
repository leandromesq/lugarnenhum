import { BandPhoto } from "@/components/BandPhoto";
import { SiteShell } from "@/components/SiteShell";
import { AsciiOverlay } from "@/components/AsciiOverlay";
import { MobiusModel } from "@/components/MobiusModel";

export default function HomePage() {
  return (
    <SiteShell variant="home">
      <h1 className="sr-only">Lugar Nenhum</h1>
      <div className="home-scene">
        <BandPhoto scene="home" />
        <AsciiOverlay />
      </div>
      <div className="home-fade" aria-hidden="true" />
      <MobiusModel />
    </SiteShell>
  );
}
