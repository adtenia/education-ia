import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { getSubscriptionAccess, subscriptionRequiredResponse } from "../../../lib/subscription-access";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Connexion nécessaire." }, { status: 401 });
    const subscription = await getSubscriptionAccess();
    if (!subscription.hasAccess) return subscriptionRequiredResponse();

    const body = await request.json();
    const ids = Array.isArray(body.courseIds)
      ? [...new Set(body.courseIds.filter((x: unknown): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)))].slice(0, 8)
      : [];
    const target = Number(body.target);
    const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : "";
    if (!ids.length || !Number.isInteger(target) || target < 5 || target > 20 || !date) {
      return NextResponse.json({ error: "Choisis des cours, une date et une note visée entre 5 et 20." }, { status: 400 });
    }

    const { data: courses, error } = await supabase.from("cours")
      .select("id,title,detected_subject,detected_chapter,summary,course_content")
      .eq("user_id", user.id).in("id", ids);
    if (error || !courses || courses.length !== ids.length) {
      return NextResponse.json({ error: "Certains cours ne sont pas accessibles." }, { status: 403 });
    }

    const schoolClass = typeof user.user_metadata?.school_class === "string" ? user.user_metadata.school_class : "non renseignée";
    const source = courses.map((course, index) => ({
      index: index + 1, subject: course.detected_subject, chapter: course.detected_chapter,
      title: course.title, summary: String(course.summary || "").slice(0, 3500),
      content: JSON.stringify(course.course_content || "").slice(0, 7000),
    }));
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.responses.create({
      model: "gpt-4.1-mini",
      max_output_tokens: 4000,
      input: [
        { role: "system", content: `Tu es un enseignant qui prépare réellement un élève à un contrôle. Réponds en français avec du Markdown clair, structuré, sans emoji. Construis : 1) les objectifs d'apprentissage par chapitre, 2) les explications détaillées des notions difficiles avec exemples tirés des sources, 3) 6 exercices progressifs variés et réalisables, 4) les corrections détaillées séparées à la fin, 5) une méthode de vérification de la maîtrise et les erreurs fréquentes justifiées par les sources. Niveau scolaire: ${schoolClass}. Note visée: ${target}/20. Date du contrôle: ${date}. Utilise uniquement les cours fournis pour les faits et compétences. N'invente ni programme officiel, ni connaissances absentes, ni prédiction de note. Si les sources sont incomplètes, précise ce qui manque. Ne donne pas la correction immédiatement après chaque exercice.` },
        { role: "user", content: JSON.stringify(source) },
      ],
    });
    return NextResponse.json({ content: result.output_text });
  } catch (error) {
    console.error("Exam preparation failed", error);
    return NextResponse.json({ error: "La préparation n'a pas pu être générée. Réessaie." }, { status: 500 });
  }
}
