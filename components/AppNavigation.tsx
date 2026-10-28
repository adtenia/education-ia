"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Tableau de bord", symbol: "⌂" },
  { href: "/cours", label: "Mes cours", symbol: "▤" },
  { href: "/import", label: "Importer", symbol: "＋" },
  { href: "/progression", label: "Progression", symbol: "↗" },
  { href: "/profile", label: "Profil", symbol: "◉" },
];

export default function AppNavigation() {
  const pathname = usePathname();
  const insideApp = ["/dashboard", "/cours", "/import", "/progression", "/profile", "/quiz", "/revisions", "/test"].some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (!insideApp) return null;

  return (
    <nav aria-label="Navigation de l'espace élève" className="sticky top-0 z-40 border-b border-violet-100 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-8">
        <Link href="/" className="mr-auto inline-flex items-center gap-2 rounded-xl px-3 py-2 font-black text-violet-700 transition hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-xs text-white">IA</span>
          <span className="hidden sm:inline">Éducation IA</span>
          <span className="sm:hidden">Accueil</span>
        </Link>
        <div className="flex max-w-full flex-wrap items-center gap-1.5">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-violet-600 sm:text-sm ${active ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"}`}
              >
                <span aria-hidden="true">{link.symbol}</span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
