"use server";

import { createClient } from "../../../utils/supabase/server";
import { recordQuizCompleted } from "../../../lib/progress-events";

export async function saveQuizScore(
  quizId: string,
  score: number,
  attemptId?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(userError);
  }

  if (!user) {
    return;
  }

  const { error: updateQuizError } = await supabase
    .from("quiz")
    .update({
      score,
    })
    .eq("id", quizId)
    .eq("user_id", user.id)
    .select();

  if (updateQuizError) {
    console.error(updateQuizError);
    return;
  }

  await recordQuizCompleted({ quizId, score, attemptId });

  const { data: quiz, error: quizError } = await supabase
    .from("quiz")
    .select("id, cours_id")
    .eq("id", quizId)
    .single();

  if (quizError) {
    console.error(quizError);
  }

  if (!quiz?.cours_id) {
    return;
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
    return;
  }

  const { error: progressError } = await supabase.rpc("record_quiz_attempt", {
    p_chapter_id: cours.chapter_id,
    p_score: score,
  });

  if (progressError) {
    console.error(progressError);
  }
}
