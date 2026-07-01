import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileAvatar from "../../components/ProfileAvatar";
import { createClient } from "../../utils/supabase/server";

type Subject = {
  id: string;
  name: string;
  slug: string;
};

type ChapterStatus = "a_reprendre" | "en_cours" | "maitrise";

type ChapterWithProgress = {
  id: string;
  title: string;
  courseCount: number;
  masteryPercent: number | null;
  status: ChapterStatus | null;
};

const STATUS_LABELS: Record<ChapterStatus, string> = {
  a_reprendre: "À reprendre",
  en_cours: "En cours",
  maitrise: "Maîtrisé",
};

const STATUS_STYLES: Record<ChapterStatus, string> = {
  a_reprendre: "bg-red-50 text-red-700",
  en_cours: "bg-orange-50 text-orange-700",
  maitrise: "bg-emerald-50 text-emerald-700",
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
  const selectedSubject = params?.subject ?? safeSubjects[0]?.slug ?? "";

  const selectedSubjectRecord = safeSubjects.find(
    (subject) => subject.slug === selectedSubject
  );

  let chapters: ChapterWithProgress[] = [];
  let masteryPercent = 0;

  if (selectedSubjectRecord) {
    const { data: subjectChapters } = await supabase
      .from("chapters")
      .select("id, title")
      .eq("subject_id", selectedSubjectRecord.id)
      .order("title");

    const { data: subjectCours } = await supabase
      .from("cours")
      .select("id, chapter_id")
      .eq("user_id", user.id)
      .eq("subject_id", selectedSubjectRecord.id);

    const { data: progress } = await supabase
      .from("progress")
      .select("mastery_percent")
      .eq("user_id", user.id)
      .eq("subject_id", selectedSubjectRecord.id)
      .maybeSingle();

    masteryPercent = progress?.mastery_percent ?? 0;

    const chapterIds = (subjectChapters ?? []).map((chapter) => chapter.id);

    const { data: chapterProgressRows } =
      chapterIds.length > 0
        ? await supabase
            .from("chapter_progress")
            .select("chapter_id, mastery_percent, status")
            .eq("user_id", user.id)
            .in("chapter_id", chapterIds)
        : { data: [] };

    chapters = (subjectChapters ?? [])
      .map((chapter) => {
        const chapterProgress = chapterProgressRows?.find(
          (row) => row.chapter_id === chapter.id
        );

        return {
          id: chapter.id,
          title: chapter.title,
          courseCount:
            subjectCours?.filter((cours) => cours.chapter_id === chapter.id)
              .length ?? 0,
          masteryPercent: chapterProgress?.mastery_percent ?? null,
          status: (chapterProgress?.status as ChapterStatus | undefined) ?? null,
        };
      })
      .filter((chapter) => chapter.courseCount > 0);
  }

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
            <p className="mt-3 text-4xl font-black">{masteryPercent}%</p>
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
                Chapitres pour lesquels tu as déjà importé au moins un cours.
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
                  key={chapter.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-violet-300 hover:bg-white hover:shadow-xl"
                >
                  <div className="mb-6 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500 shadow-sm">
                      {chapter.courseCount} cours importé
                      {chapter.courseCount > 1 ? "s" : ""}
                    </span>

                    {chapter.status ? (
                      <span
                        className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${STATUS_STYLES[chapter.status]}`}
                      >
                        {STATUS_LABELS[chapter.status]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                        Pas encore évalué
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black">{chapter.title}</h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {chapter.masteryPercent !== null
                      ? `Maîtrise actuelle : ${chapter.masteryPercent}%`
                      : "Génère une fiche ou fais un quiz pour évaluer ce chapitre."}
                  </p>

                  {chapter.masteryPercent !== null && (
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500"
                        style={{ width: `${chapter.masteryPercent}%` }}
                      />
                    </div>
                  )}

                  <Link
                    href={`/cours/matiere/${selectedSubjectRecord?.id}`}
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
                Importe un cours pour cette matière pour le voir apparaître
                ici.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
