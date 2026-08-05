import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";

export default async function CoursPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, slug")
    .order("name");

  const { data: progress } = await supabase
    .from("progress")
    .select("subject_id, mastery_percent")
    .eq("user_id", user.id);

  const { data: cours } = await supabase
    .from("cours")
    .select("subject_id")
    .eq("user_id", user.id);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl border border-violet-100 bg-gradient-to-br from-white to-violet-50 p-6 shadow-sm sm:p-9">
          <p className="text-sm font-bold uppercase tracking-widest text-violet-700">Bibliothèque</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Mes cours
          </h1>

          <p className="mt-3 text-gray-600">
            Choisis une matière pour voir tes chapitres et tes cours.
          </p>

          <div className="mt-6">
            <Link
              href="/import"
              className="inline-flex rounded-xl bg-violet-600 px-5 py-3 font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-700"
            >
              + Importer un cours
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Progression par matière
          </h2>

          {subjects && subjects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {subjects.map((subject) => {
                const subjectProgress = progress?.find(
                  (item) => item.subject_id === subject.id
                );

                const mastery = subjectProgress?.mastery_percent ?? 0;

                const coursCount =
                  cours?.filter((item) => item.subject_id === subject.id)
                    .length ?? 0;

                return (
                  <Link
                    key={subject.id}
                    href={`/cours/matiere/${subject.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">
                        {subject.name}
                      </h3>

                      <span className="text-sm font-semibold text-violet-600">
                        {mastery}%
                      </span>
                    </div>

                    <div className="mt-4 h-3 w-full rounded-full bg-gray-100">
                      <div
                        className="h-3 rounded-full bg-violet-600"
                        style={{ width: `${mastery}%` }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                      <span>
                        {coursCount} cours importé{coursCount > 1 ? "s" : ""}
                      </span>
                      <span>Voir les chapitres →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">
              Aucune matière trouvée.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
