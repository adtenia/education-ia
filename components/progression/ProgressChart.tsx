import type { ProgressChartPoint } from "../../types/progression-page";

export default function ProgressChart({ points }: { points: ProgressChartPoint[] }) {
  const width = 720;
  const height = 280;
  const padding = { left: 48, right: 24, top: 24, bottom: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const positioned = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? padding.left + chartWidth / 2 : padding.left + (index / (points.length - 1)) * chartWidth,
    y: padding.top + chartHeight - (point.score / 100) * chartHeight,
  }));
  const line = positioned.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Évolution</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Progression des derniers quiz</h2>
      {points.length === 0 ? (
        <p className="mt-7 rounded-2xl bg-slate-50 p-6 text-slate-500">Le graphique apparaîtra après ton premier quiz.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-b from-violet-50/70 to-white p-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Scores des derniers quiz, de zéro à cent pour cent">
            {[0, 25, 50, 75, 100].map((score) => {
              const y = padding.top + chartHeight - (score / 100) * chartHeight;
              return <g key={score}><line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#ddd6fe" strokeWidth="1" /><text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#64748b">{score}</text></g>;
            })}
            {positioned.length > 1 && <polyline points={line} fill="none" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
            {positioned.map((point) => <g key={point.id}><circle cx={point.x} cy={point.y} r="6" fill="#fff" stroke="#7c3aed" strokeWidth="4" /><text x={point.x} y={height - 15} textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">{point.label}</text></g>)}
          </svg>
        </div>
      )}
    </section>
  );
}
