import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { getSubscriptionAccess, subscriptionRequiredResponse } from "../../../lib/subscription-access";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const quizSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          answer_a: { type: "string" },
          answer_b: { type: "string" },
          answer_c: { type: "string" },
          answer_d: { type: "string" },
          correct_answer: { type: "string", enum: ["A", "B", "C", "D"] },
          explanation: { type: "string" },
          topic: { type: "string" },
          topic_key: { type: "string", pattern: "^[a-z0-9]+(_[a-z0-9]+)*$" },
        },
        required: [
          "question",
          "answer_a",
          "answer_b",
          "answer_c",
          "answer_d",
          "correct_answer",
          "explanation",
          "topic",
          "topic_key",
        ],
      },
    },
  },
  required: ["questions"],
} as const;

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

    const subscription = await getSubscriptionAccess();
    if (!subscription.hasAccess) return subscriptionRequiredResponse();

    const { summary, chapter, course } = await request.json();
    const source = course
      ? `Cours structuré :\n${JSON.stringify(course, null, 2)}`
      : `Résumé disponible :\n${summary || "Aucun contenu détaillé disponible."}`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      max_output_tokens: 5000,
      text: {
        format: {
          type: "json_schema",
          name: "course_quiz",
          strict: true,
          schema: quizSchema,
        },
      },
      input: [
        {
          role: "system",
          content: `Tu es un professeur qui crée des quiz de révision fiables pour collégiens et lycéens.

Règles impératives :
- Crée exactement 8 questions variées couvrant les notions principales de la source.
- Chaque question possède quatre réponses plausibles et une seule bonne réponse.
- Répartis les bonnes réponses entre A, B, C et D.
- Ajoute pour chaque question une explication pédagogique concise qui justifie la bonne réponse.
- Associe chaque question à un topic court, précis et lisible qui nomme la compétence réellement évaluée, par exemple "Addition de fractions" ou "Reconnaître un COD".
- Associe aussi un topic_key pédagogique stable : uniquement des minuscules sans accent, des chiffres si nécessaires et des mots séparés par des underscores.
- Le topic_key ne contient ni article ni phrase et reste assez précis pour distinguer deux compétences, par exemple "fractions_addition", "cod_identification" ou "proportionnalite".
- Réutilise exactement le même topic_key lorsque plusieurs questions évaluent réellement la même compétence.
- N'utilise jamais la matière générale, le niveau scolaire ou le nom générique du chapitre comme topic.
- N'invente aucune connaissance qui ne soit pas présente ou raisonnablement déductible de la source.
- N'utilise aucun emoji.
- Écris dans un français naturel, précis et adapté au niveau du cours.`,
        },
        {
          role: "user",
          content: `Crée le quiz pour le chapitre suivant :

${chapter || "Chapitre non renseigné"}

${source}`,
        },
      ],
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
