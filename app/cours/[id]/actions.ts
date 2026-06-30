"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";

type QuizQuestion = {
  question: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  correct_answer: "A" | "B" | "C" | "D";
};

function cleanAiJson(text: string) {
  return text.replace("```json", "").replace("```", "").trim();
}

export async function deleteCours(coursId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("revision_sheets").delete().eq("cours_id", coursId);
  await supabase.from("quiz").delete().eq("cours_id", coursId);

  await supabase
    .from("cours")
    .delete()
    .eq("id", coursId)
    .eq("user_id", user.id);

  redirect("/cours");
}

export async function createRevisionSheet(coursId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cours } = await supabase
    .from("cours")
    .select("*")
    .eq("id", coursId)
    .eq("user_id", user.id)
    .single();

  if (!cours) redirect("/cours");

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/generate-revision-sheet`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: cours.summary || "",
        chapter: cours.detected_chapter || cours.title || "Chapitre",
      }),
    }
  );

  const result = await response.json();

  if (!result.success) {
    console.error(result.error);
    redirect(`/cours/${coursId}`);
  }

  await supabase.from("revision_sheets").insert({
    user_id: user.id,
    cours_id: coursId,
    title: `Fiche de révision - ${cours.detected_chapter || cours.title}`,
    content: result.content,
  });

  redirect(`/cours/${coursId}`);
}

export async function createQuiz(coursId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cours } = await supabase
    .from("cours")
    .select("*")
    .eq("id", coursId)
    .eq("user_id", user.id)
    .single();

  if (!cours) redirect("/cours");

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/generate-quiz`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: cours.summary || "",
        chapter: cours.detected_chapter || cours.title || "Chapitre",
      }),
    }
  );

  const result = await response.json();

  if (!result.success) {
    console.error(result.error);
    redirect(`/cours/${coursId}`);
  }

  let questions: QuizQuestion[] = [];

  try {
    questions = JSON.parse(cleanAiJson(result.content));
  } catch (error) {
    console.error("JSON quiz invalide :", result.content);
    redirect(`/cours/${coursId}`);
  }

  const { data: quiz, error: quizError } = await supabase
    .from("quiz")
    .insert({
      user_id: user.id,
      cours_id: coursId,
      title: `Quiz - ${cours.detected_chapter || cours.title}`,
      score: null,
    })
    .select()
    .single();

  if (quizError || !quiz) {
    console.error(quizError);
    redirect(`/cours/${coursId}`);
  }

  const questionsToInsert = questions.map((question) => ({
    quiz_id: quiz.id,
    question: question.question,
    answer_a: question.answer_a,
    answer_b: question.answer_b,
    answer_c: question.answer_c,
    answer_d: question.answer_d,
    correct_answer: question.correct_answer,
  }));

  await supabase.from("quiz_questions").insert(questionsToInsert);

  redirect(`/cours/${coursId}`);
}