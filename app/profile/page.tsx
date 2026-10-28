import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "../../components/LogoutButton";
import SchoolClassSelector from "../../components/SchoolClassSelector";
import ProfileAvatar from "../../components/ProfileAvatar";
import SubscriptionBadge from "../../components/SubscriptionBadge";
import { getSubscriptionAccess } from "../../lib/subscription-access";
import { createClient } from "../../utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/profile");

  const [statsResult, progressResult, subscription] = await Promise.all([
    supabase.from("user_progress_stats")
      .select("total_courses, total_quizzes, total_revision_sheets")
      .eq("user_id", user.id).maybeSingle(),
    supabase.from("progress").select("mastery_percent").eq("user_id", user.id),
    getSubscriptionAccess(),
  ]);

  const stats = statsResult.data;
  const masteryValues = (progressResult.data ?? [])
    .map((row) => Number(row.mastery_percent))
    .filter(Number.isFinite);
  const mastery = masteryValues.length
    ? Math.round(masteryValues.reduce((total, value) => total + value, 0) / masteryValues.length)
    : null;
  const firstName = typeof user.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null;

  const metrics = [
    { label: "Cours importés", value: stats?.total_courses ?? "—", hint: "Supports ajoutés" },
    { label: "Quiz réalisés", value: stats?.total_quizzes ?? "—", hint: "Entraînements terminés" },
    { label: "Fiches créées", value: stats?.total_revision_sheets ?? "—", hint: "Fiches de révision" },
    { label: "Maîtrise moyenne", value: mastery === null ? "—" : `${mastery}%`, hint: "Sur les chapitres évalués" },
  ];

  return (
    <main className="relative min-h-screen bg-[#fbfaff] px-4 pb-16 pt-8 text-slate-950 sm:px-6 sm:pt-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,0.15),transparent_50%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.09),transparent_45%)]" />
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Espace élève / Compte</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Mon profil</h1>
            <p className="mt-2 text-sm text-slate-500">Tes informations et ton parcours, au même endroit.</p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700 shadow-sm transition hover:border-violet-400 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600">
            ← Tableau de bord
          </Link>
        </header>

        <section aria-label="Identité du compte" className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-white p-6 shadow-lg shadow-violet-100/50 sm:p-8">
          <div aria-hidden="true" className="absolute right-0 top-0 h-40 w-40 rounded-full bg-violet-100/50 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <ProfileAvatar email={user.email} size="large" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Compte personnel</p>
              <h2 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">
                {firstName || "Bienvenue sur Éducation IA"}
              </h2>
              <p className="mt-2 break-all text-sm text-slate-500">{user.email || "Adresse e-mail indisponible"}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">● Connecté</span>
                {subscription.hasAccess && subscription.plan !== "none" && <SubscriptionBadge plan={subscription.plan} />}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black">Informations du compte</h2>
            <p className="mt-1 text-sm text-slate-500">Les informations associées à ta connexion.</p>
            <dl className="mt-6 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Adresse e-mail</dt>
                <dd className="mt-2 break-all font-bold text-slate-900">{user.email || "Non renseignée"}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Statut</dt>
                <dd className="mt-2 font-bold text-emerald-700">Session active</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">Mon abonnement</h2>
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">
                {subscription.plan === "none" ? "Sans formule" : subscription.plan}
              </span>
            </div>
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Formule actuelle</p>
              <p className="mt-2 text-2xl font-black capitalize">{subscription.plan === "none" ? "Aucun abonnement" : subscription.plan}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {subscription.status === "past_due"
                  ? "Un paiement nécessite ton attention. La gestion de facturation n'est pas encore disponible depuis cette page."
                  : subscription.hasAccess
                    ? "Ta formule donne accès aux outils inclus dans ton abonnement."
                    : "Découvre les formules disponibles pour accéder aux outils."}
              </p>
              <Link href="/pricing" className="mt-5 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
                {subscription.plan === "none" ? "Découvrir les formules →" : "Voir les formules →"}
              </Link>
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Ma scolarité</h2>
              <p className="mt-1 text-sm text-slate-500">Personnalise le niveau des prochains quiz et entraînements.</p>
            </div>
            <span aria-hidden="true" className="rounded-xl bg-violet-50 px-3 py-2 font-black text-violet-700">✦</span>
          </div>
          <SchoolClassSelector initialClass={typeof user.user_metadata?.school_class === "string" ? user.user_metadata.school_class : null} />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Mon parcours en chiffres</h2>
              <p className="mt-1 text-sm text-slate-500">Les données disponibles de ton apprentissage.</p>
            </div>
            <Link href="/progression" className="text-sm font-black text-violet-700 hover:underline">Voir ma progression →</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-violet-50 bg-slate-50 p-4 sm:p-5">
                <p className="text-xs font-bold text-slate-500">{metric.label}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-violet-700">{metric.value}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{metric.hint}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">« — » signifie qu'aucune donnée exploitable n'est disponible pour cet indicateur.</p>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black">Continuer à apprendre</h2>
          <p className="mt-1 text-sm text-slate-500">Retrouve rapidement tes espaces de travail.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { href: "/dashboard", title: "Tableau de bord", subtitle: "Reprendre mes révisions" },
              { href: "/cours", title: "Mes cours", subtitle: "Retrouver mes chapitres" },
              { href: "/import", title: "Importer un cours", subtitle: "Ajouter un nouveau support" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600">
                <span className="block font-black text-slate-900">{item.title} <span aria-hidden="true" className="text-violet-600 transition group-hover:translate-x-1">→</span></span>
                <span className="mt-1 block text-xs text-slate-500">{item.subtitle}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-[2rem] border border-rose-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-black text-slate-900">Se déconnecter</h2>
            <p className="mt-1 text-sm text-slate-500">Terminer cette session sur cet appareil. Tes cours restent enregistrés.</p>
          </div>
          <LogoutButton />
        </section>
        <footer className="pb-2 text-center">
          <Link href="/" className="text-sm font-bold text-slate-500 transition hover:text-violet-700">← Retour à l'accueil d'Éducation IA</Link>
        </footer>
      </div>
    </main>
  );
}
