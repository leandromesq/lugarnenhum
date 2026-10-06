import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";

export default function NotFound() {
  return (
    <SiteShell variant="presskit">
      <section className="presskit-content">
        <h1>SINAL NÃO ENCONTRADO.</h1>
        <p>Esta página não existe.</p>
        <Link className="text-link" href="/">
          VOLTAR AO INÍCIO
        </Link>
      </section>
    </SiteShell>
  );
}
