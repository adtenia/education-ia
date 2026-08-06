import "server-only";

import { randomUUID } from "node:crypto";
import { createClient } from "../utils/supabase/server";

type ProgressResult = {
  eventId: string | null;
  error: string | null;
};

async function rpcResult(
  functionName: string,
  parameters: Record<string, unknown>
): Promise<ProgressResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(functionName, parameters);

  if (error) {
    console.error(`[progress] ${functionName} impossible :`, error.message);
    return { eventId: null, error: error.message };
  }

  return { eventId: typeof data === "string" ? data : null, error: null };
}

export async function recordQuizCompleted(input: {
  quizId: string;
  score: number;
  attemptId?: string;
}) {
  return rpcResult("record_quiz_completion", {
    p_quiz_id: input.quizId,
    p_score: input.score,
    p_attempt_id: input.attemptId || randomUUID(),
  });
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
