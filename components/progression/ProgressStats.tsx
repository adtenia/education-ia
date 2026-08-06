import type { ProgressSummary } from "../../types/progression-page";

type ProgressStatsProps = { stats: ProgressSummary };

export default function ProgressStats({ stats }: ProgressStatsProps) {
  const cards = [
    ["Cours générés", stats.totalCourses.toString()],
    ["Quiz terminés", stats.totalQuizzes.toString()],
    ["Fiches créées", stats.totalRevisionSheets.toString()],
    ["Cartes mentales", stats.totalMindMaps.toString()],
    ["Moyenne des quiz", stats.averageQuizScore === null ? "—" : `${Math.round(stats.averageQuizScore)} %`],
    ["Meilleure note", stats.bestQuizScore === null ? "—" : `${Math.round(stats.bestQuizScore)} %`],
    ["Jours actifs", stats.activeDays.toString()],
    ["Série actuelle", `${stats.currentStreak} j`],
    ["Série maximale", `${stats.longestStreak} j`],
  ];

  return (
    <section aria-labelledby="progress-summary-title">
      <h2 id="progress-summary-title" className="sr-only">Synthèse de la progression</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map(([label, value], index) => (
          <article key={label} className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm">
            <div className={`mb-4 h-1.5 w-10 rounded-full ${index % 2 === 0 ? "bg-violet-500" : "bg-blue-500"}`} />
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
