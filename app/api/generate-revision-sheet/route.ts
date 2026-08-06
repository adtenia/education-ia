import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getSubscriptionAccess, subscriptionRequiredResponse } from "../../../lib/subscription-access";
import { createClient } from "../../../utils/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const revisionNotebookSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    format_version: { type: "string", enum: ["revision_notebook_v1"] },
    title: { type: "string" },
    introduction: {
      type: "object",
      additionalProperties: false,
      properties: {
        overview: { type: "string" },
        learning_goals: { type: "array", maxItems: 5, items: { type: "string" } },
        importance: { type: "string" },
        uses: { type: "array", maxItems: 4, items: { type: "string" } },
      },
      required: ["overview", "learning_goals", "importance", "uses"],
    },
    lesson_sections: {
      type: "array",
      minItems: 1,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          paragraphs: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
        },
        required: ["title", "paragraphs"],
      },
    },
    essential_notions: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          explanation: { type: "string" },
          example: { type: "string" },
        },
        required: ["title", "explanation", "example"],
      },
    },
    definitions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { term: { type: "string" }, definition: { type: "string" } },
        required: ["term", "definition"],
      },
    },
    explained_examples: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          situation: { type: "string" },
          steps: { type: "array", maxItems: 5, items: { type: "string" } },
          why: { type: "string" },
        },
        required: ["title", "situation", "steps", "why"],
      },
    },
    exercises: {
      type: "array",
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          level: { type: "integer", enum: [1, 2, 3] },
          title: { type: "string" },
          instruction: { type: "string" },
          hint: { type: "string" },
          correction: { type: "string" },
        },
        required: ["level", "title", "instruction", "hint", "correction"],
      },
    },
    mini_challenges: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["true_false", "fill_blank", "find_error", "matching", "chronology", "riddle"] },
          instruction: { type: "string" },
          answer: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["type", "instruction", "answer", "explanation"],
      },
    },
    common_mistakes: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: { mistake: { type: "string" }, correction: { type: "string" } },
        required: ["mistake", "correction"],
      },
    },
    tips: { type: "array", maxItems: 8, items: { type: "string" } },
    must_remember: { type: "array", maxItems: 10, items: { type: "string" } },
    two_minute_review: { type: "array", maxItems: 8, items: { type: "string" } },
  },
  required: ["format_version", "title", "introduction", "lesson_sections", "essential_notions", "definitions", "explained_examples", "exercises", "mini_challenges", "common_mistakes", "tips", "must_remember", "two_minute_review"],
} as const;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Non autorisé. Merci de te connecter." }, { status: 401 });

    const subscription = await getSubscriptionAccess();
    if (!subscription.hasAccess) return subscriptionRequiredResponse();

    const { summary, chapter, course } = await request.json();
    const source = course
      ? `Cours structuré, source exclusive :\n${JSON.stringify(course, null, 2)}`
      : `Résumé disponible, source exclusive :\n${summary || "Aucun contenu détaillé disponible."}`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      max_output_tokens: 10000,
      text: {
        format: {
          type: "json_schema",
          name: "revision_notebook",
          strict: true,
          schema: revisionNotebookSchema,
        },
      },
      input: [
        {
          role: "system",
          content: `Tu es un professeur expérimenté qui transforme un cours en carnet de révision moderne, complet et motivant pour un collégien ou un lycéen.

Règles absolues :
- Utilise exclusivement la source fournie. N'ajoute aucune connaissance extérieure et ne fabrique aucun fait, date, formule ou règle.
- Réorganise et explique : ne recopie pas mécaniquement le cours.
- Écris dans un français naturel, précis, chaleureux et pédagogique, sans emoji ni marqueur Markdown.
- Privilégie la qualité et l'utilité de chaque partie. Un tableau vide est préférable à un contenu artificiel.
- L'introduction explique ce que l'élève va apprendre, pourquoi cela compte et les usages réellement justifiables depuis le cours.
- lesson_sections réécrit toute la leçon avec des sous-titres précis, des transitions naturelles et de vrais paragraphes aérés.
- essential_notions contient entre 5 et 8 notions si la richesse du cours le permet. Chaque exemple reste court et peut être vide s'il n'apporte rien.
- Les définitions restent courtes et fidèles.
- Chaque explained_example distingue clairement la situation, les étapes de la démarche et la raison pour laquelle elle fonctionne.
- Crée des exercices de niveaux 1, 2 et 3 seulement à partir des connaissances et méthodes présentes ou raisonnablement applicables depuis la source. La correction doit être fiable et concise.
- Varie les mini-défis selon la matière. Ne force pas un format inadapté au chapitre.
- common_mistakes reste vide si aucune erreur fréquente n'est réellement déductible.
- tips contient uniquement des méthodes ou moyens mnémotechniques fidèles au contenu. N'invente pas d'astuce générale.
- must_remember contient au maximum 10 points très courts.
- two_minute_review contient les dernières vérifications utiles juste avant un contrôle, sans introduire de notion nouvelle.`,
        },
        {
          role: "user",
          content: `Crée le carnet de révision premium du chapitre suivant :\n\n${chapter || "Chapitre non renseigné"}\n\n${source}`,
        },
      ],
    });

    return NextResponse.json({ success: true, content: response.output_text });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) });
  }
}
