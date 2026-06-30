"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("Connexion en cours...");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,0.18),transparent_35%),linear-gradient(180deg,#ffffff,#faf7ff)]" />

      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-violet-200/40 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-lg font-black text-white shadow-lg">
            IA
          </div>

          <h1 className="text-3xl font-black text-slate-950">
            Bon retour 👋
          </h1>

          <p className="mt-3 text-slate-600">
            Connecte-toi pour retrouver tes cours et ta progression.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
            required
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
            required
          />

          <button
            type="submit"
            className="w-full rounded-2xl bg-violet-600 py-4 text-lg font-black text-white shadow-lg shadow-violet-600/25 transition hover:-translate-y-0.5 hover:bg-violet-700"
          >
            Se connecter
          </button>
        </form>

        {message && (
          <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-center text-sm font-semibold text-slate-700">
            {message}
          </div>
        )}

        <div className="mt-8 border-t border-slate-200 pt-6 text-center">
          <p className="text-slate-600">
            Tu n'as pas encore de compte ?
          </p>

          <Link
            href="/register"
            className="mt-3 inline-block font-bold text-violet-700 hover:text-violet-800"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );
}