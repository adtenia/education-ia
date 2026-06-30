import Link from "next/link";
import Navbar from "../components/Navbar";

const features = [
  {
    label: "01",
    title: "Importer un cours",
    text: "Ajoute un PDF ou une photo. Education IA prépare le document pour l’analyse.",
  },
  {
    label: "02",
    title: "Analyse intelligente",
    text: "L’IA repère la matière, le chapitre, les notions importantes et les points clés.",
  },
  {
    label: "03",
    title: "Fiches de révision",
    text: "Obtiens une fiche claire, structurée et facile à relire avant un contrôle.",
  },
  {
    label: "04",
    title: "Progression ciblée",
    text: "Visualise les chapitres à reprendre et suis ton niveau chapitre par chapitre.",
  },
];

const steps = [
  ["1", "Importe", "Choisis un PDF ou une photo de ton cours."],
  ["2", "Analyse IA", "Education IA extrait l’essentiel."],
  ["3", "Révise", "Tu obtiens une fiche claire et structurée."],
  ["4", "Progresse", "Tu t’entraînes et tu vois ton niveau avancer."],
];

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="overflow-hidden bg-white text-slate-950">
        <section className="relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_18%,rgba(124,58,237,0.22),transparent_32%),radial-gradient(circle_at_22%_28%,rgba(59,130,246,0.10),transparent_28%),linear-gradient(180deg,#ffffff,#faf7ff)]" />

          <div className="mx-auto grid min-h-[760px] max-w-7xl items-center gap-20 px-8 py-24 lg:grid-cols-2">
            <div>
              <div className="mb-8 inline-flex rounded-full border border-violet-200 bg-white/80 px-5 py-3 text-sm font-bold text-violet-700 shadow-sm">
                Révise mieux. Progresse plus vite.
              </div>

              <h1 className="max-w-2xl text-6xl font-black leading-tight tracking-tight md:text-7xl">
                Ton assistant de révision{" "}
                <span className="bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-500 bg-clip-text text-transparent">
                  boosté à l’IA
                </span>
              </h1>

              <p className="mt-8 max-w-xl text-xl leading-9 text-slate-600">
                Importe tes cours, laisse l’IA comprendre l’essentiel et génère
                des fiches de révision claires, complètes et efficaces.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="rounded-2xl bg-violet-600 px-8 py-4 text-lg font-black text-white shadow-xl shadow-violet-600/25 transition hover:-translate-y-1 hover:bg-violet-700"
                >
                  Commencer maintenant →
                </Link>

                <a
                  href="#comment-ca-marche"
                  className="rounded-2xl border border-slate-200 bg-white px-8 py-4 text-lg font-black text-slate-900 shadow-sm transition hover:-translate-y-1 hover:border-violet-300"
                >
                  Voir le fonctionnement
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-4 text-sm font-bold text-slate-500">
                <span className="rounded-full bg-white px-5 py-3 shadow-sm">
                  Sécurisé
                </span>
                <span className="rounded-full bg-white px-5 py-3 shadow-sm">
                  Pensé pour les élèves
                </span>
                <span className="rounded-full bg-white px-5 py-3 shadow-sm">
                  Suivi personnalisé
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-14 -z-10 rounded-full bg-violet-300/30 blur-3xl" />

              <div className="rounded-[2.5rem] border border-white/80 bg-white/85 p-8 shadow-2xl shadow-violet-200 backdrop-blur-xl">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-500">
                    Fiche générée par l’IA
                  </p>

                  <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-700">
                    Terminé
                  </span>
                </div>

                <h2 className="text-3xl font-black text-slate-950">
                  La Révolution française
                </h2>

                <p className="mt-3 inline-block rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
                  Histoire · 4ème
                </p>

                <div className="mt-8">
                  <h3 className="font-black text-slate-900">Points clés</h3>

                  <ul className="mt-4 space-y-3 text-slate-600">
                    <li>• Causes profondes de la Révolution</li>
                    <li>• Les États généraux</li>
                    <li>• La prise de la Bastille</li>
                    <li>• La Déclaration des droits de l’homme</li>
                  </ul>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-violet-50 p-5">
                    <p className="text-sm font-bold text-slate-500">
                      Questions
                    </p>
                    <p className="mt-2 text-4xl font-black text-violet-700">
                      12
                    </p>
                  </div>

                  <div className="rounded-2xl bg-violet-50 p-5">
                    <p className="text-sm font-bold text-slate-500">
                      Progression
                    </p>
                    <p className="mt-2 text-4xl font-black text-violet-700">
                      75%
                    </p>
                    <div className="mt-4 h-2 rounded-full bg-violet-200">
                      <div className="h-2 w-3/4 rounded-full bg-violet-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="mx-auto max-w-7xl px-8 py-24">
          <h2 className="text-center text-4xl font-black md:text-5xl">
            Tout ce dont tu as besoin pour{" "}
            <span className="text-violet-600">réussir</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-8 text-slate-600">
            Education IA transforme les cours en outils de révision simples,
            utiles et personnalisés.
          </p>

          <div className="mt-14 grid gap-8 md:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 text-lg font-black text-white shadow-lg shadow-violet-600/25">
                  {feature.label}
                </div>

                <h3 className="text-xl font-black">{feature.title}</h3>

                <p className="mt-4 leading-7 text-slate-600">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="comment-ca-marche" className="mx-auto max-w-7xl px-8 py-24">
          <h2 className="text-center text-4xl font-black md:text-5xl">
            Comment <span className="text-violet-600">ça marche</span> ?
          </h2>

          <div className="relative mt-16 grid gap-10 md:grid-cols-4">
            <div className="absolute left-[12%] right-[12%] top-10 hidden h-px bg-slate-200 md:block" />

            {steps.map(([number, title, text]) => (
              <div key={title} className="relative text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 text-2xl font-black text-white shadow-xl shadow-violet-600/25">
                  {number}
                </div>

                <h3 className="text-xl font-black">{title}</h3>

                <p className="mt-3 leading-7 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="tarifs" className="bg-slate-50 px-8 py-24">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-4xl font-black md:text-5xl">
              Choisis ta formule
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-8 text-slate-600">
              Deux offres payantes sont prévues. Les paiements seront gérés plus
              tard avec Stripe.
            </p>

            <div className="mt-14 grid gap-8 md:grid-cols-2">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
                <h3 className="text-3xl font-black">Standard</h3>

                <p className="mt-4 leading-8 text-slate-600">
                  Pour réviser régulièrement avec des fiches, des quiz et un
                  suivi clair.
                </p>

                <div className="mt-8 text-5xl font-black">
                  9,99€
                  <span className="text-lg font-bold text-slate-500">
                    {" "}
                    / mois
                  </span>
                </div>

                <ul className="mt-8 space-y-4 text-slate-600">
                  <li>✓ Import de cours</li>
                  <li>✓ Fiches de révision</li>
                  <li>✓ Quiz d’entraînement</li>
                  <li>✓ Suivi de progression</li>
                </ul>

                <Link
                  href="/register"
                  className="mt-10 inline-block rounded-2xl bg-slate-950 px-8 py-4 font-black text-white transition hover:bg-slate-800"
                >
                  Choisir Standard
                </Link>
              </div>

              <div className="relative rounded-[2rem] border-2 border-violet-600 bg-white p-10 shadow-xl shadow-violet-600/10">
                <div className="absolute right-8 top-8 rounded-full bg-violet-600 px-4 py-2 text-sm font-black text-white">
                  Recommandé
                </div>

                <h3 className="text-3xl font-black">Premium</h3>

                <p className="mt-4 leading-8 text-slate-600">
                  Pour aller plus loin avec plus d’IA, plus d’exercices et un
                  accompagnement plus complet.
                </p>

                <div className="mt-8 text-5xl font-black">
                  19,99€
                  <span className="text-lg font-bold text-slate-500">
                    {" "}
                    / mois
                  </span>
                </div>

                <ul className="mt-8 space-y-4 text-slate-600">
                  <li>✓ Tout Standard</li>
                  <li>✓ Plus de générations IA</li>
                  <li>✓ Exercices ciblés avancés</li>
                  <li>✓ Cahier de révision personnalisé</li>
                </ul>

                <Link
                  href="/register"
                  className="mt-10 inline-block rounded-2xl bg-violet-600 px-8 py-4 font-black text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700"
                >
                  Choisir Premium
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="apropos" className="px-8 py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
            <div>
              <p className="font-black text-violet-700">À propos</p>

              <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
                Une application pour aider les élèves à savoir quoi réviser.
              </h2>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-10 leading-8 text-slate-600 shadow-sm">
              <p>
                Education IA ne remplace pas l’école ni les enseignants. Elle
                agit comme un assistant de révision disponible à tout moment.
              </p>

              <p className="mt-6">
                Sa mission est de transformer un cours en un plan de travail
                clair : fiche, quiz, progression et chapitres à reprendre.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 pb-24">
          <div className="rounded-[2rem] border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-10 shadow-sm md:flex md:items-center md:justify-between">
            <div>
              <h2 className="text-4xl font-black">
                Prêt à transformer tes révisions ?
              </h2>

              <p className="mt-4 text-lg text-slate-600">
                Crée ton compte et commence à construire ton espace de travail.
              </p>
            </div>

            <Link
              href="/register"
              className="mt-8 inline-block rounded-2xl bg-violet-600 px-8 py-4 text-lg font-black text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700 md:mt-0"
            >
              Commencer maintenant →
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 px-8 py-12">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
            <div>
              <h3 className="text-xl font-black">Education IA</h3>

              <p className="mt-4 text-slate-500">
                Ton assistant de révision intelligent et personnalisé.
              </p>
            </div>

            <div>
              <h4 className="font-black">Produit</h4>
              <a href="#fonctionnalites" className="mt-3 block text-slate-500">
                Fonctionnalités
              </a>
              <a href="#tarifs" className="mt-2 block text-slate-500">
                Tarifs
              </a>
            </div>

            <div>
              <h4 className="font-black">Entreprise</h4>
              <a href="#apropos" className="mt-3 block text-slate-500">
                À propos
              </a>
              <p className="mt-2 text-slate-500">Contact</p>
            </div>

            <div>
              <h4 className="font-black">Ressources</h4>
              <p className="mt-3 text-slate-500">Aide</p>
              <p className="mt-2 text-slate-500">Confidentialité</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}