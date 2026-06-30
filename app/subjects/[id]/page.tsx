import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SubjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, slug")
    .eq("id", id)
    .single();

  if (!subject) {
    redirect("/subjects");
  }

  const { data: cours } = await supabase
    .from("cours")
    .select("id, title, file_name, created_at, detected_chapter")
    .eq("user_id", user.id)
    .eq("subject_id", id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-violet-50 to-blue-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/subjects"
              className="text-sm font-semibold text-violet-600 hover:text-violet-800"
            >
              ← Retour aux matières
            </Link>

            <h1 className="mt-4 text-4xl font-bold text-gray-900">
              {subject.name}
            </h1>

            <p className="mt-3 text-gray-600">
              Voici tous les cours importés dans cette matière.
            </p>
          </div>

          <Link
            href="/import"
            className="rounded-full bg-violet-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            Importer un cours
          </Link>
        </div>

        {cours && cours.length > 0 ? (
          <div className="grid gap-5">
            {cours.map((course) => (
              <Link
                key={course.id}
                href={`/cours/${course.id}`}
                className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-violet-600">
                      📄 Cours
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-gray-900">
                      {course.title || course.file_name || "Cours sans titre"}
                    </h2>

                    <p className="mt-2 text-gray-600">
                      Chapitre :{" "}
                      <span className="font-semibold text-gray-800">
                        {course.detected_chapter || "Non détecté"}
                      </span>
                    </p>
                  </div>

                  <span className="rounded-full bg-violet-100 px-5 py-2 text-sm font-semibold text-violet-700">
                    Ouvrir →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-gray-200 bg-white/80 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Aucun cours dans cette matière
            </h2>

            <p className="mt-3 text-gray-600">
              Importe un cours pour commencer à apprendre avec Education IA.
            </p>

            <Link
              href="/import"
              className="mt-6 inline-block rounded-full bg-violet-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              Importer mon premier cours
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}