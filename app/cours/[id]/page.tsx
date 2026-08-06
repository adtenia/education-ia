import Link from "next/link";
import { redirect } from "next/navigation";
import PrintButton from "../../../components/PrintButton";
import SubscriptionRequiredDialog from "../../../components/SubscriptionRequiredDialog";
import { getSubscriptionAccess } from "../../../lib/subscription-access";
import { createClient } from "../../../utils/supabase/server";
import RevisionSheetContent, {
  cleanRevisionTitle,
} from "./RevisionSheetContent";
import StructuredCourseContent, {
  type StructuredCourse,
} from "./StructuredCourseContent";
import SummaryContent from "./SummaryContent";
import { createQuiz, createRevisionSheet, deleteCours } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subscription?: string }>;
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
      shortIntro: typeof section.short_intro === "string" ? section.short_intro : "",
      paragraphs: asStringArray(section.paragraphs),
      keyPoints: asStringArray(section.key_points),
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
      formulas: Array.isArray(section.formulas)
        ? section.formulas.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").map((item) => ({
            expression: typeof item.expression === "string" ? item.expression : "",
            explanation: typeof item.explanation === "string" ? item.explanation : "",
          })).filter((item) => item.expression)
        : [],
      dates: Array.isArray(section.dates)
        ? section.dates.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").map((item) => ({
            date: typeof item.date === "string" ? item.date : "",
            event: typeof item.event === "string" ? item.event : "",
          })).filter((item) => item.date && item.event)
        : [],
      commonMistakes: asStringArray(section.common_mistakes),
      examTips: asStringArray(section.exam_tips),
    }));

  if (sections.length === 0) return null;

  const rawOverview = source.summary_overview && typeof source.summary_overview === "object"
    ? source.summary_overview as Record<string, unknown>
    : null;
  const editorialSections = rawOverview && Array.isArray(rawOverview.sections)
    ? rawOverview.sections
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          title: typeof item.title === "string" ? item.title : "Partie essentielle",
          paragraphs: asStringArray(item.paragraphs),
          definition: typeof item.definition === "string" ? item.definition : "",
          example: typeof item.example === "string" ? item.example : "",
        }))
        .filter((item) => item.paragraphs.length > 0)
    : [];
  const legacyIdeas = rawOverview && Array.isArray(rawOverview.essential_ideas)
    ? rawOverview.essential_ideas
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          title: typeof item.title === "string" ? item.title : "Idée essentielle",
          paragraphs: typeof item.explanation === "string" && item.explanation ? [item.explanation] : [],
          definition: "",
          example: typeof item.example === "string" ? item.example : "",
        }))
        .filter((item) => item.paragraphs.length > 0)
    : [];
  const overviewSections = editorialSections.length > 0 ? editorialSections : legacyIdeas;
  const summaryOverview = rawOverview && overviewSections.length > 0
    ? {
        introduction: typeof rawOverview.introduction === "string"
          ? rawOverview.introduction
          : typeof rawOverview.hook === "string" ? rawOverview.hook : "",
        sections: overviewSections,
        mustRemember: asStringArray(rawOverview.must_remember).slice(0, 5),
        commonMistakes: asStringArray(rawOverview.common_mistakes).slice(0, 5),
        conclusion: typeof rawOverview.conclusion === "string" ? rawOverview.conclusion : "",
      }
    : null;

  return {
    title: typeof source.title === "string" ? source.title : "Cours",
    introduction: typeof source.introduction === "string" ? source.introduction : "",
    summaryOverview,
    sections,
    importantPoints: asStringArray(source.important_points),
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
            <>
              <SummaryContent summary={cours.summary || ""} overview={structuredCourse.summaryOverview} />
              <div className="border-t border-slate-200">
                <StructuredCourseContent course={structuredCourse} />
              </div>
            </>
          ) : (
            <SummaryContent summary={cours.summary || "Aucun résumé disponible."} />
          )}
        </article>

        <section className="revision-section mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-purple-700">Révision</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Carnets de révision</h2>
            </div>
            <form action={createRevisionSheetWithId}>
              <button type="submit" className="w-full rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 sm:w-auto">
                Créer un carnet
              </button>
            </form>
          </div>

          {revisionSheets && revisionSheets.length > 0 ? (
            <div className="revision-list space-y-6">
              {revisionSheets.map((sheet) => (
                <article id={`print-sheet-${sheet.id}`} key={sheet.id} className="print-document print-revision rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-8">
                  <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-2xl font-bold text-slate-950">
                    {cleanRevisionTitle(sheet.title || "Carnet de révision")}
                  </h3>
                    <PrintButton targetId={`print-sheet-${sheet.id}`} strategy="in-place" hasAccess={subscriptionAccess.hasAccess} />
                  </header>
                  <RevisionSheetContent content={sheet.content || "Aucun contenu."} />
                </article>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">Aucun carnet de révision pour ce cours.</p>
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
