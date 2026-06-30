"use client";

import { useState } from "react";
import { saveQuizScore } from "./actions";

type Question = {
  id: string;
  question: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  correct_answer: string;
};

type QuizFormProps = {
  quizId: string;
  questions: Question[];
};

export default function QuizForm({ quizId, questions }: QuizFormProps) {
  const [score, setScore] = useState<number | null>(null);

  async function handleSubmit(formData: FormData) {
    let goodAnswers = 0;

    questions.forEach((question) => {
      const userAnswer = formData.get(`question-${question.id}`);

      if (userAnswer === question.correct_answer) {
        goodAnswers++;
      }
    });

    const percent = Math.round((goodAnswers / questions.length) * 100);

    setScore(goodAnswers);

    await saveQuizScore(quizId, percent);
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-5">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <h2 className="mb-4 text-lg font-bold text-slate-950">
              Question {index + 1}
            </h2>

            <p className="mb-5 text-slate-700">{question.question}</p>

            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value="A"
                  required
                />
                <span>{question.answer_a}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value="B"
                  required
                />
                <span>{question.answer_b}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value="C"
                  required
                />
                <span>{question.answer_c}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value="D"
                  required
                />
                <span>{question.answer_d}</span>
              </label>
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="rounded-2xl bg-slate-950 px-6 py-3 font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Valider le quiz
        </button>
      </form>

      {score !== null && (
        <div className="mt-6 rounded-3xl bg-emerald-50 p-6 text-emerald-800 ring-1 ring-emerald-200">
          <p className="text-xl font-bold">
            Score : {score} / {questions.length}
          </p>

          <p className="mt-2">
            Pourcentage : {Math.round((score / questions.length) * 100)}%
          </p>
        </div>
      )}
    </>
  );
}