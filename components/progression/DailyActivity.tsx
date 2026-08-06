import type { DailyActivityView } from "../../types/progression-page";

export default function DailyActivity({ days }: { days: DailyActivityView[] }) {
  const maxEvents = Math.max(1, ...days.map((day) => day.eventsCount));
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-black text-slate-950">Activité des 14 derniers jours</h2>
      <div className="mt-7 grid grid-cols-7 gap-2 sm:grid-cols-14">
        {days.map((day) => {
          const opacity = day.active ? 0.3 + (day.eventsCount / maxEvents) * 0.7 : 0.08;
          return <div key={day.date} className="text-center"><div title={`${day.eventsCount} activité(s)`} className="mx-auto aspect-square w-full max-w-10 rounded-xl bg-violet-600" style={{ opacity }} /><p className="mt-2 text-[10px] font-bold text-slate-500">{day.label}</p></div>;
        })}
      </div>
      <p className="mt-5 text-sm text-slate-500">Une case plus intense correspond à davantage d’activités enregistrées.</p>
    </section>
  );
}
