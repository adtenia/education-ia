import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";

export default async function SubjectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subjects } = await supabase
    .from("subjects")
    .select(`
      id,
      name,
      slug,
      progress (
        mastery_percent
      ),
      cours (
        id
      )
    `)
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-violet-50 to-blue-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-violet-600">
              Education IA
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
              Mes matières
            </h1>

            <p className="mt-3 text-gray-600">
              Choisis une matière pour voir tes cours et ta progression.
            </p>
          </div>

          <Link
            href="/import"
            className="rounded-full bg-violet-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            Importer
          </Link>
        </div>

        {subjects && subjects.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {subjects.map((subject) => {
              const userProgress = subject.progress?.[0];
              const mastery = userProgress?.mastery_percent ?? 0;
              const coursCount = subject.cours?.length ?? 0;

              const color =
                mastery >= 80
                  ? "text-green-600"
                  : mastery >= 50
                  ? "text-orange-500"
                  : "text-red-600";

              return (
                <Link
                  key={subject.id}
                  href={`/subjects/${subject.id}`}
                  className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <p className="text-sm font-semibold text-violet-600">
                    Matière
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-gray-900">
                    📘 {subject.name}
                  </h2>

                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                    <span className="text-gray-600">Progression</span>
                    <span className={`font-bold ${color}`}>
                      {mastery}%
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                    <span className="text-gray-600">Cours</span>
                    <span className="font-bold text-gray-900">
                      {coursCount}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-gray-200 bg-white/80 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Aucune matière trouvée
            </h2>
          </div>
        )}
      </div>
    </main>
  );
}