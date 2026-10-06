"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/data/band";

export function SiteNavigation() {
  const pathname = usePathname();
  return (
    <nav className="site-navigation" aria-label="Navegação principal">
      {navigation.map(({ href, label, shortLabel }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            pathname.replace(/\/+$/, "") === href ? "page" : undefined
          }
        >
          <span className="site-navigation__marker" aria-hidden="true" />
          <span className="site-navigation__label--full">{label}</span>
          <span className="site-navigation__label--short">{shortLabel}</span>
        </Link>
      ))}
    </nav>
  );
}
