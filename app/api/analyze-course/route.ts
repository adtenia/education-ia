import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ImageInput = {
  imageBase64: string;
  mimeType: string;
};

export async function POST(request: Request) {
  try {
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
    }));

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Tu es un assistant scolaire pour un collégien.

Analyse ces photos qui appartiennent au même cours.

Noms des fichiers :
${fileNames?.join(", ")}

Tu dois répondre uniquement en JSON valide, sans texte autour.

Format exact :

{
  "subject": "...",
  "chapter": "...",
  "summary": "..."
}

Règles :
- subject = matière scolaire détectée
- chapter = chapitre ou thème principal
- summary = résumé clair et simple en français
- Si plusieurs images se complètent, fais un seul résumé global
- Ne parle pas des images, parle seulement du cours
`,
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