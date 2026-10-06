import Image from "next/image";
import localFont from "next/font/local";
import { assetPath } from "@/lib/assets";

const labelFont = localFont({
  src: "../app/fonts/Inter-MediumItalic.ttf",
  weight: "500",
  style: "italic",
  display: "swap",
});

interface DiscFaceProps {
  title: string;
  duration: string;
}

/** Live labels over the six reflective finishes supplied in Pencil. */
export function DiscFace({ title, duration }: DiscFaceProps) {
  return (
    <span className={`disc__label ${labelFont.className}`} aria-hidden="true">
      <span className="disc__wordmark">
        <Image
          src={assetPath("/assets/pencil/wordmark.webp")}
          alt=""
          width={900}
          height={375}
          loading="eager"
          sizes="(max-width: 767px) 20vw, 170px"
        />
      </span>
      <span className="disc__hub" />
      <span className="disc__title">{title}</span>
      <span className="disc__format">{duration}</span>
    </span>
  );
}
