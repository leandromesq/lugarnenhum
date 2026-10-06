import { assetPath } from "@/lib/assets";

interface BandPhotoProps {
  scene: "home" | "about";
}

export function BandPhoto({ scene }: BandPhotoProps) {
  return (
    <picture className={`band-photo band-photo--${scene}`}>
      <source
        media="(max-width: 767px)"
        srcSet={assetPath(`/assets/pencil/${scene}-mobile.webp`)}
      />
      {/* Art-directed sources are already optimized WebP files for static hosting. */}
      <img
        src={assetPath(`/assets/pencil/${scene}-desktop.webp`)}
        alt={
          scene === "home"
            ? "Os quatro integrantes do Lugar Nenhum diante de uma fachada, à noite."
            : "Os integrantes do Lugar Nenhum em uma colina gramada, sob o céu azul."
        }
        fetchPriority="high"
      />
    </picture>
  );
}
