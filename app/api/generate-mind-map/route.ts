import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { getSubscriptionAccess, subscriptionRequiredResponse } from "../../../lib/subscription-access";
import { recordMindMapGenerated } from "../../../lib/progress-events";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const mindMapSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    centralTopic: { type: "string", maxLength: 60 },
    branches: {
      type: "array",
      minItems: 4,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 50 },
          definition: { type: "string", maxLength: 180 },
          rule: { type: "string", maxLength: 160 },
          example: { type: "string", maxLength: 180 },
          children: {
            type: "array",
            maxItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string", maxLength: 50 },
                content: { type: "string", maxLength: 160 },
              },
              required: ["title", "content"],
            },
          },
        },
        required: ["title", "definition", "rule", "example", "children"],
      },
    },
  },
  required: ["centralTopic", "branches"],
} as const;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Non autorisé. Merci de te connecter." },
        { status: 401 }
      );
    }

    const subscription = await getSubscriptionAccess();
    if (!subscription.hasAccess) return subscriptionRequiredResponse();

    const { courseId, course, summary, title } = await request.json();
    if (typeof courseId !== "string" || !courseId) {
      return NextResponse.json({ success: false, error: "Cours manquant." }, { status: 400 });
    }

    const { data: ownedCourse } = await supabase
      .from("cours")
      .select("id")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!ownedCourse) {
      return NextResponse.json({ success: false, error: "Cours introuvable." }, { status: 404 });
    }
    const hasCourse = course && typeof course === "object";

    if (!hasCourse && (typeof summary !== "string" || !summary.trim())) {
      return NextResponse.json({ success: false, error: "Contenu du cours absent." }, { status: 400 });
    }

    const source = hasCourse
      ? `Cours structuré, source exclusive :\n${JSON.stringify(course, null, 2)}`
      : `Résumé disponible, source exclusive :\n${summary}`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      max_output_tokens: 4000,
      text: {
        format: {
          type: "json_schema",
          name: "educational_mind_map",
          strict: true,
          schema: mindMapSchema,
        },
      },
      input: [
        {
          role: "system",
          content: `Tu construis une carte mentale scolaire réellement utile pour comprendre et réviser un cours.

Règles impératives :
- Utilise exclusivement les informations présentes dans la source fournie.
- Crée entre 4 et 7 branches principales distinctes.
- Chaque titre de branche nomme une notion précise et reste très court.
- N'utilise jamais comme titre isolé « Définition », « À retenir » ou une opposition vague comme « COD versus COI ».
- Pour chaque branche, écris une définition simple et complète.
- Le champ rule donne un critère, une question ou un test concret pour reconnaître la notion.
- Le champ example contient un exemple précis tiré ou raisonnablement reformulé depuis la source.
- children contient uniquement une erreur fréquente, une exception, un test supplémentaire ou un moyen mnémotechnique utile.
- Chaque phrase est courte, autonome et compréhensible par un collégien ou un lycéen.
- Aucun paragraphe long, aucun emoji et aucune information inventée.
- Si deux notions sont opposées, crée une branche distincte pour chacune.`,
        },
        {
          role: "user",
          content: `Titre actuel : ${typeof title === "string" ? title : "Cours"}\n\n${source}`,
        },
      ],
    });

    const result = JSON.parse(response.output_text);
    await recordMindMapGenerated({ courseId });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) });
  }
}
