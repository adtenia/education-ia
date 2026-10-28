"use client";

import { useState } from "react";
import Link from "next/link";

type Course = { id: string; title: string | null; detected_subject: string | null; detected_chapter: string | null };
type Lesson = { topic: string; explanation: string; example: string };
type Question = { topic: string; question: string; choices: string[]; correctIndex: number; explanation: string; hint: string };
type Session = { title: string; intro: string; missing: string; lessons: Lesson[]; questions: Question[] };

export default function ControlPreparation({ courses, schoolClass }: { courses: Course[]; schoolClass: string | null }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [target, setTarget] = useState(16);
  const [pending, setPending] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<"lessons" | "questions" | "results">("lessons");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [hintVisible, setHintVisible] = useState(false);

  async function generate() {
    setError("");
    if (!selected.length || !date) { setError("Choisis au moins un cours et la date du contrôle."); return; }
    setPending(true);
    try {
      const response = await fetch("/api/prepare-control", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds: selected, date, target }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.session) throw new Error(payload.error || "Erreur de génération.");
      setSession(payload.session as Session);
      setStage("lessons"); setLessonIndex(0); setQuestionIndex(0); setAnswers({}); setHintVisible(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Une erreur est survenue."); }
    finally { setPending(false); }
  }

  const score = session ? session.questions.reduce((sum, question, i) => sum + (answers[i] === question.correctIndex ? 1 : 0), 0) : 0;
  const total = session?.questions.length || 0;
  const answered = Object.keys(answers).length;
  const lesson = session?.lessons[lessonIndex];
  const question = session?.questions[questionIndex];
  const answer = answers[questionIndex];
  const answeredCurrent = answer !== undefined;

  return <div className="space-y-6">
    <header className="rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-100 via-white to-white p-6 sm:p-9">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">Entraînement actif</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Prêt pour ton contrôle ?</h1>
      <p className="mt-3 max-w-2xl text-slate-600">Comprends une notion, réponds à une question, découvre pourquoi et progresse à ton rythme. Plus de pavé à lire !</p>
      <p className="mt-3 text-sm font-bold text-violet-700">Classe : {schoolClass || "non renseignée"} · <Link href="/profile" className="underline">Modifier</Link></p>
    </header>

    {!session ? <>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black">01 · Ton objectif</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div><label htmlFor="control-date" className="mb-2 block text-sm font-bold">Date du contrôle</label>
            <input id="control-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3" /></div>
          <div><label htmlFor="control-target" className="mb-2 block text-sm font-bold">Note visée : {target}/20</label>
            <input id="control-target" type="range" min={5} max={20} value={target} onChange={e => setTarget(Number(e.target.value))} className="mt-4 w-full accent-violet-600" /></div>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black">02 · Tes chapitres</h2>
        <p className="mt-2 text-sm text-slate-500">Sélectionne jusqu'à 8 cours, même s'ils viennent de plusieurs chapitres.</p>
        {courses.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{courses.map(course => {
          const checked = selected.includes(course.id);
          return <label key={course.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${checked ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:bg-slate-50"}`}>
            <input type="checkbox" checked={checked} disabled={!checked && selected.length >= 8}
              onChange={e => setSelected(old => e.target.checked ? [...old, course.id] : old.filter(id => id !== course.id))} className="mt-1 accent-violet-600" />
            <span><strong className="block text-sm">{course.detected_chapter || course.title || "Cours"}</strong><span className="text-xs text-slate-500">{course.detected_subject || "Matière non détectée"}</span></span>
          </label>;
        })}</div> : <p className="mt-4 text-slate-600">Aucun cours enregistré. <Link href="/import" className="font-bold text-violet-700 underline">Importer des photos ou utiliser le QR code</Link>.</p>}
      </section>
      <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <h2 className="text-xl font-black">03 · On s'entraîne !</h2>
        <p className="mt-2 text-sm text-slate-300">L'IA prépare des mini-leçons et un quiz interactif avec des corrections détaillées. Cette génération utilise des crédits IA.</p>
        <button type="button" onClick={generate} disabled={pending || !selected.length || !date} className="mt-5 rounded-xl bg-violet-500 px-6 py-3 font-black text-white hover:bg-violet-400 disabled:opacity-50">
          {pending ? "Je prépare ton entraînement…" : "Commencer mon entraînement →"}
        </button>
        {error && <p role="alert" className="mt-4 font-semibold text-rose-300">{error}</p>}
      </div>
    </> : <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm sm:p-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-violet-100 px-4 py-2 text-xs font-black uppercase text-violet-700">{stage === "lessons" ? "1 · Comprendre" : stage === "questions" ? "2 · S'entraîner" : "3 · Bilan"}</span>
        <button type="button" onClick={() => setSession(null)} className="text-sm font-bold text-slate-500 underline">Nouvelle préparation</button>
      </div>
      <h2 className="mt-5 text-2xl font-black text-slate-950">{session.title}</h2>
      {session.missing && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Cours incomplets : {session.missing}</p>}

      {stage === "lessons" && lesson && <div className="mt-7">
        <p className="text-sm font-bold text-violet-700">Notion {lessonIndex + 1} sur {session.lessons.length}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-violet-500 transition-all" style={{width:`${((lessonIndex + 1)/session.lessons.length)*100}%`}} /></div>
        <h3 className="mt-7 text-2xl font-black">{lesson.topic}</h3>
        <p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-700">{lesson.explanation}</p>
        <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50 p-5"><p className="text-sm font-black text-violet-700">Exemple expliqué</p><p className="mt-2 whitespace-pre-line leading-7">{lesson.example}</p></div>
        <button type="button" onClick={() => { if (lessonIndex + 1 < session.lessons.length) setLessonIndex(i => i+1); else setStage("questions"); }} className="mt-7 rounded-xl bg-violet-600 px-6 py-3 font-black text-white hover:bg-violet-700">
          {lessonIndex + 1 < session.lessons.length ? "J'ai compris, notion suivante →" : "Passer aux exercices →"}
        </button>
      </div>}

      {stage === "questions" && question && <div className="mt-7">
        <div className="flex items-center justify-between gap-3 text-sm font-bold text-slate-500"><span>Question {questionIndex + 1} / {total}</span><span>{answered} réponse(s)</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-violet-500 transition-all" style={{width:`${((questionIndex + 1)/total)*100}%`}} /></div>
        <p className="mt-6 text-xs font-black uppercase tracking-wider text-violet-600">{question.topic}</p>
        <h3 className="mt-3 text-xl font-black leading-relaxed sm:text-2xl">{question.question}</h3>
        <div className="mt-6 grid gap-3">{question.choices.map((choice, i) => {
          const correct = answeredCurrent && i === question.correctIndex;
          const wrong = answeredCurrent && answer === i && i !== question.correctIndex;
          return <button type="button" key={i} disabled={answeredCurrent} onClick={() => setAnswers(prev => ({...prev, [questionIndex]: i}))}
            className={`rounded-2xl border p-4 text-left font-semibold transition ${correct ? "border-emerald-400 bg-emerald-50 text-emerald-900" : wrong ? "border-rose-400 bg-rose-50 text-rose-900" : "border-slate-200 bg-slate-50 hover:border-violet-400 hover:bg-violet-50"}`}>
            <span className="mr-3 font-black">{String.fromCharCode(65+i)}.</span>{choice}
          </button>;
        })}</div>
        {!answeredCurrent ? <button type="button" onClick={() => setHintVisible(v => !v)} className="mt-4 text-sm font-bold text-violet-700 underline">{hintVisible ? "Masquer l'indice" : "Besoin d'un indice ?"}</button> : null}
        {hintVisible && !answeredCurrent && <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{question.hint}</p>}
        {answeredCurrent && <div aria-live="polite" className={`mt-6 rounded-2xl p-5 ${answer === question.correctIndex ? "bg-emerald-50" : "bg-amber-50"}`}>
          <p className="font-black">{answer === question.correctIndex ? "Bravo, bonne réponse !" : "Pas encore — voici comment comprendre."}</p>
          <p className="mt-2 whitespace-pre-line leading-7">{question.explanation}</p>
          <button type="button" onClick={() => {setHintVisible(false); if (questionIndex+1 < total) setQuestionIndex(i => i+1); else setStage("results");}} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">
            {questionIndex + 1 < total ? "Question suivante →" : "Voir mon bilan →"}
          </button>
        </div>}
      </div>}

      {stage === "results" && <div className="mt-8">
        <p className="text-sm font-bold uppercase text-violet-700">Ton entraînement est terminé</p>
        <p className="mt-3 text-5xl font-black text-slate-950">{score} <span className="text-2xl text-slate-500">/ {total}</span></p>
        <p className="mt-3 text-slate-600">Ce score mesure cet entraînement, pas ta future note au contrôle.</p>
        <h3 className="mt-8 text-xl font-black">Les notions à revoir</h3>
        {session.questions.filter((q,i) => answers[i] !== q.correctIndex).length ? <div className="mt-4 space-y-3">{session.questions.map((q,i) => answers[i] !== q.correctIndex ? <div key={i} className="rounded-2xl bg-amber-50 p-4"><p className="font-black">{q.topic}</p><p className="mt-2 text-sm">{q.explanation}</p></div> : null)}</div> : <p className="mt-3 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-900">Toutes les réponses sont justes !</p>}
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={() => {setStage("questions");setQuestionIndex(0);setAnswers({});setHintVisible(false);}} className="rounded-xl bg-violet-600 px-5 py-3 font-black text-white">Recommencer les exercices</button>
          <button type="button" onClick={() => {setStage("lessons");setLessonIndex(0);}} className="rounded-xl border border-slate-200 px-5 py-3 font-bold">Revoir les explications</button>
        </div>
        <p className="mt-6 text-xs text-slate-500">Cette séance n'est pas encore sauvegardée. Le bilan et les réponses ne sont pas enregistrés dans ta progression.</p>
      </div>}
    </section>}
  </div>;
}
