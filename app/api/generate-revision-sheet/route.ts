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

    const { summary, chapter, course } = await request.json();
    const source = course
      ? `Cours structuré :\n${JSON.stringify(course, null, 2)}`
      : `Résumé disponible :\n${summary || "Aucun contenu détaillé disponible."}`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      max_output_tokens: 4000,
      input: [
        {
          role: "system",
          content: `Tu es un professeur expérimenté. Tu crées une fiche de révision complète, fidèle et immédiatement utile à un collégien ou à un lycéen.

Règles impératives :
- Écris uniquement en Markdown standard, sans bloc de code et sans HTML.
- N'utilise aucun emoji.
- N'invente aucune information absente de la source.
- Utilise un titre de niveau 1, puis des titres de niveau 2 et 3.
- Mets en gras les notions essentielles avec parcimonie.
- Utilise des listes courtes et lisibles.
- Fais ressortir les définitions sous forme de citations Markdown commençant par le terme en gras.
- Prévois les parties suivantes lorsqu'elles sont pertinentes : notions essentielles, définitions, dates ou formules, méthodes, exemples, erreurs à éviter et points à mémoriser.
- La fiche doit être synthétique mais substantielle, avec des formulations pédagogiques complètes.
- Ne reproduis pas les marqueurs ou commentaires techniques de la source.`,
        },
        {
          role: "user",
          content: `Crée une fiche de révision premium pour le chapitre suivant :

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
