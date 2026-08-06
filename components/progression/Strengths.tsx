import type { TopicProgressView } from "../../types/progression-page";

export default function Strengths({ topics }: { topics: TopicProgressView[] }) {
  return (
    <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm sm:p-8">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">Réussites</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">Points forts</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Ces notions ont été réussies dans plusieurs tentatives et dépassent ton taux de réussite général.</p>
      {topics.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white/70 p-5 text-slate-600">Les points forts apparaîtront lorsque plusieurs notions auront été évaluées suffisamment souvent.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {topics.map((topic) => (
            <article key={topic.key} className="rounded-2xl border border-emerald-100 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-slate-900">{topic.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{topic.answeredQuestions} réponse{topic.answeredQuestions > 1 ? "s" : ""} sur {topic.distinctAttempts} tentative{topic.distinctAttempts > 1 ? "s" : ""}</p>
                </div>
                <span className="rounded-xl bg-emerald-100 px-3 py-2 font-black text-emerald-800">Réussite {Math.round(topic.successRate)} %</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
