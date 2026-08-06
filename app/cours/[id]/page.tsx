import Link from "next/link";
import { redirect } from "next/navigation";
import PrintButton from "../../../components/PrintButton";
import SubscriptionRequiredDialog from "../../../components/SubscriptionRequiredDialog";
import { getSubscriptionAccess } from "../../../lib/subscription-access";
import { createClient } from "../../../utils/supabase/server";
import RevisionSheetContent, {
  cleanRevisionTitle,
} from "./RevisionSheetContent";
import { createQuiz, createRevisionSheet, deleteCours } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subscription?: string }>;
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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeStructuredCourse(value: unknown): StructuredCourse | null {
  if (!value || typeof value !== "object" || !("sections" in value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const rawSections = Array.isArray(source.sections) ? source.sections : [];
  const sections = rawSections
    .filter((section): section is Record<string, unknown> => Boolean(section) && typeof section === "object")
    .map((section) => ({
      title: typeof section.title === "string" ? section.title : "Section",
      paragraphs: asStringArray(section.paragraphs),
      key_points: asStringArray(section.key_points),
      definitions: Array.isArray(section.definitions)
        ? section.definitions
            .filter((definition): definition is Record<string, unknown> => Boolean(definition) && typeof definition === "object")
            .map((definition) => ({
              term: typeof definition.term === "string" ? definition.term : "Notion",
              definition: typeof definition.definition === "string" ? definition.definition : "",
            }))
            .filter((definition) => definition.definition)
        : [],
      examples: asStringArray(section.examples),
    }));

  if (sections.length === 0) return null;

  return {
    title: typeof source.title === "string" ? source.title : "Cours",
    introduction: typeof source.introduction === "string" ? source.introduction : "",
    sections,
    important_points: asStringArray(source.important_points),
    conclusion: typeof source.conclusion === "string" ? source.conclusion : "",
  };
}

function getStructuredCourse(
  courseContent: unknown,
  legacyResult: unknown
): StructuredCourse | null {
  const source = courseContent || legacyResult;

  if (!source) return null;

  try {
    const parsed = typeof source === "string" ? JSON.parse(source) : source;

    if (courseContent) {
      return normalizeStructuredCourse(parsed);
    }

    if (!parsed || typeof parsed !== "object" || !("course" in parsed)) {
      return null;
    }

    return normalizeStructuredCourse(parsed.course);
  } catch {
    return null;
  }
}

export default async function CoursDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { subscription } = await searchParams;
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

  const subscriptionAccess = await getSubscriptionAccess();

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

  const structuredCourse = getStructuredCourse(
    cours.course_content,
    cours.result
  );
  const deleteCoursWithId = deleteCours.bind(null, id);
  const createQuizWithId = createQuiz.bind(null, id);
  const createRevisionSheetWithId = createRevisionSheet.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <SubscriptionRequiredDialog open={subscription === "required"} />
      <div className="mx-auto max-w-5xl">
        <div className="no-print mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/cours" className="text-sm font-semibold text-slate-600 hover:text-slate-950">
            ← Retour aux cours
          </Link>
          <form action={deleteCoursWithId}>
            <button type="submit" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100">
              Supprimer le cours
            </button>
          </form>
        </div>

        <article id="print-course" className="print-document print-course overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
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
            <div className="print-hide mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/cours/${id}/carte-mentale`}
              className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-700"
            >
              Générer une carte mentale
            </Link>
              <PrintButton targetId="print-course" strategy="in-place" hasAccess={subscriptionAccess.hasAccess} />
            </div>
          </header>

          {structuredCourse ? (
            <div className="px-6 py-8 sm:px-10 sm:py-12">
              <p className="text-lg leading-8 text-slate-700 sm:text-xl sm:leading-9">
                {structuredCourse.introduction}
              </p>

              <div className="mt-10 space-y-10">
                {structuredCourse.sections.map((section, sectionIndex) => (
                  <section key={`${section.title}-${sectionIndex}`} className="print-course-section border-t border-slate-200 pt-9">
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
                      <div className="print-keep mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
                        <h3 className="font-bold text-amber-950">Points importants</h3>
                        <ul className="mt-3 space-y-2">
                          {section.key_points.map((point, pointIndex) => (
                            <li key={pointIndex} className="flex gap-3 leading-7 text-amber-950">
                              <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.definitions.length > 0 && (
                      <div className="mt-7 grid gap-4 sm:grid-cols-2">
                        {section.definitions.map((item, definitionIndex) => (
                          <aside key={`${item.term}-${definitionIndex}`} className="rounded-2xl border border-red-100 bg-red-50/70 p-5 shadow-sm">
                            <p className="text-sm font-bold uppercase tracking-wide text-red-700">Définition</p>
                            <h3 className="mt-2 text-lg font-bold text-red-950">{item.term}</h3>
                            <p className="mt-2 leading-7 text-red-950">{item.definition}</p>
                          </aside>
                        ))}
                      </div>
                    )}

                    {section.examples.length > 0 && (
                      <div className="mt-7 space-y-3">
                        {section.examples.map((example, exampleIndex) => (
                          <aside key={exampleIndex} className="rounded-2xl border border-blue-200 border-l-4 border-l-blue-500 bg-blue-50 p-5 text-blue-950 shadow-sm">
                            <p className="text-sm font-bold uppercase tracking-wide text-blue-800">Exemple</p>
                            <p className="mt-2 leading-7">{example}</p>
                          </aside>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {structuredCourse.important_points.length > 0 && (
                <section className="print-keep mt-12 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm sm:p-8">
                  <h2 className="text-2xl font-bold">L’essentiel du cours</h2>
                  <ul className="mt-5 space-y-3">
                    {structuredCourse.important_points.map((point, pointIndex) => (
                      <li key={pointIndex} className="flex gap-3 leading-7 text-amber-950">
                        <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="print-course-conclusion mt-10 border-t border-slate-200 pt-9">
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

        <section className="revision-section mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="revision-list space-y-6">
              {revisionSheets.map((sheet) => (
                <article id={`print-sheet-${sheet.id}`} key={sheet.id} className="print-document print-revision rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-8">
                  <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-2xl font-bold text-slate-950">
                    {cleanRevisionTitle(sheet.title || "Fiche de révision")}
                  </h3>
                    <PrintButton targetId={`print-sheet-${sheet.id}`} strategy="in-place" hasAccess={subscriptionAccess.hasAccess} />
                  </header>
                  <RevisionSheetContent content={sheet.content || "Aucun contenu."} />
                </article>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">Aucune fiche de révision pour ce cours.</p>
          )}
        </section>

        <section className="course-quiz-section mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
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
