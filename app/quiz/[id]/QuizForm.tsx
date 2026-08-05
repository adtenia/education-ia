"use client";

import { useState } from "react";
import { saveQuizScore } from "./actions";

type AnswerLetter = "A" | "B" | "C" | "D";

type Question = {
  id: string;
  question: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  correct_answer: string;
  explanation?: string | null;
};

type QuizFormProps = {
  quizId: string;
  questions: Question[];
};

export default function QuizForm({ quizId, questions }: QuizFormProps) {
  const [score, setScore] = useState<number | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  async function handleSubmit(formData: FormData) {
    let goodAnswers = 0;
    const submittedAnswers: Record<string, string> = {};

    questions.forEach((question) => {
      const userAnswer = String(formData.get(`question-${question.id}`) || "");
      submittedAnswers[question.id] = userAnswer;

      if (userAnswer === question.correct_answer) {
        goodAnswers++;
      }
    });

    const percent = Math.round((goodAnswers / questions.length) * 100);

    setSelectedAnswers(submittedAnswers);
    setScore(goodAnswers);

    await saveQuizScore(quizId, percent);
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-7">
        {questions.map((question, index) => {
          const answers: Array<[AnswerLetter, string]> = [
            ["A", question.answer_a],
            ["B", question.answer_b],
            ["C", question.answer_c],
            ["D", question.answer_d],
          ];
          const selectedAnswer = selectedAnswers[question.id];
          const isSubmitted = score !== null;
          const answeredCorrectly = selectedAnswer === question.correct_answer;

          return (
            <article key={question.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Question {index + 1} sur {questions.length}
                </p>
              </div>

              <h2 className="text-xl font-bold leading-snug text-slate-950 sm:text-2xl">
                {question.question}
              </h2>

              <fieldset className="mt-7 space-y-3">
                <legend className="sr-only">Choisis une réponse</legend>
                {answers.map(([letter, answer]) => {
                  const isSelected = selectedAnswer === letter;
                  const isCorrectAnswer = question.correct_answer === letter;
                  const isWrongSelection = isSubmitted && isSelected && !isCorrectAnswer;

                  const stateClasses = isSubmitted && isCorrectAnswer
                    ? "border-emerald-400 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-300"
                    : isWrongSelection
                      ? "border-red-400 bg-red-50 text-red-950 ring-1 ring-red-300"
                      : isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-950 ring-1 ring-blue-300"
                        : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/50";

                  return (
                    <label key={letter} className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border p-4 text-base leading-6 transition sm:p-5 sm:text-lg ${stateClasses}`}>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={letter}
                        required
                        disabled={isSubmitted}
                        checked={isSelected}
                        onChange={() => setSelectedAnswers((current) => ({ ...current, [question.id]: letter }))}
                        className="h-5 w-5 shrink-0 accent-blue-600 sm:h-6 sm:w-6"
                      />
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                        {letter}
                      </span>
                      <span className="font-medium">{answer}</span>
                    </label>
                  );
                })}
              </fieldset>

              {isSubmitted && (
                <div className={`mt-6 rounded-2xl border p-5 ${answeredCorrectly ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-red-200 bg-red-50 text-red-950"}`}>
                  <p className="font-bold">
                    {answeredCorrectly
                      ? "Bonne réponse."
                      : `Réponse incorrecte. La bonne réponse est ${question.correct_answer}.`}
                  </p>
                  {question.explanation && (
                    <div className="mt-4 border-t border-current/15 pt-4">
                      <p className="text-sm font-bold uppercase tracking-wide">Explication</p>
                      <p className="mt-2 leading-7">{question.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}

        {score === null && (
          <button type="submit" className="w-full rounded-2xl bg-slate-950 px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 sm:w-auto sm:min-w-56">
            Valider le quiz
          </button>
        )}
      </form>

      {score !== null && (
        <section className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 sm:p-8" aria-live="polite">
          <p className="text-2xl font-bold sm:text-3xl">Résultat : {score} / {questions.length}</p>
          <p className="mt-2 text-lg font-semibold">
            {Math.round((score / questions.length) * 100)} % de bonnes réponses
          </p>
        </section>
      )}
    </>
  );
}
