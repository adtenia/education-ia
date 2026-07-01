import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Non autorisé. Merci de te connecter." },
        { status: 401 }
      );
    }

    const { summary, chapter } = await request.json();

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
Tu es un professeur.

À partir du chapitre et du résumé ci-dessous, crée exactement 5 questions de quiz.

Chapitre :
${chapter}

Résumé :
${summary}

Réponds UNIQUEMENT en JSON.

Format :

[
  {
    "question": "...",
    "answer_a": "...",
    "answer_b": "...",
    "answer_c": "...",
    "answer_d": "...",
    "correct_answer": "A"
  }
]

correct_answer doit être A, B, C ou D.
`,
    });

    return NextResponse.json({
      success: true,
      content: response.output_text,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      error: String(error),
    });
  }
}