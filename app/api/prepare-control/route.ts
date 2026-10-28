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
      max_output_tokens: 5000,
      input: [
        { role: "system", content: `Tu es un excellent enseignant français qui entraîne activement un élève à son contrôle. Renvoie UNIQUEMENT un objet JSON valide, sans Markdown ni balises, de la forme {"title":"...","intro":"une phrase motivante et utile","lessons":[{"topic":"notion","explanation":"explication claire en 2-4 phrases","example":"exemple concret résolu"}],"questions":[{"topic":"chapitre","question":"question précise","choices":["choix A","choix B","choix C","choix D"],"correctIndex":0,"explanation":"correction pédagogique en 2-4 phrases expliquant pourquoi et comment","hint":"indice sans donner la réponse"}],"missing":"ce qui manque dans les sources, ou chaîne vide"}. Produis entre 4 et 6 mini-leçons et exactement 8 questions de QCM, avec 4 choix et une seule bonne réponse par question. Varie les chapitres, les compétences, les niveaux et les types de raisonnement, avec des distracteurs plausibles. La réponse ne doit PAS être une fiche longue : le parcours affichera les questions une par une. Niveau scolaire: ${schoolClass}. Note visée: ${target}/20. Date du contrôle: ${date}. Utilise exclusivement les cours fournis pour les faits et compétences, ne fabrique pas de connaissances absentes, n'affirme pas que l'élève obtiendra une note. Si une source est insuffisante, renseigne missing. Ne produis aucun HTML ni lien. Toutes les chaînes sont en français.` },
        { role: "user", content: JSON.stringify(source) },
      ],
    });
    let parsed: unknown;
    try {
      const raw = result.output_text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "L'IA n'a pas renvoyé un entraînement valide. Réessaie." }, { status: 502 });
    }
    const data = parsed as Record<string, unknown>;
    const lessons = Array.isArray(data.lessons) ? data.lessons.filter((x: unknown) => {
      const v = x as Record<string, unknown>;
      return v && typeof v.topic === "string" && typeof v.explanation === "string" && typeof v.example === "string";
    }).slice(0, 6) : [];
    const questions = Array.isArray(data.questions) ? data.questions.filter((x: unknown) => {
      const v = x as Record<string, unknown>;
      return v && typeof v.question === "string" && Array.isArray(v.choices) && v.choices.length === 4
        && v.choices.every((choice: unknown) => typeof choice === "string")
        && Number.isInteger(v.correctIndex) && Number(v.correctIndex) >= 0 && Number(v.correctIndex) <= 3
        && typeof v.explanation === "string" && typeof v.hint === "string";
    }).slice(0, 8) : [];
    if (!questions.length || !lessons.length) {
      return NextResponse.json({ error: "La séance générée est incomplète. Réessaie." }, { status: 502 });
    }
    return NextResponse.json({ session: {
      title: typeof data.title === "string" ? data.title : "Préparation au contrôle",
      intro: typeof data.intro === "string" ? data.intro : "",
      missing: typeof data.missing === "string" ? data.missing : "",
      lessons, questions,
    } });
  } catch (error) {
    console.error("Exam preparation failed", error);
    return NextResponse.json({ error: "La préparation n'a pas pu être générée. Réessaie." }, { status: 500 });
  }
}
