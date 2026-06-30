import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { summary, chapter } = await request.json();

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
Tu es un professeur.

À partir du résumé suivant, crée une fiche de révision claire pour un élève de collège.

Chapitre :
${chapter}

Résumé :
${summary}

Format :

# 📚 Fiche de révision

## ⭐ Points importants

## 🧠 Définitions

## ⚠️ Pièges à éviter

## ✅ À retenir pour le contrôle
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