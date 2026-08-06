import "server-only";

import { createClient } from "../utils/supabase/server";

type ProgressResult = {
  eventId: string | null;
  error: string | null;
};

export type QuizAnswerRpcInput = {
  question_id: string;
  selected_answer: "A" | "B" | "C" | "D";
};

type QuizAttemptRpcData = {
  event_id?: unknown;
  score?: unknown;
  correct_answers?: unknown;
  questions_count?: unknown;
  attempt_id?: unknown;
  already_recorded?: unknown;
};

export type QuizAttemptResult = {
  eventId: string | null;
  score: number | null;
  correctAnswers: number | null;
  questionsCount: number | null;
  attemptId: string;
  alreadyRecorded: boolean;
  error: string | null;
};

async function rpcResult(
  functionName: string,
  parameters: Record<string, unknown>
): Promise<ProgressResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(functionName, parameters);

  if (error) {
    console.error(`[progress] ${functionName} non enregistré`, {
      code: error.code,
    });
    return { eventId: null, error: error.message };
  }

  console.info(`[progress] ${functionName} traité avec succès`);
  return { eventId: typeof data === "string" ? data : null, error: null };
}

export async function recordQuizAttemptDetails(input: {
  quizId: string;
  attemptId: string;
  answers: QuizAnswerRpcInput[];
}): Promise<QuizAttemptResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_quiz_attempt_details", {
    p_quiz_id: input.quizId,
    p_attempt_id: input.attemptId,
    p_answers: input.answers,
  });

  if (error) {
    console.error("[progress] tentative détaillée non enregistrée", {
      code: error.code,
    });
    return {
      eventId: null,
      score: null,
      correctAnswers: null,
      questionsCount: null,
      attemptId: input.attemptId,
      alreadyRecorded: false,
      error: "La tentative n’a pas pu être enregistrée.",
    };
  }

  const result = (data ?? {}) as QuizAttemptRpcData;
  const score = Number(result.score);
  const correctAnswers = Number(result.correct_answers);
  const questionsCount = Number(result.questions_count);

  console.info("[progress] tentative détaillée enregistrée avec succès");
  return {
    eventId: typeof result.event_id === "string" ? result.event_id : null,
    score: Number.isFinite(score) ? score : null,
    correctAnswers: Number.isFinite(correctAnswers) ? correctAnswers : null,
    questionsCount: Number.isFinite(questionsCount) ? questionsCount : null,
    attemptId: typeof result.attempt_id === "string" ? result.attempt_id : input.attemptId,
    alreadyRecorded: result.already_recorded === true,
    error: null,
  };
}

export async function recordMindMapGenerated(input: {
  courseId: string;
  generationId?: string;
}) {
  return rpcResult("record_mind_map_generation", {
    p_course_id: input.courseId,
    p_generation_id: input.generationId || "default",
  });
}

export async function startRevisionSession(input: {
  courseId?: string | null;
  activityType?: string;
}) {
  return rpcResult("start_revision_session", {
    p_course_id: input.courseId || null,
    p_activity_type: input.activityType || "revision",
  });
}

export async function finishRevisionSession(sessionId: string) {
  return rpcResult("finish_revision_session", { p_session_id: sessionId });
}
