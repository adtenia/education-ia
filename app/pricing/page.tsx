import type { Metadata } from "next";
import Link from "next/link";
import SubscribeButton from "../../components/SubscribeButton";
import { createClient } from "../../utils/supabase/server";
import NavbarUserMenu from "../../components/NavbarUserMenu";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Découvrez les abonnements EducationIA pour transformer vos cours en fiches de révision, quiz et cartes mentales.",
};

const plans = [
  {
    name: "Standard",
    key: "standard" as const,
    price: "9,99 €",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    features: [
      "Analyse de cours IA",
      "Résumé intelligent",
      "Génération de fiches de révision",
      "Génération de cartes mentales",
      "Jusqu'à 3 quiz par cours",
      "Export PDF",
      "Historique des cours",
    ],
    featured: true,
  },
  {
    name: "Premium",
    key: "premium" as const,
    price: "14,99 €",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    features: [
      "Tout Standard",
      "Plus de générations IA",
      "Suivi intelligent des progrès",
      "Préparation aux contrôles",
      "Exercices adaptés aux erreurs",
      "Importation de cours et quiz personnalisés",
    ],
    featured: false,
  },
  {
    name: "Pro",
    key: "pro" as const,
    price: "19,99 €",
    badgeClass: "border-violet-200 bg-violet-100 text-violet-900",
    features: [
      "Tout Premium",
      "Entraînement aux contrôles",
      "Suivi des notions à renforcer",
      "Fiches et quiz adaptés",
      "Statistiques avancées",
      "Évolutions à venir",
    ],
    featured: false,
  },
];

const faqs = [
  {
    question: "Puis-je résilier à tout moment ?",
    answer:
      "Les abonnements sont mensuels. La gestion de la résiliation sera vérifiée avant le lancement commercial.",
  },
  {
    question: "Mes paiements sont-ils sécurisés ?",
    answer:
      "Les paiements sont traités par Stripe. En environnement de test, les transactions sont simulées.",
  },
  {
    question: "Mes données sont-elles protégées ?",
    answer:
      "EducationIA est conçu pour préserver la confidentialité des cours et des informations personnelles de chaque utilisateur.",
  },
  {
    question: "Les fonctionnalités sont-elles toutes disponibles ?",
    answer:
      "Les outils de révision existants sont accessibles selon votre formule. Certaines nouveautés annoncées sont encore en développement.",
  },
];

function CheckIcon() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700"
    >
      ✓
    </span>
  );
}

type PricingPageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const { checkout } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const displayName = typeof user?.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : typeof user?.user_metadata?.name === "string"
      ? user.user_metadata.name : null;
  const avatarUrl = typeof user?.user_metadata?.avatar_url === "string"
    ? user.user_metadata.avatar_url : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffdfa] text-slate-950">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-36 top-28 h-96 w-96 rounded-full bg-orange-200/35 blur-3xl" />
        <div className="absolute -right-40 -top-24 h-[32rem] w-[32rem] rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute bottom-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-100/35 blur-3xl" />
      </div>

      <nav className="relative z-20 border-b border-amber-100/80 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-violet-500/20">
              IA
            </span>
            <span className="text-lg font-black tracking-tight sm:text-xl">EducationIA</span>
          </Link>
          {user ? (
            <NavbarUserMenu email={user.email || null} displayName={displayName} avatarUrl={avatarUrl} />
          ) : (
            <Link href="/register" className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition duration-300 hover:-translate-y-0.5 hover:bg-violet-700 sm:px-6 sm:py-3">
              Commencer
            </Link>
          )}
        </div>
      </nav>

      <div className="relative z-10">
        <section className="mx-auto max-w-5xl px-5 pb-20 pt-24 text-center sm:px-8 sm:pb-24 sm:pt-32">
          <div className="mx-auto mb-7 inline-flex rounded-full border border-violet-200/80 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-700 shadow-sm backdrop-blur">
            Des outils puissants pour mieux apprendre
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-black leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
            Débloquez tout le potentiel d&apos;
            <span className="bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-500 bg-clip-text text-transparent">
              EducationIA
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
            Une intelligence artificielle qui transforme vos cours en fiches de révision,
            quiz et cartes mentales en quelques secondes.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={user ? "/dashboard" : "/register"} className="rounded-2xl bg-violet-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-violet-600/25 transition duration-300 hover:-translate-y-0.5 hover:bg-violet-700">
              {user ? "Mon tableau de bord" : "Commencer"}
            </Link>
            <a
              href="#offres"
              className="rounded-2xl border border-slate-200 bg-white/80 px-8 py-4 text-base font-bold text-slate-800 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white"
            >
              Voir les offres
            </a>
          </div>
          {checkout === "cancelled" && (
            <p className="mx-auto mt-6 max-w-xl rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm font-semibold text-amber-900 backdrop-blur">
              Paiement annulé. Aucun prélèvement n&apos;a été effectué.
            </p>
          )}
        </section>

        <section id="offres" className="mx-auto max-w-7xl scroll-mt-8 px-5 pb-28 sm:px-8">
          <div className="grid items-stretch gap-6 lg:grid-cols-3 lg:gap-7">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`group relative flex flex-col rounded-[2rem] border bg-white/75 p-7 backdrop-blur-xl transition duration-500 hover:-translate-y-2 sm:p-9 ${
                  plan.featured
                    ? "border-violet-300 shadow-[0_24px_70px_-28px_rgba(109,40,217,0.48)] ring-1 ring-violet-200/70 lg:-translate-y-3 lg:hover:-translate-y-5"
                    : "border-white/90 shadow-[0_20px_60px_-35px_rgba(71,50,30,0.35)] hover:border-amber-100 hover:shadow-[0_26px_70px_-35px_rgba(71,50,30,0.42)]"
                }`}
              >
                {plan.featured && (
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
                )}
                <div className="flex min-h-8 items-center justify-between gap-3">
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] ${plan.badgeClass}`}>
                    {plan.name}
                  </span>

                </div>

                <div className="mt-8 border-b border-slate-100 pb-8">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                      {plan.price}
                    </span>
                    <span className="pb-1.5 text-sm font-semibold text-slate-500">/mois</span>
                  </div>
                </div>

                <ul className="my-8 flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm font-medium leading-6 text-slate-700 sm:text-base">
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <SubscribeButton
                  plan={plan.key}
                  text={`Choisir ${plan.name}`}
                  className="w-full rounded-2xl bg-violet-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:-translate-y-0.5 hover:bg-violet-700 focus-visible:outline-violet-600"
                />
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-amber-100/80 bg-white/55 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl px-5 py-24 sm:px-8 sm:py-28">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">Questions fréquentes</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                Tout ce qu&apos;il faut savoir
              </h2>
            </div>
            <div className="mt-12 divide-y divide-slate-200 rounded-[2rem] border border-white bg-white/85 px-6 shadow-[0_24px_70px_-40px_rgba(71,50,30,0.3)] sm:px-9">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-bold text-slate-950 marker:content-none sm:text-lg">
                    {faq.question}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xl font-light text-violet-700 transition duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pr-10 pt-4 text-sm leading-7 text-slate-600 sm:text-base">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <footer className="px-5 py-10 text-center text-sm font-medium text-slate-500">
          Paiement sécurisé par Stripe.
        </footer>
      </div>
    </main>
  );
}
