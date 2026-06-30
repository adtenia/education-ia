import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../utils/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MatierePage({ params }: PageProps) {
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
    .select("id, name")
    .eq("id", id)
    .single();

  if (!subject) {
    redirect("/cours");
  }

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, title")
    .eq("subject_id", id)
    .order("title");

  const { data: cours } = await supabase
    .from("cours")
    .select(`
      id,
      title,
      file_name,
      chapter_id,
      created_at
    `)
    .eq("user_id", user.id)
    .eq("subject_id", id);

  const chaptersWithCourses =
    chapters?.filter((chapter) =>
      cours?.some((course) => course.chapter_id === chapter.id)
    ) || [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-violet-50 to-blue-50 p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/cours"
          className="mb-6 inline-block text-sm font-semibold text-violet-600 hover:text-violet-800"
        >
          ← Retour aux matières
        </Link>

        <div className="mb-8 rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-violet-600">Matière</p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            📚 {subject.name}
          </h1>

          <p className="mt-3 text-gray-600">
            Voici les chapitres où tu as déjà importé des cours.
          </p>
        </div>

        {chaptersWithCourses.length > 0 ? (
          <div className="space-y-6">
            {chaptersWithCourses.map((chapter) => {
              const chapterCourses =
                cours?.filter((course) => course.chapter_id === chapter.id) ||
                [];

              return (
                <div
                  key={chapter.id}
                  className="rounded-3xl bg-white p-6 shadow-sm"
                >
                  <h2 className="mb-4 text-2xl font-bold text-gray-900">
                    📂 {chapter.title}
                  </h2>

                  <div className="space-y-3">
                    {chapterCourses.map((course) => (
                      <Link
                        key={course.id}
                        href={`/cours/${course.id}`}
                        className="block rounded-2xl border border-gray-200 p-4 transition hover:bg-violet-50"
                      >
                        <div className="font-semibold text-gray-900">
                          {course.title || course.file_name || "Cours"}
                        </div>

                        <div className="mt-1 text-sm text-gray-500">
                          Ouvrir le cours →
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Aucun cours dans cette matière
            </h2>

            <p className="mt-3 text-gray-600">
              Importe un cours, et son chapitre apparaîtra ici automatiquement.
            </p>

            <Link
              href="/import"
              className="mt-6 inline-block rounded-2xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700"
            >
              Importer un cours
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}