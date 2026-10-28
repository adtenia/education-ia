"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Course = { id: string; title: string | null; detected_subject: string | null; detected_chapter: string | null };

export default function ControlPreparation({ courses, schoolClass }: { courses: Course[]; schoolClass: string | null }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [target, setTarget] = useState(16);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function generate() {
    setError(""); setResult("");
    if (!selected.length || !date) { setError("Choisis au moins un cours et la date du contrôle."); return; }
    setPending(true);
    try {
      const response = await fetch("/api/prepare-control", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds: selected, date, target }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.content) throw new Error(payload.error || "Erreur de génération.");
      setResult(payload.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally { setPending(false); }
  }

  return (
    <div className="space-y-7">
      <div className="rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Préparation personnalisée</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Préparer mon contrôle</h1>
        <p className="mt-3 text-slate-600">Choisis plusieurs chapitres, fixe un objectif et entraîne-toi avec des explications et des exercices corrigés.</p>
        <p className="mt-3 text-sm font-bold text-violet-700">Ta classe : {schoolClass || "non renseignée"} · <Link href="/profile" className="underline">Modifier</Link></p>
      </div>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black">1. Mon prochain contrôle</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="control-date" className="mb-2 block text-sm font-bold">Date du contrôle</label>
            <input id="control-date" type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3" />
          </div>
          <div>
            <label htmlFor="control-target" className="mb-2 block text-sm font-bold">Note visée : {target}/20</label>
            <input id="control-target" type="range" min={5} max={20} value={target} onChange={e => setTarget(Number(e.target.value))} className="mt-4 w-full accent-violet-600" />
          </div>
        </div>
      </section>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black">2. Les cours à réviser</h2>
        <p className="mt-2 text-sm text-slate-500">Sélectionne jusqu'à 8 cours du même contrôle. Ils peuvent couvrir plusieurs chapitres.</p>
        {courses.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {courses.map(course => {
            const checked = selected.includes(course.id);
            return <label key={course.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${checked ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:bg-slate-50"}`}>
              <input type="checkbox" checked={checked} disabled={!checked && selected.length >= 8}
                onChange={e => setSelected(old => e.target.checked ? [...old, course.id] : old.filter(id => id !== course.id))}
                className="mt-1 accent-violet-600" />
              <span><strong className="block text-sm text-slate-900">{course.detected_chapter || course.title || "Cours"}</strong>
                <span className="text-xs text-slate-500">{course.detected_subject || "Matière non détectée"}</span></span>
            </label>;
          })}
        </div> : <p className="mt-5 text-slate-600">Tu n'as pas encore de cours. <Link href="/import" className="font-bold text-violet-700 underline">Importer des photos ou utiliser le QR code</Link>.</p>}
      </section>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black">3. Ma séance de révision</h2>
        <p className="mt-2 text-sm text-slate-500">L'IA utilisera les cours sélectionnés pour expliquer les notions, proposer des exercices et détailler les corrections. Générer une séance consomme des crédits IA.</p>
        <button type="button" onClick={generate} disabled={pending || !selected.length || !date}
          className="mt-5 rounded-xl bg-violet-600 px-6 py-3 font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? "Préparation en cours…" : "Créer ma séance de révision →"}
        </button>
        {error && <p role="alert" className="mt-4 font-semibold text-rose-700">{error}</p>}
      </section>
      {result && <section aria-label="Séance générée" className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm sm:p-9">
        <h2 className="mb-6 text-2xl font-black">Ta préparation au contrôle</h2>
        <div className="prose prose-slate max-w-none space-y-4 leading-8"><ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown></div>
        <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Cette séance n'est pas encore enregistrée. Garde cette page ouverte ou copie son contenu avant de partir. L'objectif de note ne garantit pas le résultat au contrôle.</p>
      </section>}
    </div>
  );
}
