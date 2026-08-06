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
      minLength: 1,
      maxLength: 5000,
    },
    course: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        introduction: { type: "string" },
        summary_overview: {
          type: "object",
          additionalProperties: false,
          properties: {
            introduction: { type: "string" },
            sections: {
              type: "array",
              minItems: 2,
              maxItems: 5,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  paragraphs: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
                  definition: { type: "string" },
                  example: { type: "string" },
                },
                required: ["title", "paragraphs", "definition", "example"],
              },
            },
            must_remember: { type: "array", maxItems: 5, items: { type: "string" } },
            common_mistakes: { type: "array", maxItems: 5, items: { type: "string" } },
            conclusion: { type: "string" },
          },
          required: ["introduction", "sections", "must_remember", "common_mistakes", "conclusion"],
        },
        sections: {
          type: "array",
          minItems: 1,
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              short_intro: { type: "string" },
              paragraphs: { type: "array", maxItems: 4, items: { type: "string" } },
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
              formulas: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    expression: { type: "string" },
                    explanation: { type: "string" },
                  },
                  required: ["expression", "explanation"],
                },
              },
              dates: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    date: { type: "string" },
                    event: { type: "string" },
                  },
                  required: ["date", "event"],
                },
              },
              common_mistakes: { type: "array", items: { type: "string" } },
              exam_tips: { type: "array", items: { type: "string" } },
            },
            required: [
              "title",
              "short_intro",
              "paragraphs",
              "key_points",
              "definitions",
              "examples",
              "formulas",
              "dates",
              "common_mistakes",
              "exam_tips",
            ],
          },
        },
        important_points: { type: "array", items: { type: "string" } },
        conclusion: { type: "string" },
      },
      required: [
        "title",
        "introduction",
        "summary_overview",
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
- Organise le cours en 1 à 6 sections selon la quantité et la structure réellement visibles. Ne crée jamais une section pour atteindre artificiellement un minimum.
- Donne à chaque section un titre précis et un short_intro d'une ou deux phrases qui annonce clairement ce qu'elle permet de comprendre.
- Rédige 2 à 4 paragraphes courts et développés par section lorsque les images contiennent assez d'informations. Chaque paragraphe doit traiter une seule idée et éviter les répétitions.
- Couvre toutes les informations lisibles et conserve l'ordre logique du cours.
- Inclus les définitions, dates, règles, formules et exemples uniquement lorsqu'ils sont présents dans les images ou raisonnablement déductibles de leur contenu.
- Sépare les définitions, exemples, formules, dates, erreurs fréquentes et conseils d'examen dans leurs champs dédiés au lieu de les enfouir dans de longs paragraphes.
- Laisse les tableaux correspondants vides lorsqu'aucun élément n'est présent ou solidement justifiable. Un champ vide est préférable à une invention.
- N'ajoute une erreur fréquente ou un conseil d'examen que si le contenu du cours permet réellement de le justifier.
- Ne complète jamais le cours avec des connaissances supposées qui ne sont pas étayées par les images.
- Signale explicitement dans le passage concerné toute information illisible, incomplète ou ambiguë.
- Si le contenu visible est insuffisant pour respecter une exigence de longueur ou de structure, reste fidèle aux images et n'invente pas pour remplir.
- Le champ summary reste une version textuelle de compatibilité fidèle à la synthèse structurée.
- summary_overview est une vraie synthèse éditoriale rédigée par un professeur, et non une collection de cartes ou de phrases télégraphiques.
- Adapte sa longueur à la richesse des images : environ 250 à 400 mots pour un cours court, 400 à 600 mots pour un cours moyen et jusqu'à 700 mots pour un chapitre riche. Ne remplis jamais artificiellement.
- Son introduction contient 2 à 4 phrases qui présentent le sujet et annoncent naturellement les idées du chapitre.
- Organise ensuite la synthèse en 2 à 5 grandes sections aux sous-titres précis. Chaque section contient 1 à 3 paragraphes développés, reliés par des transitions naturelles et centrés sur une progression logique.
- Évite les répétitions entre l'introduction, les sections, le cours complet et la conclusion, tout en conservant les détails indispensables à la compréhension.
- Le champ definition d'une section reste vide sauf si une définition centrale mérite réellement un encadré distinct.
- Le champ example reste vide sauf si une application courte améliore réellement la compréhension et peut être construite fidèlement depuis les images.
- must_remember contient au maximum 5 formulations très courtes, sans répéter mot pour mot les idées essentielles.
- common_mistakes reste vide si les images ne permettent pas d'identifier une erreur ou un piège avec certitude.
- La conclusion de summary_overview contient 2 ou 3 phrases et relie les idées principales sans ajouter de nouvelle notion.
- Le corps principal doit rester fluide : réserve les listes et encadrés aux définitions, exemples, points à retenir et pièges.
- N'utilise aucun marqueur Markdown dans les chaînes : pas de #, ##, **, listes avec tirets ou séparateurs ---.
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
