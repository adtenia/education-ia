import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { getSubscriptionAccess, subscriptionRequiredResponse } from "../../../lib/subscription-access";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ImageInput = {
  imageBase64: string;
  mimeType: string;
};

const courseResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject: { type: "string" },
    chapter: { type: "string" },
    summary: {
      type: "string",
      minLength: 600,
      maxLength: 1400,
    },
    course: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        introduction: { type: "string" },
        sections: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              paragraphs: { type: "array", items: { type: "string" } },
              key_points: { type: "array", items: { type: "string" } },
              definitions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    term: { type: "string" },
                    definition: { type: "string" },
                  },
                  required: ["term", "definition"],
                },
              },
              examples: { type: "array", items: { type: "string" } },
            },
            required: [
              "title",
              "paragraphs",
              "key_points",
              "definitions",
              "examples",
            ],
          },
        },
        important_points: { type: "array", items: { type: "string" } },
        conclusion: { type: "string" },
      },
      required: [
        "title",
        "introduction",
        "sections",
        "important_points",
        "conclusion",
      ],
    },
  },
  required: ["subject", "chapter", "summary", "course"],
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

    const { fileNames, images } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Aucune image reçue.",
      });
    }

    if (images.length > 5) {
      return NextResponse.json({
        success: false,
        error: "Maximum 5 images par cours.",
      });
    }

    const imageContents = images.map((image: ImageInput) => ({
      type: "input_image" as const,
      image_url: `data:${image.mimeType};base64,${image.imageBase64}`,
      detail: "high" as const,
    }));

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      max_output_tokens: 8000,
      text: {
        format: {
          type: "json_schema",
          name: "structured_course",
          strict: true,
          schema: courseResponseSchema,
        },
      },
      input: [
        {
          role: "system",
          content: `Tu es un professeur expérimenté qui transforme des photographies d'un même cours en un cours structuré, fidèle et pédagogique, adapté à un collégien ou à un lycéen.

Ta priorité est de restituer toutes les informations lisibles dans leur ordre logique, sans rien inventer. Tu dois produire un vrai cours développé, et non un simple résumé.

Règles impératives :
- Écris dans un français naturel, précis et pédagogique.
- N'utilise aucun emoji.
- Organise le cours en 3 à 6 sections selon la quantité et la structure du contenu visible.
- Rédige au moins 2 paragraphes développés par section lorsque les images contiennent assez d'informations.
- Couvre toutes les informations lisibles et conserve l'ordre logique du cours.
- Inclus les définitions, dates, règles, formules et exemples uniquement lorsqu'ils sont présents dans les images ou raisonnablement déductibles de leur contenu.
- Ne complète jamais le cours avec des connaissances supposées qui ne sont pas étayées par les images.
- Signale explicitement dans le passage concerné toute information illisible, incomplète ou ambiguë.
- Si le contenu visible est insuffisant pour respecter une exigence de longueur ou de structure, reste fidèle aux images et n'invente pas pour remplir.
- Le champ summary est un résumé développé de compatibilité, compris entre 120 et 200 mots. Il synthétise les notions essentielles sans remplacer le cours complet.
- Le contenu complet et développé doit être placé dans course.`,
        },
        {
          role: "user",
          content: [
            {
              type: "input_text" as const,
              text: `Analyse les images jointes, qui appartiennent toutes au même cours, puis produis le cours structuré demandé.

Noms des fichiers :
${fileNames?.join(", ") || "Non renseignés"}

Appuie-toi sur les images comme source principale. Identifie la matière et le chapitre, puis restitue le contenu complet dans course.`,
            },
            ...imageContents,
          ],
        },
      ],
    });

    return NextResponse.json({
      success: true,
      result: response.output_text,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      error: String(error),
    });
  }
}
