import Link from "next/link";
import { redirect } from "next/navigation";
import DailyActivity from "../../components/progression/DailyActivity";
import ProgressChart from "../../components/progression/ProgressChart";
import ProgressionTestControls from "../../components/progression/ProgressionTestControls";
import ProgressStats from "../../components/progression/ProgressStats";
import QuizHistory from "../../components/progression/QuizHistory";
import RecentActivity from "../../components/progression/RecentActivity";
import Strengths from "../../components/progression/Strengths";
import WeakPoints from "../../components/progression/WeakPoints";
import type {
  DailyActivityView,
  ProgressChartPoint,
  ProgressSummary,
  QuizAttemptView,
  RecentActivityView,
  TopicProgressView,
  WeakPointView,
} from "../../types/progression-page";
import { createClient } from "../../utils/supabase/server";

export const dynamic = "force-dynamic";

type RawEvent = {
  id: string;
  event_type: string;
  course_id: string | null;
  quiz_id: string | null;
  score: number | string | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
};

type RawDailyActivity = {
  activity_date: string;
  events_count: number;
};

type RawTopicProgress = {
  topic_key: string;
  topic: string | null;
  answered_questions: number | string;
  error_count: number | string;
  success_rate: number | string;
  distinct_attempts: number | string;
  last_error_at: string | null;
  last_success_at: string | null;
  learning_status: "insufficient_data" | "needs_review" | "strength" | "developing";
};

