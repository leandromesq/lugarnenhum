"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/data/band";

export function SiteNavigation() {
  const pathname = usePathname();
  return (
    <nav className="site-navigation" aria-label="Navegação principal">
      {navigation.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            pathname.replace(/\/+$/, "") === href ? "page" : undefined
          }
        >
          <span aria-hidden="true">-</span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
