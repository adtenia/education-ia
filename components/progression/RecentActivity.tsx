import type { RecentActivityView } from "../../types/progression-page";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default function RecentActivity({ activities }: { activities: RecentActivityView[] }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-black text-slate-950">Activité récente</h2>
      {activities.length === 0 ? <p className="mt-6 text-slate-500">Aucune activité récente.</p> : (
        <ol className="mt-6 space-y-3">
          {activities.map((activity) => <li key={activity.id} className="flex gap-4 rounded-2xl bg-slate-50 p-4"><span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-violet-500" /><div><p className="font-black text-slate-900">{activity.label}</p>{activity.detail && <p className="mt-1 text-sm text-slate-500">{activity.detail}</p>}<time dateTime={activity.occurredAt} className="mt-1 block text-xs font-semibold text-slate-400">{dateFormatter.format(new Date(activity.occurredAt))}</time></div></li>)}
        </ol>
      )}
    </section>
  );
}