const activityLabels: Record<string, string> = {
  course_generated: "Cours généré",
  revision_sheet_generated: "Fiche de révision créée",
  mind_map_generated: "Carte mentale générée",
  quiz_completed: "Quiz terminé",
  revision_session_completed: "Session de révision terminée",
};

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function metadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function ProgressionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/progression");

  const today = new Date();
  const firstDay = new Date(today);
  firstDay.setUTCDate(firstDay.getUTCDate() - 13);

  const [statsResult, eventsResult, dailyResult, topicsResult] = await Promise.all([
    supabase
      .from("user_progress_stats")
      .select("total_courses, total_quizzes, total_revision_sheets, total_mind_maps, average_quiz_score, best_quiz_score, active_days, current_streak, longest_streak")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_learning_events")
      .select("id, event_type, course_id, quiz_id, score, metadata, occurred_at")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("user_daily_activity")
      .select("activity_date, events_count")
      .eq("user_id", user.id)
      .gte("activity_date", dateKey(firstDay))
      .order("activity_date", { ascending: true }),
    supabase
      .from("user_topic_progress")
      .select("topic_key, topic, answered_questions, error_count, success_rate, distinct_attempts, last_error_at, last_success_at, learning_status")
      .eq("user_id", user.id),
  ]);

  if (statsResult.error) console.error("[progression] statistiques indisponibles", statsResult.error.code);
  if (eventsResult.error) console.error("[progression] événements indisponibles", eventsResult.error.code);
  if (dailyResult.error) console.error("[progression] activité quotidienne indisponible", dailyResult.error.code);
  if (topicsResult.error) console.error("[progression] analyse des notions indisponible", topicsResult.error.code);

  const rawEvents = (eventsResult.data ?? []) as RawEvent[];
  const courseIds = [...new Set(rawEvents.map((event) => event.course_id).filter((id): id is string => Boolean(id)))];
  const quizIds = [...new Set(rawEvents.map((event) => event.quiz_id).filter((id): id is string => Boolean(id)))];

  const [coursesResult, quizzesResult] = await Promise.all([
    courseIds.length > 0
      ? supabase.from("cours").select("id, title, detected_chapter").eq("user_id", user.id).in("id", courseIds)
      : Promise.resolve({ data: [], error: null }),
    quizIds.length > 0
      ? supabase.from("quiz").select("id, title, cours_id").eq("user_id", user.id).in("id", quizIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const courseTitles = new Map(
    (coursesResult.data ?? []).map((course) => [
      course.id,
      course.title || course.detected_chapter || "Cours sans titre",
    ])
  );
  const quizRows = new Map((quizzesResult.data ?? []).map((quiz) => [quiz.id, quiz]));

  const chronologicalQuizEvents = rawEvents
    .filter((event) => event.event_type === "quiz_completed" && nullableNumber(event.score) !== null)
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  const attemptState = new Map<string, { count: number; previousScore: number | null }>();

  const chronologicalAttempts: QuizAttemptView[] = chronologicalQuizEvents.map((event) => {
    const key = event.quiz_id || `course:${event.course_id || event.id}`;
    const previous = attemptState.get(key) || { count: 0, previousScore: null };
    const score = nullableNumber(event.score) ?? 0;
    const quiz = event.quiz_id ? quizRows.get(event.quiz_id) : undefined;
    const courseId = event.course_id || quiz?.cours_id || null;
    const courseTitle =
      (courseId ? courseTitles.get(courseId) || null : null) ||
      metadataText(event.metadata, "course_title");
    const attempt: QuizAttemptView = {
      id: event.id,
      quizId: event.quiz_id,
      title: quiz?.title || metadataText(event.metadata, "quiz_title") || courseTitle || "Quiz de révision",
      courseTitle,
      score,
      occurredAt: event.occurred_at,
      attemptNumber: previous.count + 1,
      delta: previous.previousScore === null ? null : Math.round(score - previous.previousScore),
    };
    attemptState.set(key, { count: attempt.attemptNumber, previousScore: score });
    return attempt;
  });

  const attempts = [...chronologicalAttempts].reverse();
  const chartPoints: ProgressChartPoint[] = chronologicalAttempts.slice(-12).map((attempt, index) => ({
    id: attempt.id,
    label: `#${Math.max(1, chronologicalAttempts.length - 11) + index}`,
    score: attempt.score,
  }));

  const recentActivities: RecentActivityView[] = rawEvents
    .filter((event) => activityLabels[event.event_type])
    .slice(0, 10)
    .map((event) => {
      const quiz = event.quiz_id ? quizRows.get(event.quiz_id) : undefined;
      const courseTitle =
        (event.course_id ? courseTitles.get(event.course_id) || null : null) ||
        metadataText(event.metadata, "course_title");
      return {
        id: event.id,
        label: activityLabels[event.event_type],
        detail:
          quiz?.title ||
          metadataText(event.metadata, "quiz_title") ||
          metadataText(event.metadata, "revision_sheet_title") ||
          courseTitle,
        occurredAt: event.occurred_at,
      };
    });

  const dailyRows = new Map(
    ((dailyResult.data ?? []) as RawDailyActivity[]).map((day) => [day.activity_date, day.events_count])
  );
  const dayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" });
  const days: DailyActivityView[] = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(firstDay);
    date.setUTCDate(firstDay.getUTCDate() + index);
    const key = dateKey(date);
    const eventsCount = dailyRows.get(key) ?? 0;
    return { date: key, label: dayFormatter.format(date).replace(".", ""), eventsCount, active: eventsCount > 0 };
  });

  const weakGroups = new Map<string, QuizAttemptView[]>();
  chronologicalAttempts.forEach((attempt) => {
    const key = attempt.quizId || attempt.id;
    weakGroups.set(key, [...(weakGroups.get(key) ?? []), attempt]);
  });
  const overallQuizAverage = chronologicalAttempts.length
    ? chronologicalAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / chronologicalAttempts.length
    : null;
  const weakPoints: WeakPointView[] = [...weakGroups.entries()]
    .map(([key, group]) => {
      const latest = group[group.length - 1];
      return {
        key,
        title: latest.title,
        courseTitle: latest.courseTitle,
        averageScore: group.reduce((sum, attempt) => sum + attempt.score, 0) / group.length,
        latestScore: latest.score,
        attemptsCount: group.length,
      };
    })
    .filter((item) => overallQuizAverage !== null && item.averageScore < overallQuizAverage)
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, 5);

  const topicRows = (topicsResult.data ?? []) as RawTopicProgress[];
  const topicView = (topic: RawTopicProgress): TopicProgressView => ({
    key: topic.topic_key,
    title: topic.topic || topic.topic_key.replaceAll("_", " "),
    answeredQuestions: numberValue(topic.answered_questions),
    errorCount: numberValue(topic.error_count),
    successRate: numberValue(topic.success_rate),
    distinctAttempts: numberValue(topic.distinct_attempts),
    lastErrorAt: topic.last_error_at,
    lastSuccessAt: topic.last_success_at,
  });
  const hasTopicAnalysis = topicRows.some((topic) => numberValue(topic.answered_questions) >= 3);
  const weakTopics = topicRows
    .filter((topic) => topic.learning_status === "needs_review")
    .sort((a, b) => numberValue(a.success_rate) - numberValue(b.success_rate))
    .slice(0, 5)
    .map(topicView);
  const strongTopics = topicRows
    .filter((topic) => topic.learning_status === "strength")
    .sort((a, b) => numberValue(b.success_rate) - numberValue(a.success_rate))
    .slice(0, 5)
    .map(topicView);

  const rawStats = statsResult.data;
  const stats: ProgressSummary = {
    totalCourses: numberValue(rawStats?.total_courses),
    totalQuizzes: numberValue(rawStats?.total_quizzes),
    totalRevisionSheets: numberValue(rawStats?.total_revision_sheets),
    totalMindMaps: numberValue(rawStats?.total_mind_maps),
    averageQuizScore: nullableNumber(rawStats?.average_quiz_score),
    bestQuizScore: nullableNumber(rawStats?.best_quiz_score),
    activeDays: numberValue(rawStats?.active_days),
    currentStreak: numberValue(rawStats?.current_streak),
    longestStreak: numberValue(rawStats?.longest_streak),
  };
  const hasData = rawEvents.length > 0 || stats.totalCourses + stats.totalQuizzes + stats.totalRevisionSheets + stats.totalMindMaps > 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfaff] px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_5%,rgba(139,92,246,0.16),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(59,130,246,0.12),transparent_26%),linear-gradient(180deg,#ffffff,#faf8ff)]" />
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard" className="text-sm font-bold text-slate-500 transition hover:text-violet-700">← Retour à mes cours</Link>
            <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-violet-600">Espace élève</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Ma progression</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">Retrouve tes activités, tes résultats et les priorités à travailler.</p>
          </div>
          <Link href="/import" className="inline-flex justify-center rounded-2xl bg-violet-600 px-6 py-4 font-black text-white shadow-lg shadow-violet-600/25 transition hover:-translate-y-0.5 hover:bg-violet-700">Créer un nouveau cours</Link>
        </header>

        {process.env.NODE_ENV === "development" && <div className="mt-7"><ProgressionTestControls /></div>}

        {!hasData ? (
          <section className="mt-12 rounded-[2.5rem] border border-dashed border-violet-200 bg-white/90 px-6 py-20 text-center shadow-sm">
            <h2 className="text-2xl font-black sm:text-3xl">Commence à réviser pour voir ta progression ici.</h2>
            <Link href="/import" className="mt-7 inline-flex rounded-2xl bg-violet-600 px-7 py-4 font-black text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700">Créer mon premier cours</Link>
          </section>
        ) : (
          <div className="mt-12 space-y-8">
            <ProgressStats stats={stats} />
            <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]"><ProgressChart points={chartPoints} /><DailyActivity days={days} /></div>
            <QuizHistory attempts={attempts} />
            <div className="grid gap-8 xl:grid-cols-2"><WeakPoints topics={weakTopics} fallbackItems={weakPoints} useTopicAnalysis={hasTopicAnalysis} /><Strengths topics={strongTopics} /></div>
            <RecentActivity activities={recentActivities} />
          </div>
        )}
      </div>
    </main>
  );
}
