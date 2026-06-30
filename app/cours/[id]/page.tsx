import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";
import {
  createQuiz,
  createRevisionSheet,
  deleteCours,
} from "./actions";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CoursDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: cours } = await supabase
    .from("cours")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!cours) {
    redirect("/cours");
  }

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

  const deleteCoursWithId = deleteCours.bind(null, id);
  const createQuizWithId = createQuiz.bind(null, id);
  const createRevisionSheetWithId =
  createRevisionSheet.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/cours"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Retour aux cours
          </Link>

          <form action={deleteCoursWithId}>
            <button
              type="submit"
              className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
            >
              Supprimer le cours
            </button>
          </form>
        </div>

        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="mb-2 text-sm font-medium text-blue-600">Cours</p>

          <h1 className="mb-4 text-3xl font-bold text-slate-950">
            {cours.title || "Cours sans titre"}
          </h1>

       <div className="space-y-4">
  <div className="rounded-xl bg-blue-50 p-4">
    <p className="text-sm font-semibold text-blue-700">📚 Matière</p>
    <p>{cours.detected_subject || "Non détectée"}</p>
  </div>

  <div className="rounded-xl bg-purple-50 p-4">
    <p className="text-sm font-semibold text-purple-700">📖 Chapitre</p>
    <p>{cours.detected_chapter || "Non détecté"}</p>
  </div>

  <div className="rounded-xl bg-slate-50 p-4">
    <p className="mb-2 text-sm font-semibold text-slate-700">
      📝 Résumé généré par l'IA
    </p>

    <div className="whitespace-pre-wrap text-slate-700">
      {cours.summary || "Aucun résumé disponible."}
    </div>
  </div>
</div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
         <div className="mb-5 flex items-center justify-between">
  <div>
    <p className="text-sm font-medium text-purple-600">
      Révision
    </p>

    <h2 className="text-2xl font-bold text-slate-950">
      Fiches de révision
    </h2>
  </div>

  <form action={createRevisionSheetWithId}>
    <button
      type="submit"
      className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
    >
      Générer une fiche
    </button>
  </form>
</div>

          {revisionSheets && revisionSheets.length > 0 ? (
            <div className="space-y-4">
              {revisionSheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <h3 className="mb-2 font-semibold text-slate-900">
                    {sheet.title || "Fiche de révision"}
                  </h3>

                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {sheet.content || "Aucun contenu."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">
              Aucune fiche de révision pour ce cours.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600">Quiz</p>
              <h2 className="text-2xl font-bold text-slate-950">
                Quiz du cours
              </h2>
            </div>

            <form action={createQuizWithId}>
              <button
                type="submit"
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Générer un quiz
              </button>
            </form>
          </div>

          {quizzes && quizzes.length > 0 ? (
            <div className="space-y-4">
              {quizzes.map((quiz) => {
                const score = quiz.score;

                const scoreColor =
                  score === null
                    ? "text-slate-500"
                    : score < 50
                    ? "text-red-600"
                    : score < 80
                    ? "text-orange-500"
                    : "text-emerald-600";

                return (
                  <div
                    key={quiz.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <h3 className="font-semibold text-slate-900">
                      {quiz.title || "Quiz de révision"}
                    </h3>

                    <p className={`mt-1 text-sm font-semibold ${scoreColor}`}>
                      {score === null
                        ? "Pas encore réalisé"
                        : `Dernier score : ${score}%`}
                    </p>

                    <Link
                      href={`/quiz/${quiz.id}`}
                      className="mt-4 inline-block rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Ouvrir le quiz
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500">
              Aucun quiz pour ce cours pour le moment.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}