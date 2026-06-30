import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileAvatar from "../../components/ProfileAvatar";
import { createClient } from "../../utils/supabase/server";

const chaptersBySubject = {
  maths: [
    { title: "Fractions", progress: 78, status: "À reprendre" },
    { title: "Proportionnalité", progress: 58, status: "En cours" },
    { title: "Équations simples", progress: 32, status: "Fragile" },
  ],
  francais: [
    { title: "Le passé composé", progress: 72, status: "À reprendre" },
    { title: "Les accords du participe passé", progress: 45, status: "Fragile" },
  ],
  histoire: [
    { title: "La Révolution française", progress: 64, status: "En cours" },
    { title: "L’Empire romain", progress: 38, status: "Fragile" },
  ],
  svt: [
    { title: "Le corps humain", progress: 81, status: "À reprendre" },
    { title: "Les volcans", progress: 51, status: "En cours" },
  ],
  physique: [
    { title: "L’électricité", progress: 69, status: "En cours" },
    { title: "Les forces", progress: 40, status: "Fragile" },
  ],
  anglais: [
    { title: "Le prétérit", progress: 74, status: "À reprendre" },
    { title: "Le vocabulaire du collège", progress: 55, status: "En cours" },
  ],
  musique: [
    { title: "Le rythme", progress: 62, status: "En cours" },
    { title: "Les instruments", progress: 47, status: "Fragile" },
  ],
};

type Subject = {
  id: string;
  name: string;
  slug: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ subject?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erreur chargement matières :", error.message);
  }

  const safeSubjects: Subject[] = subjects ?? [];

  const params = await searchParams;
  const selectedSubject = params?.subject ?? safeSubjects[0]?.slug ?? "maths";

  const chapters =
    chaptersBySubject[selectedSubject as keyof typeof chaptersBySubject] ??
    [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfaff] px-8 py-8 text-slate-950">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(139,92,246,0.18),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(99,102,241,0.13),transparent_30%),linear-gradient(180deg,#ffffff,#faf7ff)]" />

      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-600">
              Espace élève
            </p>
            <h1 className="mt-3 text-4xl font-black">Tableau de bord</h1>
            <p className="mt-2 text-slate-500">{user.email}</p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/import"
              className="rounded-2xl bg-violet-600 px-6 py-4 font-black text-white shadow-lg shadow-violet-600/25 transition hover:-translate-y-0.5 hover:bg-violet-700"
            >
              + Importer un cours
            </Link>

            <Link href="/profile" aria-label="Profil">
              <ProfileAvatar email={user.email} />
            </Link>
          </div>
        </header>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-[2rem] border border-violet-100 bg-white/85 p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Chapitres à reprendre
            </p>
            <p className="mt-3 text-4xl font-black">{chapters.length}</p>
          </div>

          <div className="rounded-[2rem] border border-violet-100 bg-white/85 p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Travail du jour</p>
            <p className="mt-3 text-4xl font-black">Réviser</p>
          </div>

          <div className="rounded-[2rem] border border-violet-100 bg-white/85 p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Progression globale
            </p>
            <p className="mt-3 text-4xl font-black">0%</p>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-violet-100 bg-white/85 p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            {safeSubjects.map((subject) => {
              const isSelected = selectedSubject === subject.slug;

              return (
                <Link
                  key={subject.id}
                  href={`/dashboard?subject=${subject.slug}`}
                  className={
                    isSelected
                      ? "rounded-full border-2 border-violet-600 bg-violet-50 px-6 py-3 font-black text-violet-700"
                      : "rounded-full border-2 border-slate-100 bg-white px-6 py-3 font-bold text-slate-600 transition hover:border-violet-300 hover:text-violet-700"
                  }
                >
                  {subject.name}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-violet-100/60">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-black">Chapitres à reprendre</h2>
              <p className="mt-2 text-slate-500">
                Les chapitres maîtrisés à 100 % ne sont pas affichés ici.
              </p>
            </div>

            <span className="rounded-full bg-violet-50 px-5 py-3 text-sm font-black text-violet-700">
              {chapters.length} en cours
            </span>
          </div>

          {chapters.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {chapters.map((chapter) => (
                <article
                  key={chapter.title}
                  className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-violet-300 hover:bg-white hover:shadow-xl"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500 shadow-sm">
                      {chapter.status}
                    </span>
                    <span className="font-black text-violet-700">
                      {chapter.progress}%
                    </span>
                  </div>

                  <h3 className="text-xl font-black">{chapter.title}</h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Continue ce chapitre pour renforcer les notions encore
                    fragiles.
                  </p>

                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500"
                      style={{ width: `${chapter.progress}%` }}
                    />
                  </div>

                  <Link
                    href="#"
                    className="mt-6 inline-block rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700"
                  >
                    Continuer
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-violet-200 bg-violet-50/40 p-10 text-center">
              <p className="text-xl font-black text-slate-900">
                Aucun chapitre pour cette matière pour le moment.
              </p>
              <p className="mt-3 text-slate-500">
                Plus tard, les chapitres viendront aussi de Supabase.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}