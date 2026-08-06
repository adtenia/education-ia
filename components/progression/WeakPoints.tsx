import type { TopicProgressView, WeakPointView } from "../../types/progression-page";

type WeakPointsProps = {
  topics: TopicProgressView[];
  fallbackItems: WeakPointView[];
  useTopicAnalysis: boolean;
};

export default function WeakPoints({ topics, fallbackItems, useTopicAnalysis }: WeakPointsProps) {
  return (
    <section className="rounded-[2rem] border border-amber-100 bg-amber-50/50 p-6 shadow-sm sm:p-8">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">Priorités</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">À retravailler</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{useTopicAnalysis ? "Une notion apparaît ici seulement si les erreurs se répètent dans plusieurs tentatives et si son taux de réussite est inférieur à ta moyenne personnelle." : "Les anciens quiz n’ont pas de notion détaillée. Cette analyse de compatibilité compare donc encore leurs moyennes à ta moyenne générale."}</p>
      {useTopicAnalysis ? (
        topics.length === 0 ? <p className="mt-6 rounded-2xl bg-white/70 p-5 text-slate-600">Aucune difficulté récurrente n’est détectée dans les notions suffisamment évaluées.</p> : (
          <div className="mt-6 space-y-3">{topics.map((topic) => <article key={topic.key} className="rounded-2xl border border-amber-100 bg-white p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-black text-slate-900">{topic.title}</h3><p className="mt-2 text-sm text-slate-600">{topic.errorCount} erreur{topic.errorCount > 1 ? "s" : ""} sur {topic.answeredQuestions} réponse{topic.answeredQuestions > 1 ? "s" : ""} · {topic.distinctAttempts} tentative{topic.distinctAttempts > 1 ? "s" : ""}</p></div><span className="rounded-xl bg-amber-100 px-3 py-2 font-black text-amber-800">Réussite {Math.round(topic.successRate)} %</span></div></article>)}</div>
        )
      ) : (
        fallbackItems.length === 0 ? <p className="mt-6 rounded-2xl bg-white/70 p-5 text-slate-600">Aucun résultat inférieur à ta moyenne générale, ou pas encore assez de résultats.</p> : (
          <div className="mt-6 space-y-3">{fallbackItems.map((item) => <article key={item.key} className="rounded-2xl border border-amber-100 bg-white p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-black text-slate-900">{item.title}</h3>{item.courseTitle && item.courseTitle !== item.title && <p className="mt-1 text-sm text-slate-500">{item.courseTitle}</p>}<p className="mt-2 text-sm text-slate-600">{item.attemptsCount} tentative{item.attemptsCount > 1 ? "s" : ""} · Dernier score {Math.round(item.latestScore)} %</p></div><span className="rounded-xl bg-amber-100 px-3 py-2 font-black text-amber-800">Moy. {Math.round(item.averageScore)} %</span></div></article>)}</div>
        )
      )}
    </section>
  );
}
