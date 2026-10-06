import Link from "next/link";

interface SiteFooterProps {
  presskit?: boolean;
}

export function SiteFooter({ presskit = false }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <nav aria-label="Links secundários">
        <a
          href="https://www.instagram.com/lugarnenhum.wav/"
          target="_blank"
          rel="noopener noreferrer"
        >
          INSTAGRAM ↗
        </a>
        <Link href="/presskit" aria-current={presskit ? "page" : undefined}>
          PRESSKIT
        </Link>
      </nav>
    </footer>
  );
}
