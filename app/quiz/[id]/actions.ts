"use server";

import { createClient } from "../../../utils/supabase/server";
import {
  recordQuizAttemptDetails,
  type QuizAnswerRpcInput,
} from "../../../lib/progress-events";

type AnswerLetter = "A" | "B" | "C" | "D";

export type QuizAnswerInput = {
  questionId: string;
  selectedAnswer: AnswerLetter;
};

export type SaveQuizResult = {
  success: boolean;
  score: number | null;
  correctAnswers: number | null;
  questionsCount: number | null;
  error: string | null;
};

export async function saveQuizScore(
  quizId: string,
  answers: QuizAnswerInput[],
  attemptId: string
): Promise<SaveQuizResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(userError);
  }

  if (!user) {
    return { success: false, score: null, correctAnswers: null, questionsCount: null, error: "Tu dois être connecté pour valider ce quiz." };
  }

  const allowedAnswers = new Set<AnswerLetter>(["A", "B", "C", "D"]);
  if (!quizId || !attemptId || !Array.isArray(answers) || answers.length === 0) {
    return { success: false, score: null, correctAnswers: null, questionsCount: null, error: "Les réponses envoyées sont invalides." };
  }

  if (answers.some((answer) => !answer.questionId || !allowedAnswers.has(answer.selectedAnswer))) {
    return { success: false, score: null, correctAnswers: null, questionsCount: null, error: "Une réponse du quiz est invalide." };
  }

  // Convention explicite à la frontière SQL : React utilise le camelCase,
  // tandis que le RPC PostgreSQL reçoit exclusivement du snake_case.
  const rpcAnswers: QuizAnswerRpcInput[] = answers.map((answer) => ({
    question_id: answer.questionId,
    selected_answer: answer.selectedAnswer,
  }));

  const attempt = await recordQuizAttemptDetails({
    quizId,
    attemptId,
    answers: rpcAnswers,
  });

  if (attempt.error || attempt.score === null) {
    return {
      success: false,
      score: null,
      correctAnswers: null,
      questionsCount: null,
      error: attempt.error || "Le score du quiz n’a pas pu être calculé.",
    };
  }

  const { data: quiz, error: quizError } = await supabase
    .from("quiz")
    .select("id, cours_id")
    .eq("id", quizId)
    .single();

  if (quizError) {
    console.error(quizError);
  }

  if (!quiz?.cours_id) {
    return {
      success: true,
      score: attempt.score,
      correctAnswers: attempt.correctAnswers,
      questionsCount: attempt.questionsCount,
      error: null,
    };
  }

  // Le RPC détaillé est idempotent. Ne recompte pas la progression historique
  // par chapitre si le navigateur rejoue exactement la même tentative.
  if (attempt.alreadyRecorded) {
    return {
      success: true,
      score: attempt.score,
      correctAnswers: attempt.correctAnswers,
      questionsCount: attempt.questionsCount,
      error: null,
    };
  }

  const { data: cours, error: coursError } = await supabase
    .from("cours")
    .select("id, chapter_id")
    .eq("id", quiz.cours_id)
    .single();

  if (coursError) {
    console.error(coursError);
  }

  if (!cours?.chapter_id) {
    console.error(
      `Quiz ${quizId} rattaché à un cours sans chapter_id : progression par chapitre non mise à jour.`
    );
    return {
      success: true,
      score: attempt.score,
      correctAnswers: attempt.correctAnswers,
      questionsCount: attempt.questionsCount,
      error: null,
    };
  }

  const { error: progressError } = await supabase.rpc("record_quiz_attempt", {
    p_chapter_id: cours.chapter_id,
    p_score: attempt.score,
  });

  if (progressError) {
    console.error(progressError);
  }

  return {
    success: true,
    score: attempt.score,
    correctAnswers: attempt.correctAnswers,
    questionsCount: attempt.questionsCount,
    error: null,
  };
}
