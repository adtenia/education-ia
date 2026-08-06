import Link from "next/link";
import { redirect } from "next/navigation";
import { getSubscriptionAccess } from "../../../../lib/subscription-access";
import { createClient } from "../../../../utils/supabase/server";
import MindMap, { type MindMapData } from "./MindMap";
import styles from "./MindMap.module.css";
import PrintButton from "./PrintButton";

type PageProps = {
  params: Promise<{ id: string }>;
};

function parseJson(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getStructuredContent(course: Record<string, unknown>) {
  const directContent = parseJson(course.course_content);
  if (directContent && typeof directContent === "object") return directContent as Record<string, unknown>;

  const legacyResult = parseJson(course.result);
  if (legacyResult && typeof legacyResult === "object" && "course" in legacyResult) {
    const legacyCourse = legacyResult.course;
    return legacyCourse && typeof legacyCourse === "object" ? legacyCourse as Record<string, unknown> : null;
  }
  return null;
}

function savedMindMap(value: unknown): MindMapData | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.centralTopic !== "string" || !Array.isArray(candidate.branches)) return null;
  return candidate as unknown as MindMapData;
}

export default async function MindMapPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subscription = await getSubscriptionAccess();
  if (!subscription.hasAccess) redirect(`/cours/${id}?subscription=required`);

  const { data: course } = await supabase
    .from("cours")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!course) redirect("/cours");

  const { data: persistedMap, error: persistedMapError } = await supabase
    .from("mind_maps")
    .select("data")
    .eq("course_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (persistedMapError) console.error("[mind-map] chargement impossible", { code: persistedMapError.code });

  const content = getStructuredContent(course);
  const initialData = savedMindMap(persistedMap?.data);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <Link href={`/cours/${id}`} className={`${styles.noPrint} text-sm font-semibold text-slate-600 transition hover:text-slate-950`}>
          ← Retour au cours
        </Link>
        <header className={`${styles.noPrint} mb-7 mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between`}>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-violet-700">Carte mentale</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">{course.title || "Carte mentale du cours"}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">Une vue synthétique des sections et des notions essentielles du cours.</p>
          </div>
          <PrintButton />
        </header>
        <section className={styles.printArea}>
          <h1 className={styles.printTitle}>{course.title || "Carte mentale du cours"}</h1>
          <MindMap
            courseId={id}
            initialData={initialData}
            fallbackTitle={course.title || "Cours"}
            fallbackSummary={course.summary || ""}
            fallbackCourse={content}
          />
        </section>
      </div>
    </main>
  );
}
