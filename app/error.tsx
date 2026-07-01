"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-black text-slate-950">
          Une erreur est survenue
        </h1>

        <p className="mt-4 text-slate-600">
          Quelque chose s'est mal passé de notre côté. Tu peux réessayer, ou
          revenir à l'accueil.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="rounded-2xl bg-violet-600 px-6 py-3 font-black text-white transition hover:bg-violet-700"
          >
            Réessayer
          </button>

          <Link
            href="/"
            className="rounded-2xl border border-slate-200 px-6 py-3 font-bold text-slate-700 transition hover:border-violet-300"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
