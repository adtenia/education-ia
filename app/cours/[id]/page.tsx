import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";
import RevisionSheetContent, {
  cleanRevisionTitle,
} from "./RevisionSheetContent";
import { createQuiz, createRevisionSheet, deleteCours } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

type Definition = {
  term: string;
  definition: string;
};

type CourseSection = {
  title: string;
  paragraphs: string[];
  key_points: string[];
  definitions: Definition[];
  examples: string[];
};

type StructuredCourse = {
  title: string;
  introduction: string;
  sections: CourseSection[];
  important_points: string[];
  conclusion: string;
};

function getStructuredCourse(result: unknown): StructuredCourse | null {
  if (!result) return null;

  try {
    const parsed = typeof result === "string" ? JSON.parse(result) : result;

    if (!parsed || typeof parsed !== "object" || !("course" in parsed)) {
      return null;
    }

    const course = parsed.course as Partial<StructuredCourse> | null;

    if (!course || typeof course !== "object" || !Array.isArray(course.sections)) {
      return null;
    }

    return course as StructuredCourse;
  } catch {
    return null;
  }
}

export default async function CoursDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cours } = await supabase
    .from("cours")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!cours) redirect("/cours");

  const { data: revisionSheets } = await supabase
    .from("revision_sheets")
    .select("*")
    .eq("cours_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: quizzes } = await supabase
    .from("quiz")
    .select("*")
    .eq("cours_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const structuredCourse = getStructuredCourse(cours.result);
  const deleteCoursWithId = deleteCours.bind(null, id);
  const createQuizWithId = createQuiz.bind(null, id);
  const createRevisionSheetWithId = createRevisionSheet.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/cours" className="text-sm font-semibold text-slate-600 hover:text-slate-950">
            ← Retour aux cours
          </Link>
          <form action={deleteCoursWithId}>
            <button type="submit" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100">
              Supprimer le cours
            </button>
          </form>
        </div>

        <article className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <header className="border-b border-slate-200 bg-gradient-to-br from-blue-50 to-white px-6 py-8 sm:px-10 sm:py-12">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-700">Cours</p>
            <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {structuredCourse?.title || cours.title || "Cours sans titre"}
            </h1>
            <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
              <span className="rounded-full bg-blue-100 px-4 py-2 text-blue-800">
                Matière : {cours.detected_subject || "Non détectée"}
              </span>
              <span className="rounded-full bg-purple-100 px-4 py-2 text-purple-800">
                Chapitre : {cours.detected_chapter || "Non détecté"}
              </span>
            </div>
          </header>

          {structuredCourse ? (
            <div className="px-6 py-8 sm:px-10 sm:py-12">
              <p className="text-lg leading-8 text-slate-700 sm:text-xl sm:leading-9">
                {structuredCourse.introduction}
              </p>

              <div className="mt-10 space-y-10">
                {structuredCourse.sections.map((section, sectionIndex) => (
                  <section key={`${section.title}-${sectionIndex}`} className="border-t border-slate-200 pt-9">
                    <div className="mb-6 flex items-start gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {sectionIndex + 1}
                      </span>
                      <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                        {section.title}
                      </h2>
                    </div>

                    <div className="space-y-5 text-base leading-8 text-slate-700 sm:text-lg">
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex}>{paragraph}</p>
                      ))}
                    </div>

                    {section.key_points.length > 0 && (
                      <div className="mt-7 rounded-2xl bg-blue-50 p-5 sm:p-6">
                        <h3 className="font-bold text-blue-950">Points à retenir</h3>
                        <ul className="mt-3 space-y-2">
                          {section.key_points.map((point, pointIndex) => (
                            <li key={pointIndex} className="flex gap-3 leading-7 text-blue-950">
                              <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.definitions.length > 0 && (
                      <div className="mt-7 grid gap-4 sm:grid-cols-2">
                        {section.definitions.map((item, definitionIndex) => (
                          <aside key={`${item.term}-${definitionIndex}`} className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
                            <p className="text-sm font-bold uppercase tracking-wide text-purple-700">Définition</p>
                            <h3 className="mt-2 text-lg font-bold text-purple-950">{item.term}</h3>
                            <p className="mt-2 leading-7 text-purple-950">{item.definition}</p>
                          </aside>
                        ))}
                      </div>
                    )}

                    {section.examples.length > 0 && (
                      <div className="mt-7 space-y-3">
                        {section.examples.map((example, exampleIndex) => (
                          <aside key={exampleIndex} className="rounded-2xl border-l-4 border-amber-400 bg-amber-50 p-5 text-amber-950">
                            <p className="text-sm font-bold uppercase tracking-wide text-amber-800">Exemple</p>
                            <p className="mt-2 leading-7">{example}</p>
                          </aside>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {structuredCourse.important_points.length > 0 && (
                <section className="mt-12 rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
                  <h2 className="text-2xl font-bold">L’essentiel du cours</h2>
                  <ul className="mt-5 space-y-3">
                    {structuredCourse.important_points.map((point, pointIndex) => (
                      <li key={pointIndex} className="flex gap-3 leading-7 text-slate-200">
                        <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="mt-10 border-t border-slate-200 pt-9">
                <h2 className="text-2xl font-bold text-slate-950">Conclusion</h2>
                <p className="mt-4 text-base leading-8 text-slate-700 sm:text-lg">
                  {structuredCourse.conclusion}
                </p>
              </section>
            </div>
          ) : (
            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <h2 className="text-xl font-bold text-slate-950">Résumé du cours</h2>
              <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-slate-700 sm:text-lg">
                {cours.summary || "Aucun résumé disponible."}
              </p>
            </div>
          )}
        </article>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-purple-700">Révision</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Fiches de révision</h2>
            </div>
            <form action={createRevisionSheetWithId}>
              <button type="submit" className="w-full rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 sm:w-auto">
                Générer une fiche
              </button>
            </form>
          </div>

          {revisionSheets && revisionSheets.length > 0 ? (
            <div className="space-y-6">
              {revisionSheets.map((sheet) => (
                <article key={sheet.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-8">
                  <h3 className="mb-6 text-2xl font-bold text-slate-950">
                    {cleanRevisionTitle(sheet.title || "Fiche de révision")}
                  </h3>
                  <RevisionSheetContent content={sheet.content || "Aucun contenu."} />
                </article>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">Aucune fiche de révision pour ce cours.</p>
          )}
        </section>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Quiz</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Quiz du cours</h2>
            </div>
            <form action={createQuizWithId}>
              <button type="submit" className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto">
                Générer un quiz
              </button>
            </form>
          </div>

          {quizzes && quizzes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {quizzes.map((quiz) => {
                const score = quiz.score;
                const scoreColor = score === null ? "text-slate-500" : score < 50 ? "text-red-700" : score < 80 ? "text-amber-700" : "text-emerald-700";

                return (
                  <article key={quiz.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-bold text-slate-900">{quiz.title || "Quiz de révision"}</h3>
                    <p className={`mt-2 text-sm font-semibold ${scoreColor}`}>
                      {score === null ? "Pas encore réalisé" : `Dernier score : ${score}%`}
                    </p>
                    <Link href={`/quiz/${quiz.id}`} className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                      Ouvrir le quiz
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500">Aucun quiz pour ce cours pour le moment.</p>
          )}
        </section>
      </div>
    </main>
  );
}
