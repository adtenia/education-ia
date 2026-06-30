import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-violet-500/25">
            IA
          </div>

          <span className="text-xl font-black tracking-tight text-slate-950">
            Education IA
          </span>
        </Link>

        <div className="hidden items-center gap-10 text-sm font-bold text-slate-700 md:flex">
          <a href="#fonctionnalites" className="hover:text-violet-700">
            Fonctionnalités
          </a>

          <a href="#comment-ca-marche" className="hover:text-violet-700">
            Comment ça marche
          </a>

          <a href="#tarifs" className="hover:text-violet-700">
            Tarifs
          </a>

          <a href="#apropos" className="hover:text-violet-700">
            À propos
          </a>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-900 shadow-sm transition hover:border-violet-300 hover:shadow-md"
          >
            Se connecter
          </Link>

          <Link
            href="/register"
            className="rounded-2xl bg-violet-600 px-6 py-3 font-bold text-white shadow-lg shadow-violet-600/25 transition hover:-translate-y-0.5 hover:bg-violet-700"
          >
            Commencer
          </Link>
        </div>
      </div>
    </nav>
  );
}