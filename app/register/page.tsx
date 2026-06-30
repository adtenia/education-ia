"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister() {
    setMessage("Création du compte en cours...");

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }

    setMessage("Compte créé ! Vérifie ta boîte mail.");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,0.18),transparent_35%),linear-gradient(180deg,#ffffff,#faf7ff)]" />

      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-violet-200/50 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-violet-500/25">
            IA
          </div>

          <h1 className="text-3xl font-black text-slate-950">
            Créer un compte
          </h1>

          <p className="mt-3 text-slate-600">
            Crée ton espace Education IA pour commencer à réviser.
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
          />

          <button
            type="button"
            onClick={handleRegister}
            className="w-full rounded-2xl bg-violet-600 px-4 py-4 font-black text-white shadow-lg shadow-violet-600/25 transition hover:-translate-y-0.5 hover:bg-violet-700"
          >
            Créer mon compte
          </button>
        </div>

        {message && (
          <p className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">
            {message}
          </p>
        )}

        <p className="mt-8 text-center text-sm text-slate-600">
          Tu as déjà un compte ?{" "}
          <Link href="/login" className="font-black text-violet-700">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}