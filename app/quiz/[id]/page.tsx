import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";
import QuizForm from "./QuizForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function QuizDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: quiz } = await supabase
    .from("quiz")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!quiz) {
    redirect("/cours");
  }

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", id)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href={`/cours/${quiz.cours_id}`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Retour au cours
          </Link>
        </div>

        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="mb-2 text-sm font-medium text-emerald-600">Quiz</p>

          <h1 className="text-3xl font-bold text-slate-950">
            {quiz.title || "Quiz de révision"}
          </h1>

          <p className="mt-3 text-slate-500">
            Réponds aux questions puis clique sur Valider.
          </p>
        </section>

        <section className="mt-8">
          {questions && questions.length > 0 ? (
            <QuizForm quizId={quiz.id} questions={questions} />
          ) : (
            <div className="rounded-3xl bg-white p-8 text-slate-500 shadow-sm ring-1 ring-slate-200">
              Aucune question trouvée pour ce quiz.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}