"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "../utils/supabase/client";

type NavbarUserMenuProps = {
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

function initials(displayName: string | null, email: string | null) {
  const source = displayName?.trim() || email?.split("@")[0] || "Utilisateur";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function NavbarUserMenu({
  email,
  displayName,
  avatarUrl,
}: NavbarUserMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function logout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Ouvrir le menu du compte"
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-violet-500/25 ring-2 ring-violet-100 transition hover:-translate-y-0.5 hover:ring-violet-200"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(displayName, email)
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.75rem)] w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10"
        >
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="truncate text-sm font-black text-slate-950">
              {displayName || "Mon compte"}
            </p>
            {email && <p className="mt-1 truncate text-xs text-slate-500">{email}</p>}
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
          >
            Mon profil
          </Link>
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
          >
            Mes cours
          </Link>
          <Link
            href="/progression"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
          >
            Progression
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={loggingOut}
            onClick={logout}
            className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            {loggingOut ? "Déconnexion…" : "Déconnexion"}
          </button>
        </div>
      )}
    </div>
  );
}
