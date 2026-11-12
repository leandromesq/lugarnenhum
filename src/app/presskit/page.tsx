import type { Metadata } from "next";
import Image from "next/image";
import { SiteShell } from "@/components/SiteShell";
import { assetPath } from "@/lib/assets";
import { band, history, members, nextRelease, releases } from "@/data/band";
import "./presskit.css";

export const metadata: Metadata = { title: "Presskit" };

const photos = [
  {
    src: "/assets/pencil/about-desktop.webp",
    download: "/assets/press/lugar-nenhum-foto-colina.jpg",
    alt: "Os quatro integrantes da Lugar Nenhum em uma colina.",
    width: 2200,
    height: 1627,
  },
  {
    src: "/assets/pencil/home-desktop.webp",
    download: "/assets/press/lugar-nenhum-foto-fachada.jpg",
    alt: "Os quatro integrantes da Lugar Nenhum diante de uma fachada.",
    width: 1920,
    height: 1280,
  },
] as const;

const logos = [
  {
    file: "lugar-nenhum-logo-branco.png",
    label: "LOGO BRANCO (PNG) ↓",
    paper: false,
  },
  {
    file: "lugar-nenhum-logo-preto.png",
    label: "LOGO PRETO (PNG) ↓",
    paper: true,
  },
  {
    file: "lugar-nenhum-simbolo-branco.png",
    label: "SÍMBOLO BRANCO (PNG) ↓",
    paper: false,
  },
  {
    file: "lugar-nenhum-simbolo-preto.png",
    label: "SÍMBOLO PRETO (PNG) ↓",
    paper: true,
  },
] as const;

const social = "https://www.instagram.com/";

function trackNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export default function PresskitPage() {
  return (
    <SiteShell variant="presskit">
      <article className="press">
        <h1>PRESSKIT</h1>
        <p>Material de divulgação da Lugar Nenhum.</p>

        <dl className="press-facts">
          <dt>Origem</dt>
          <dd>Presidente Prudente/SP</dd>
          <dt>Formação</dt>
          <dd>
            {members
              .map((member) => `${member.name} (${member.role})`)
              .join(", ")}
          </dd>
          <dt>Próximo lançamento</dt>
          <dd>Rádio Besorro (EP, 2027)</dd>
          <dt>Contato</dt>
          <dd>
            <a
              href={`${social}lugarnenhum.wav/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              @lugarnenhum.wav ↗
            </a>
          </dd>
        </dl>

        <section>
          <h2>RELEASE</h2>
          {band.biography.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>

        <section>
          <h2>TRAJETÓRIA</h2>
          {history.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>

        <section>
          <h2>PRÓXIMO LANÇAMENTO</h2>
          <p>{nextRelease}</p>
          <ol className="press-tracks">
            {releases.map((release, index) => (
              <li key={release.id}>
                <span className="press-track__number">
                  {trackNumber(index)}
                </span>
                <span className="press-track__title">{release.title}</span>
                <span className="press-track__duration">
                  {release.duration}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2>INTEGRANTES</h2>
          {members.map((member) => (
            <article className="press-member" key={member.id}>
              <h3>{member.name}</h3>
              <p className="press-member__meta">
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                {" · "}
                <a
                  href={`${social}${member.instagram}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Instagram de ${member.name} (abre em nova aba)`}
                >
                  @{member.instagram} ↗
                </a>
              </p>
              <p>{member.biography}</p>
            </article>
          ))}
        </section>

        <section>
          <h2>FOTOS</h2>
          {photos.map((photo) => (
            <figure className="press-photo" key={photo.download}>
              <Image
                src={assetPath(photo.src)}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 767px) 90vw, 700px"
                loading="lazy"
              />
              <figcaption>
                <a
                  className="press-download"
                  href={assetPath(photo.download)}
                  download
                >
                  BAIXAR FOTO (JPG) ↓
                </a>
              </figcaption>
            </figure>
          ))}
        </section>

        <section>
          <h2>LOGOS</h2>
          <ul className="press-logos">
            {logos.map((logo) => (
              <li key={logo.file}>
                <a
                  className="press-download"
                  href={assetPath(`/assets/press/${logo.file}`)}
                  download
                >
                  <span
                    className={`press-logo-preview${
                      logo.paper ? " press-logo-preview--paper" : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static PNG previews of the downloadable files */}
                    <img
                      src={assetPath(`/assets/press/${logo.file}`)}
                      alt=""
                      loading="lazy"
                    />
                  </span>
                  {logo.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </SiteShell>
  );
}
