import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../utils/supabase/server";
import MindMap, {
  type MindMapBranch,
  type MindMapData,
} from "./MindMap";
import styles from "./MindMap.module.css";
import PrintButton from "./PrintButton";

type PageProps = {
  params: Promise<{ id: string }>;
};

type CourseSection = {
  title?: unknown;
  paragraphs?: unknown;
  key_points?: unknown;
  definitions?: unknown;
  examples?: unknown;
};

type Definition = {
  term?: unknown;
  definition?: unknown;
};

function parseJson(value: unknown) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").replace(/^[-–—•]\s*/, "").trim();
}

function useIfShort(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const clean = cleanText(value);
  return clean.length > 0 && clean.length <= maxLength ? clean : null;
}

function isVagueTitle(value: string) {
  const normalized = value.toLocaleLowerCase("fr").trim();
  return normalized === "définition" || normalized === "à retenir" || normalized.includes(" versus ");
}

function stringsFrom(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function structuredMindMap(content: Record<string, unknown>): MindMapData | null {
  if (
    typeof content.title !== "string" ||
    !Array.isArray(content.sections) ||
    content.sections.length < 4 ||
    content.sections.length > 7
  ) {
    return null;
  }

  const branches: MindMapBranch[] = [];

  for (const section of content.sections as CourseSection[]) {
    const title = useIfShort(section.title, 50);
    const definitionEntry = Array.isArray(section.definitions)
      ? (section.definitions as Definition[]).find((item) => typeof item?.definition === "string")
      : undefined;
    const definition = useIfShort(definitionEntry?.definition, 180);
    const rule = stringsFrom(section.key_points).map((item) => useIfShort(item, 160)).find(Boolean);
    const example = stringsFrom(section.examples).map((item) => useIfShort(item, 180)).find(Boolean);

    if (!title || isVagueTitle(title) || !definition || !rule || !example) return null;

    const extraPoint = stringsFrom(section.key_points)
      .slice(1)
      .map((item) => useIfShort(item, 160))
      .find(Boolean);

    branches.push({
      title,
      definition,
      rule,
      example,
      children: extraPoint ? [{ title: "À savoir", content: extraPoint }] : [],
    });
  }

  return {
    centralTopic: cleanText(content.title),
    branches,
  };
}

function getStructuredContent(course: Record<string, unknown>) {
  const directContent = parseJson(course.course_content);
  if (directContent && typeof directContent === "object") {
    return directContent as Record<string, unknown>;
  }

  const legacyResult = parseJson(course.result);
  if (legacyResult && typeof legacyResult === "object" && "course" in legacyResult) {
    const legacyCourse = legacyResult.course;
    return legacyCourse && typeof legacyCourse === "object"
      ? legacyCourse as Record<string, unknown>
      : null;
  }

  return null;
}

export default async function MindMapPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: course } = await supabase
    .from("cours")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!course) redirect("/cours");

  const content = getStructuredContent(course);
  const initialData = content ? structuredMindMap(content) : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <Link href={`/cours/${id}`} className={`${styles.noPrint} text-sm font-semibold text-slate-600 transition hover:text-slate-950`}>
          ← Retour au cours
        </Link>
        <header className={`${styles.noPrint} mb-7 mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between`}>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-violet-700">Carte mentale</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {course.title || "Carte mentale du cours"}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              Une vue synthétique des sections et des notions essentielles du cours.
            </p>
          </div>
          <PrintButton />
        </header>
        <section className={styles.printArea}>
          <h1 className={styles.printTitle}>{course.title || "Carte mentale du cours"}</h1>
        <MindMap
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
