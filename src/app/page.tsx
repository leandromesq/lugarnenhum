import { BandPhoto } from "@/components/BandPhoto";
import { SiteShell } from "@/components/SiteShell";
import { AsciiOverlay } from "@/components/AsciiOverlay";
import { MemberWindows } from "@/components/MemberWindows";
import { members } from "@/data/band";

export default function HomePage() {
  return (
    <SiteShell variant="home">
      <h1 className="sr-only">Lugar Nenhum</h1>
      <div className="home-scene">
        <BandPhoto scene="home" />
        <AsciiOverlay />
        <MemberWindows members={members} />
      </div>
      <div className="home-fade" aria-hidden="true" />
    </SiteShell>
  );
}
