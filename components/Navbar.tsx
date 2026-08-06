import Link from "next/link";
import { createClient } from "../utils/supabase/server";
import NavbarUserMenu from "./NavbarUserMenu";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const displayName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;
  const avatarUrl =
    typeof user?.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-violet-500/25">
            IA
          </div>

          <span className="text-lg font-black tracking-tight text-slate-950 max-[480px]:hidden sm:text-xl">
            EducationIA
          </span>
        </Link>

        <div className="hidden items-center gap-10 text-sm font-bold text-slate-700 md:flex">
          <a href="#fonctionnalites" className="hover:text-violet-700">
            Fonctionnalités
          </a>

          <a href="#comment-ca-marche" className="hover:text-violet-700">
            Comment ça marche
          </a>

          <Link
            href="/pricing"
            className="rounded-xl bg-violet-50 px-4 py-2 text-violet-700 transition hover:bg-violet-100"
          >
            Voir les offres
          </Link>

          <a href="#apropos" className="hover:text-violet-700">
            À propos
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/pricing"
            className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 md:hidden"
          >
            Voir les offres
          </Link>

          {user ? (
            <NavbarUserMenu
              email={user.email || null}
              displayName={displayName}
              avatarUrl={avatarUrl}
            />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:border-violet-300 hover:shadow-md sm:inline-flex"
              >
                Se connecter
              </Link>

              <Link
                href="/register"
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:-translate-y-0.5 hover:bg-violet-700 sm:px-6 sm:py-3"
              >
                Commencer
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
