import Link from "next/link";
import { redirect } from "next/navigation";
import PrintButton from "../../../components/PrintButton";
import { getSubscriptionAccess } from "../../../lib/subscription-access";
import { createClient } from "../../../utils/supabase/server";
import QuizForm from "./QuizForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuizDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: quiz } = await supabase
    .from("quiz")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!quiz) redirect("/cours");

  const subscriptionAccess = await getSubscriptionAccess();

  const [questionsResult, courseResult, attemptsResult] = await Promise.all([
    supabase.from("quiz_questions").select("*").eq("quiz_id", id).order("created_at", { ascending: true }),
    supabase.from("cours").select("id, title, detected_chapter").eq("id", quiz.cours_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("user_learning_events").select("score, occurred_at").eq("user_id", user.id).eq("quiz_id", id).eq("event_type", "quiz_completed").order("occurred_at", { ascending: false }),
  ]);
  const questions = questionsResult.data;
  const previousScores = (attemptsResult.data ?? []).map((attempt) => Number(attempt.score)).filter(Number.isFinite);
  const previousBest = previousScores.length > 0 ? Math.max(...previousScores) : null;
  const previousScore = previousScores[0] ?? null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="no-print mb-7 flex items-center justify-between gap-4">
          <Link href={`/cours/${quiz.cours_id}`} className="text-sm font-semibold text-slate-600 hover:text-slate-950">
            ← Retour au cours
          </Link>
          <PrintButton targetId="print-quiz" label="Imprimer le quiz" hasAccess={subscriptionAccess.hasAccess} />
        </div>

        <div id="print-quiz" className="print-document print-quiz">
        <header className="print-only rounded-3xl bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Quiz</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {quiz.title || "Quiz de révision"}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Réponds à chaque question, puis valide le quiz pour découvrir ton score et la correction détaillée.
          </p>
        </header>

        <section className="mt-8">
          {questions && questions.length > 0 ? (
            <QuizForm
              quizId={quiz.id}
              quizTitle={quiz.title || "Quiz de révision"}
              chapter={courseResult.data?.detected_chapter || courseResult.data?.title || "Chapitre"}
              courseHref={`/cours/${quiz.cours_id}`}
              questions={questions}
              previousBest={previousBest}
              previousScore={previousScore}
            />
          ) : (
            <div className="rounded-3xl bg-white p-8 text-lg text-slate-500 shadow-sm ring-1 ring-slate-200">
              Aucune question trouvée pour ce quiz.
            </div>
          )}
        </section>
        </div>
      </div>
    </main>
  );
}
