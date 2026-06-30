import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "../../components/LogoutButton";
import ProfileAvatar from "../../components/ProfileAvatar";
import { createClient } from "../../utils/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfaff] px-8 py-8 text-slate-950">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(139,92,246,0.18),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(99,102,241,0.13),transparent_30%),linear-gradient(180deg,#ffffff,#faf7ff)]" />

      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="rounded-2xl border border-violet-100 bg-white px-6 py-3 font-black text-violet-700 shadow-sm transition hover:border-violet-300"
          >
            ← Retour au Dashboard
          </Link>

          <Link
            href="/import"
            className="rounded-2xl bg-violet-600 px-6 py-4 font-black text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700"
          >
            + Importer un cours
          </Link>
        </div>

        <section className="mt-8 rounded-[2rem] border border-violet-100 bg-white/90 p-10 shadow-xl shadow-violet-100/60">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-8">
              <ProfileAvatar email={user.email} size="large" />

              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-600">
                  Profil élève
                </p>
                <h1 className="mt-2 text-5xl font-black">Mon profil</h1>
                <p className="mt-3 text-slate-500">
                  Gère ton compte, ton abonnement et tes informations scolaires.
                </p>
              </div>
            </div>

            <div className="hidden text-right md:block">
              <p className="text-sm font-black text-violet-600">Utilisateur connecté</p>
              <p className="mt-2 font-bold text-slate-900">{user.email}</p>
              <p className="mt-3 text-sm font-bold text-emerald-600">Compte actif</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black">Informations du compte</h2>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-5">
                <span className="font-bold text-slate-500">Email</span>
                <span className="break-all font-black text-slate-900">{user.email}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-5">
                <span className="font-bold text-slate-500">Statut</span>
                <span className="rounded-full bg-emerald-100 px-4 py-2 font-black text-emerald-700">
                  Compte connecté
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black">Abonnement</h2>

            <div className="mt-6 rounded-2xl bg-violet-50 p-5">
              <p className="text-sm font-black text-violet-700">Formule actuelle</p>
              <p className="mt-2 text-2xl font-black">Aucun abonnement actif</p>
              <p className="mt-3 leading-7 text-slate-600">
                Deux formules payantes sont prévues : Standard et Premium.
              </p>

              <button className="mt-5 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white transition hover:bg-violet-700">
                Choisir une formule
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black">Informations scolaires</h2>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-5">
                <span className="font-bold text-slate-500">Classe</span>
                <span className="font-black text-violet-700">À compléter</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-5">
                <span className="font-bold text-slate-500">Objectif</span>
                <span className="font-black">Progresser chapitre par chapitre</span>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black">Progression</h2>

            <div className="mt-6 grid grid-cols-2 gap-4">
              {["Cours importés", "Quiz réalisés", "Fiches créées", "Progression"].map(
                (item, index) => (
                  <div key={item} className="rounded-2xl bg-slate-50 p-5 text-center">
                    <p className="text-sm font-bold text-slate-500">{item}</p>
                    <p className="mt-2 text-3xl font-black text-violet-700">
                      {index === 3 ? "0%" : "0"}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black">Paramètres</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <button className="rounded-2xl bg-slate-50 p-5 text-left font-black text-slate-700 transition hover:bg-violet-50 hover:text-violet-700">
              Modifier l'email
            </button>

            <button className="rounded-2xl bg-slate-50 p-5 text-left font-black text-slate-700 transition hover:bg-violet-50 hover:text-violet-700">
              Changer le mot de passe
            </button>

            <button className="rounded-2xl bg-slate-50 p-5 text-left font-black text-slate-700 transition hover:bg-violet-50 hover:text-violet-700">
              Notifications
            </button>
          </div>
        </section>

        <section className="mt-8 flex items-center justify-between rounded-[2rem] border border-red-100 bg-white p-7 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-red-700">Zone de compte</h2>
            <p className="mt-2 text-slate-500">
              Tu peux quitter ta session depuis cette section.
            </p>
          </div>

          <LogoutButton />
        </section>
      </div>
    </main>
  );
}