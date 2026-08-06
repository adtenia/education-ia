"use client";

import { useEffect, useRef, useState } from "react";
import { saveQuizScore, type QuizAnswerInput } from "./actions";
import styles from "./QuizForm.module.css";

type AnswerLetter = "A" | "B" | "C" | "D";
type Stage = "intro" | "quiz" | "result" | "review";

type Question = {
  id: string;
  question: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  correct_answer: string;
  explanation?: string | null;
  topic?: string | null;
  topic_key?: string | null;
};

type QuizFormProps = {
  quizId: string;
  quizTitle: string;
  chapter: string;
  courseHref: string;
  questions: Question[];
  previousBest: number | null;
  previousScore: number | null;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} min ${String(seconds).padStart(2, "0")} s` : `${seconds} s`;
}

function scoreMessage(percent: number) {
  if (percent >= 90) return { title: "Excellent travail !", text: "Tu maîtrises très bien les notions de ce quiz." };
  if (percent >= 70) return { title: "Très bon travail !", text: "Quelques notions restent à consolider pour être parfaitement à l’aise." };
  return { title: "Tu progresses déjà.", text: "Revois les explications signalées, puis retente le quiz à ton rythme." };
}

export default function QuizForm({ quizId, quizTitle, chapter, courseHref, questions, previousBest, previousScore }: QuizFormProps) {
  const [stage, setStage] = useState<Stage>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, AnswerLetter>>({});
  const [score, setScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (stage !== "quiz" || startedAt.current === null) return;
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - (startedAt.current || Date.now())) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  const activeQuestion = questions[currentIndex];
  const selectedAnswer = activeQuestion ? selectedAnswers[activeQuestion.id] : undefined;
  const estimatedMinutes = Math.max(3, Math.ceil(questions.length * 0.75));
  const progress = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const percent = score === null || questions.length === 0 ? 0 : Math.round((score / questions.length) * 100);
  const message = scoreMessage(percent);
  const bestScore = score === null ? previousBest : Math.max(previousBest ?? 0, percent);
  const evolution = score === null || previousScore === null ? null : percent - previousScore;

  function startQuiz() {
    setStage("quiz");
    setCurrentIndex(0);
    setSelectedAnswers({});
    setScore(null);
    setElapsedSeconds(0);
    setSubmissionError(null);
    startedAt.current = Date.now();
  }

  async function submitQuiz() {
    const answers: QuizAnswerInput[] = questions.map((question) => ({
      questionId: question.id,
      selectedAnswer: selectedAnswers[question.id],
    }));
    if (answers.some((answer) => !answer.selectedAnswer)) return;

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const result = await saveQuizScore(quizId, answers, crypto.randomUUID());
      if (!result.success || result.score === null) {
        setSubmissionError(result.error || "Le quiz n’a pas pu être validé.");
        return;
      }
      const correctAnswers = result.correctAnswers ?? questions.reduce(
        (total, question) => total + (selectedAnswers[question.id] === question.correct_answer ? 1 : 0),
        0
      );
      setScore(correctAnswers);
      if (startedAt.current !== null) setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
      setStage("result");
    } catch {
      setSubmissionError("Le quiz n’a pas pu être validé. Réessaie dans quelques instants.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const answers: Array<[AnswerLetter, string]> = activeQuestion ? [
    ["A", activeQuestion.answer_a],
    ["B", activeQuestion.answer_b],
    ["C", activeQuestion.answer_c],
    ["D", activeQuestion.answer_d],
  ] : [];
  const reviewMode = stage === "review";

  return (
    <>
      <div className={`${styles.screen} print-hide`}>
        {stage === "intro" && (
          <section className={`${styles.enter} relative overflow-hidden rounded-[2.5rem] border border-violet-100 bg-white px-6 py-10 shadow-[0_30px_80px_-45px_rgba(76,29,149,0.45)] sm:px-10 sm:py-14 lg:px-14`}>
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
            <div className="relative max-w-3xl">
              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-violet-700">Prêt à commencer ?</span>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{quizTitle}</h1>
              <p className="mt-4 text-lg font-semibold text-slate-600">{chapter}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"><p className="text-sm font-bold text-slate-500">Questions</p><p className="mt-1 text-xl font-black text-slate-950">{questions.length}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"><p className="text-sm font-bold text-slate-500">Temps estimé</p><p className="mt-1 text-xl font-black text-slate-950">Environ {estimatedMinutes} min</p></div>
              </div>
              <p className="mt-7 max-w-2xl text-base leading-7 text-slate-600">Avance question par question. Tu pourras revoir toutes les explications après avoir validé ta tentative.</p>
              <button type="button" onClick={startQuiz} className="mt-8 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-4 text-lg font-black text-white shadow-xl shadow-violet-200 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl motion-reduce:transform-none motion-reduce:transition-none sm:w-auto sm:min-w-64">Commencer le quiz</button>
            </div>
          </section>
        )}

        {(stage === "quiz" || stage === "review") && activeQuestion && (
          <div className={styles.enter} key={`${stage}-${currentIndex}`}>
            <div className="mb-6">
              <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-[0.14em] text-violet-700">{reviewMode ? "Correction détaillée" : `Question ${currentIndex + 1} sur ${questions.length}`}</p><p className="mt-1 text-sm text-slate-500">{reviewMode ? `Réponse ${currentIndex + 1} sur ${questions.length}` : `${progress} % terminé`}</p></div><span className="text-3xl font-black text-slate-200 sm:text-5xl">{String(currentIndex + 1).padStart(2, "0")}</span></div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className={`${styles.progressFill} h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600`} style={{ width: `${progress}%` }} /></div>
            </div>

            <article className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] sm:p-9 lg:p-12">
              <h2 className="max-w-4xl text-2xl font-black leading-9 text-slate-950 sm:text-3xl sm:leading-[1.35]">{activeQuestion.question}</h2>
              <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
                <legend className="sr-only">Choisis une réponse</legend>
                {answers.map(([letter, answer]) => {
                  const isSelected = selectedAnswer === letter;
                  const isCorrect = activeQuestion.correct_answer === letter;
                  const isWrong = reviewMode && isSelected && !isCorrect;
                  const state = reviewMode && isCorrect
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-200"
                    : isWrong
                      ? "border-red-400 bg-red-50 text-red-950 ring-2 ring-red-100"
                      : isSelected
                        ? "border-violet-500 bg-violet-50 text-violet-950 ring-2 ring-violet-200 shadow-lg shadow-violet-100"
                        : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-violet-300 hover:bg-violet-50/60";
                  return <label key={letter} className={`relative flex min-h-24 cursor-pointer items-center gap-4 rounded-2xl border-2 p-5 text-base font-semibold leading-7 transition duration-200 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none ${state} ${reviewMode ? "cursor-default" : "hover:-translate-y-0.5 hover:shadow-md"}`}><input type="radio" className="sr-only" name={`question-${activeQuestion.id}`} value={letter} checked={isSelected || false} disabled={reviewMode} onChange={() => setSelectedAnswers((current) => ({ ...current, [activeQuestion.id]: letter }))} /><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black ${isSelected ? "bg-violet-600 text-white" : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"}`}>{letter}</span><span className="min-w-0 break-words">{answer}</span>{isSelected && !reviewMode && <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">✓</span>}</label>;
                })}
              </fieldset>

              {reviewMode && <div className={`${styles.enter} mt-7 overflow-hidden rounded-2xl border-2 ${selectedAnswer === activeQuestion.correct_answer ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-red-300 bg-red-50 text-red-950"}`}><p className="px-5 py-4 font-black">{selectedAnswer === activeQuestion.correct_answer ? "Bonne réponse." : `Réponse incorrecte. La bonne réponse est ${activeQuestion.correct_answer}.`}</p>{activeQuestion.explanation && <div className="border-t border-current/15 bg-white/75 px-5 py-5"><p className="text-sm font-black uppercase tracking-[0.14em]">Pourquoi ?</p><p className="mt-3 text-base leading-7">{activeQuestion.explanation}</p></div>}</div>}
            </article>

            {submissionError && <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800" role="alert">{submissionError}</p>}

            <nav className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))} className="rounded-2xl border border-slate-300 bg-white px-6 py-3.5 font-black text-slate-700 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-40 motion-reduce:transition-none">Question précédente</button>
              {reviewMode ? (
                currentIndex < questions.length - 1 ? <button type="button" onClick={() => setCurrentIndex((value) => value + 1)} className="rounded-2xl bg-slate-950 px-7 py-3.5 font-black text-white transition hover:bg-violet-700 motion-reduce:transition-none">Réponse suivante</button> : <button type="button" onClick={() => setStage("result")} className="rounded-2xl bg-violet-600 px-7 py-3.5 font-black text-white">Retour aux résultats</button>
              ) : currentIndex < questions.length - 1 ? (
                <button type="button" disabled={!selectedAnswer} onClick={() => setCurrentIndex((value) => value + 1)} className="rounded-2xl bg-slate-950 px-7 py-3.5 font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none">Question suivante</button>
              ) : (
                <button type="button" disabled={!selectedAnswer || isSubmitting} onClick={() => void submitQuiz()} className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-3.5 font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none">{isSubmitting ? "Validation…" : "Valider le quiz"}</button>
              )}
            </nav>
          </div>
        )}

        {stage === "result" && score !== null && (
          <section className={`${styles.result} overflow-hidden rounded-[2.5rem] border border-violet-100 bg-white shadow-[0_30px_90px_-50px_rgba(76,29,149,0.5)]`} aria-live="polite">
            <div className="bg-gradient-to-br from-violet-600 to-indigo-800 px-6 py-10 text-center text-white sm:px-10 sm:py-14"><p className="text-sm font-black uppercase tracking-[0.18em] text-violet-100">Quiz terminé</p><p className="mt-4 text-7xl font-black tracking-tight sm:text-8xl">{percent}<span className="text-4xl text-violet-200">%</span></p><h2 className="mt-5 text-2xl font-black sm:text-3xl">{message.title}</h2><p className="mx-auto mt-3 max-w-xl text-base leading-7 text-violet-50 sm:text-lg">{message.text}</p></div>
            <div className="p-6 sm:p-10">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Bonnes réponses", String(score)], ["À revoir", String(questions.length - score)], ["Temps passé", formatTime(elapsedSeconds)], ["Meilleure tentative", bestScore === null ? "—" : `${Math.round(bestScore)} %`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p></div>)}</div>
              {evolution !== null && <p className={`mt-5 text-center font-black ${evolution > 0 ? "text-emerald-700" : evolution < 0 ? "text-orange-700" : "text-slate-600"}`}>{evolution > 0 ? "+" : ""}{Math.round(evolution)} point{Math.abs(Math.round(evolution)) > 1 ? "s" : ""} par rapport à la tentative précédente</p>}
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><button type="button" onClick={startQuiz} className="rounded-2xl bg-violet-600 px-5 py-3.5 font-black text-white transition hover:bg-violet-700 motion-reduce:transition-none">Refaire le quiz</button><button type="button" onClick={() => { setCurrentIndex(0); setStage("review"); }} className="rounded-2xl border border-violet-300 bg-violet-50 px-5 py-3.5 font-black text-violet-800">Revoir les réponses</button><a href={courseHref} className="rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-center font-black text-slate-700">Retour au cours</a><a href="/progression" className="rounded-2xl bg-slate-950 px-5 py-3.5 text-center font-black text-white">Voir ma progression</a></div>
            </div>
          </section>
        )}
      </div>

      <section className="print-only quiz-question-list">
        {questions.map((question, index) => <article key={`print-${question.id}`} className="quiz-print-question"><h2>Question {index + 1} — {question.question}</h2><ol className="mt-3 space-y-2">{([question.answer_a, question.answer_b, question.answer_c, question.answer_d]).map((answer, answerIndex) => <li key={answerIndex}>{String.fromCharCode(65 + answerIndex)}. {answer}</li>)}</ol></article>)}
      </section>
      <section className="quiz-answer-key print-only"><h2 className="font-bold text-slate-950">Corrigé du quiz</h2><div className="quiz-answer-grid">{questions.map((question, index) => { const answerMap: Record<AnswerLetter, string> = { A: question.answer_a, B: question.answer_b, C: question.answer_c, D: question.answer_d }; const letter = question.correct_answer.toUpperCase() as AnswerLetter; return <article key={`correction-${question.id}`} className="quiz-correction-item border border-slate-200 bg-white"><h3 className="font-bold text-slate-950">Question {index + 1} — {question.question}</h3><p className="font-semibold text-emerald-800">Bonne réponse : {letter} — {answerMap[letter] || "Réponse non renseignée"}</p>{question.explanation && <p className="text-slate-700"><strong>Explication :</strong> {question.explanation}</p>}</article>; })}</div></section>
    </>
  );
}
