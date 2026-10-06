import Image from "next/image";
import Link from "next/link";
import { assetPath } from "@/lib/assets";

interface BrandProps {
  symbol?: boolean;
  centered?: boolean;
  dark?: boolean;
}

export function Brand({
  symbol = false,
  centered = false,
  dark = false,
}: BrandProps) {
  return (
    <div className={`brand ${centered ? "brand--centered" : ""}`}>
      <Link
        href="/"
        className="brand__wordmark"
        aria-label="Lugar Nenhum, página inicial"
      >
        <Image
          src={assetPath(`/assets/pencil/wordmark${dark ? "-dark" : ""}.webp`)}
          alt="Lugar Nenhum"
          loading="eager"
          width={900}
          height={375}
          sizes="(max-width: 767px) 42vw, 302px"
        />
      </Link>
      {symbol && (
        <Image
          className="brand__symbol"
          src={assetPath("/assets/pencil/symbol.webp")}
          alt=""
          loading="eager"
          width={600}
          height={507}
          sizes="(max-width: 767px) 24vw, 199px"
        />
      )}
    </div>
  );
}
