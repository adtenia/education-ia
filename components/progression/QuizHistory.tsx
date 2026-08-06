import type { QuizAttemptView } from "../../types/progression-page";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default function QuizHistory({ attempts }: { attempts: QuizAttemptView[] }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-600">Résultats</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Historique des quiz</h2>
      </div>

      {attempts.length === 0 ? (
        <p className="mt-7 rounded-2xl bg-slate-50 p-6 text-slate-500">Aucun quiz terminé pour le moment.</p>
      ) : (
        <div className="mt-7 space-y-3">
          {attempts.map((attempt) => (
            <article key={attempt.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">Tentative {attempt.attemptNumber}</span>
                  {attempt.delta !== null && (
                    <span className={`text-sm font-black ${attempt.delta > 0 ? "text-emerald-600" : attempt.delta < 0 ? "text-red-600" : "text-slate-500"}`}>
                      {attempt.delta > 0 ? "+" : ""}{attempt.delta} point{Math.abs(attempt.delta) > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 truncate text-lg font-black text-slate-900">{attempt.title}</h3>
                {attempt.courseTitle && attempt.courseTitle !== attempt.title && <p className="mt-1 truncate text-sm text-slate-500">{attempt.courseTitle}</p>}
                <time dateTime={attempt.occurredAt} className="mt-2 block text-sm text-slate-500">{dateFormatter.format(new Date(attempt.occurredAt))}</time>
              </div>
              <div className="shrink-0 rounded-2xl bg-white px-5 py-3 text-2xl font-black text-violet-700 shadow-sm">{Math.round(attempt.score)} %</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
