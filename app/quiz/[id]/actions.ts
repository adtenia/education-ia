"use server";

import { createClient } from "../../../utils/supabase/server";

export async function saveQuizScore(quizId: string, score: number) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("USER ERROR:", userError);
  console.log("USER ID:", user?.id);
  console.log("QUIZ ID:", quizId);
  console.log("SCORE:", score);

  if (!user) {
    console.log("STOP: aucun utilisateur");
    return;
  }

  const { data: updatedQuiz, error: updateQuizError } = await supabase
    .from("quiz")
    .update({
      score,
    })
    .eq("id", quizId)
    .select();

  console.log("UPDATED QUIZ:", updatedQuiz);
  console.log("UPDATE QUIZ ERROR:", updateQuizError);

  const { data: quiz, error: quizError } = await supabase
    .from("quiz")
    .select("id, cours_id")
    .eq("id", quizId)
    .single();

  console.log("QUIZ:", quiz);
  console.log("QUIZ ERROR:", quizError);

  if (!quiz?.cours_id) {
    console.log("STOP: aucun cours_id trouvé");
    return;
  }

  const { data: cours, error: coursError } = await supabase
    .from("cours")
    .select("id, subject_id")
    .eq("id", quiz.cours_id)
    .single();

  console.log("COURS:", cours);
  console.log("COURS ERROR:", coursError);

  if (!cours?.subject_id) {
    console.log("STOP: aucun subject_id trouvé dans le cours");
    return;
  }

  const { data: existingProgress, error: progressSelectError } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("subject_id", cours.subject_id)
    .maybeSingle();

  console.log("EXISTING PROGRESS:", existingProgress);
  console.log("PROGRESS SELECT ERROR:", progressSelectError);

  if (existingProgress) {
    const newMastery = Math.round(
      (existingProgress.mastery_percent + score) / 2
    );

    const { data: updatedProgress, error: updateProgressError } =
      await supabase
        .from("progress")
        .update({
          mastery_percent: newMastery,
        })
        .eq("id", existingProgress.id)
        .select();

    console.log("UPDATED PROGRESS:", updatedProgress);
    console.log("UPDATE PROGRESS ERROR:", updateProgressError);
  } else {
    const { data: insertedProgress, error: insertProgressError } =
      await supabase
        .from("progress")
        .insert({
          user_id: user.id,
          subject_id: cours.subject_id,
          mastery_percent: score,
        })
        .select();

    console.log("INSERTED PROGRESS:", insertedProgress);
    console.log("INSERT PROGRESS ERROR:", insertProgressError);
  }
}