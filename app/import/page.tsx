"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "../../utils/supabase/client";

type Chapter = {
  id: string;
  title: string;
  subject_id: string;
};

type AiAnalysis = {
  subject: string;
  chapter: string;
  summary: string;
};

type ImageData = {
  imageBase64: string;
  mimeType: string;
};

type MobileImage = {
  name: string;
  mimeType: string;
  base64: string;
};

const MAX_IMAGES = 5;

function getSlugFromSubjectName(subjectName: string) {
  const name = subjectName.toLowerCase();

  if (name.includes("math")) return "maths";
  if (name.includes("français") || name.includes("francais")) return "francais";
  if (name.includes("anglais")) return "anglais";
  if (name.includes("histoire")) return "histoire";
  if (name.includes("physique")) return "physique";
  if (name.includes("svt")) return "svt";
  if (name.includes("musique")) return "musique";

  return "maths";
}

function cleanAiJson(text: string) {
  return text.replace("```json", "").replace("```", "").trim();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl: string, fileName: string, mimeType: string) {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], fileName, { type: mimeType });
}

export default function ImportPage() {
  const router = useRouter();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedSubjectName, setDetectedSubjectName] = useState("");
  const [detectedChapterName, setDetectedChapterName] = useState("");

  const [qrSessionId, setQrSessionId] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [isCheckingMobilePhotos, setIsCheckingMobilePhotos] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    if (files.length > MAX_IMAGES) {
      alert(`Tu peux importer maximum ${MAX_IMAGES} images.`);
      return;
    }

    const onlyImages = files.every((file) => file.type.startsWith("image/"));

    if (!onlyImages) {
      alert("Choisis uniquement des photos : JPG, JPEG ou PNG.");
      return;
    }

    setSelectedFiles(files);
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
    setDetectedSubjectName("En attente de l'analyse IA");
    setDetectedChapterName("En attente de l'analyse IA");
  }

  async function handleCreateQrSession() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("import_sessions")
      .insert({
        user_id: user.id,
        status: "waiting",
        images: [],
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(error);
      alert("Impossible de créer le QR Code.");
      return;
    }

    setQrSessionId(data.id);
    setShowQr(true);
  }

  async function handleCheckMobilePhotos() {
    if (!qrSessionId) return;

    setIsCheckingMobilePhotos(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("import_sessions")
      .select("images, status")
      .eq("id", qrSessionId)
      .single();

    if (error || !data) {
      console.error(error);
      alert("Impossible de récupérer les photos.");
      setIsCheckingMobilePhotos(false);
      return;
    }

    if (data.status !== "uploaded" || !data.images || data.images.length === 0) {
      alert("Aucune photo reçue pour l'instant. Réessaie après l'envoi depuis le téléphone.");
      setIsCheckingMobilePhotos(false);
      return;
    }

    const mobileImages = data.images as MobileImage[];

    const files = mobileImages.map((image, index) =>
      dataUrlToFile(
        image.base64,
        image.name || `photo-mobile-${index + 1}.jpg`,
        image.mimeType || "image/jpeg"
      )
    );

    setSelectedFiles(files);
    setImagePreviews(mobileImages.map((image) => image.base64));
    setDetectedSubjectName("En attente de l'analyse IA");
    setDetectedChapterName("En attente de l'analyse IA");
    setIsCheckingMobilePhotos(false);
  }

  async function handleAnalyzeCourse() {
    if (selectedFiles.length === 0) {
      alert("Choisis d'abord au moins une photo.");
      return;
    }

    setIsLoading(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const images: ImageData[] = await Promise.all(
      selectedFiles.map(async (file) => ({
        imageBase64: await fileToBase64(file),
        mimeType: file.type,
      }))
    );

    const fileNames = selectedFiles.map((file) => file.name);

    const aiResponse = await fetch("/api/analyze-course", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileNames,
        images,
      }),
    });

    const aiData = await aiResponse.json();

    if (!aiData.success) {
      console.error("Erreur OpenAI :", aiData.error);
      alert("OpenAI n'a pas réussi à analyser les photos.");
      setIsLoading(false);
      return;
    }

    let aiAnalysis: AiAnalysis;

    try {
      aiAnalysis = JSON.parse(cleanAiJson(aiData.result));
    } catch (error) {
      console.error("JSON IA invalide :", aiData.result);
      alert("L'IA a répondu dans un format incorrect.");
      setIsLoading(false);
      return;
    }

    setDetectedSubjectName(aiAnalysis.subject);
    setDetectedChapterName(aiAnalysis.chapter);

    const subjectSlug = getSlugFromSubjectName(aiAnalysis.subject);

    const { data: subject } = await supabase
      .from("subjects")
      .select("id, name, slug")
      .eq("slug", subjectSlug)
      .single();

    let chapter: Chapter | null = null;

    if (subject) {
      const { data: existingChapter } = await supabase
        .from("chapters")
        .select("id, title, subject_id")
        .eq("subject_id", subject.id)
        .eq("title", aiAnalysis.chapter)
        .maybeSingle();

      if (existingChapter) {
        chapter = existingChapter;
      } else {
        const { data: createdChapter, error: chapterError } = await supabase
          .from("chapters")
          .insert({
            title: aiAnalysis.chapter,
            subject_id: subject.id,
          })
          .select("id, title, subject_id")
          .single();

        if (chapterError) {
          console.error(chapterError);
        }

        chapter = createdChapter;
      }
    }

    const mainFileName = selectedFiles.map((file) => file.name).join(", ");

    const { data: newCours, error } = await supabase
      .from("cours")
      .insert({
        user_id: user.id,
        title: aiAnalysis.chapter || selectedFiles[0].name,
        file_name: mainFileName,
        subject_id: subject?.id ?? null,
        chapter_id: chapter?.id ?? null,
        detected_subject: subject?.name ?? aiAnalysis.subject,
        detected_chapter: chapter?.title ?? aiAnalysis.chapter,
        summary: aiAnalysis.summary,
        analysis_status: "done",
      })
      .select()
      .single();

    if (error || !newCours) {
      console.error(error);
      alert("Erreur pendant l'import du cours.");
      setIsLoading(false);
      return;
    }

    router.push(`/cours/${newCours.id}`);
  }

  const mobileUploadUrl =
  qrSessionId
    ? `${process.env.NEXT_PUBLIC_APP_URL}/mobile-upload/${qrSessionId}`
    : "";

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm font-semibold text-purple-700">
          ← Retour au Dashboard
        </Link>

        <div className="mt-8 rounded-3xl bg-white p-10 shadow">
          <h1 className="text-4xl font-bold text-slate-900">

            Importer un cours
          </h1>

          <p className="mt-3 text-lg text-slate-600">
            Choisis jusqu'à {MAX_IMAGES} photos du même cours. L'IA va les lire
            ensemble.
          </p>

          <div className="mt-10 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <h2 className="text-2xl font-bold text-slate-800">
              Ajoute tes photos de cours
            </h2>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <label className="inline-block cursor-pointer rounded-2xl bg-purple-600 px-8 py-4 text-lg font-semibold text-white hover:bg-purple-700">
                Choisir des photos
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleCreateQrSession}
                className="rounded-2xl bg-slate-900 px-8 py-4 text-lg font-semibold text-white hover:bg-slate-800"
              >
                Générer un QR Code
              </button>
            </div>

            {showQr && mobileUploadUrl && (
              <div className="mx-auto mt-8 max-w-md rounded-3xl bg-white p-6 shadow">
                <p className="font-semibold text-slate-800">
                  Scanne ce QR Code avec ton téléphone 📱
                </p>

                <div className="mt-5 flex justify-center">
                  <QRCodeSVG value={mobileUploadUrl} size={220} />
                </div>

                <p className="mt-4 break-all text-sm text-slate-500">
                  {mobileUploadUrl}
                </p>

                <button
                  onClick={handleCheckMobilePhotos}
                  disabled={isCheckingMobilePhotos}
                  className="mt-6 w-full rounded-2xl bg-purple-600 px-6 py-4 font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                >
                  {isCheckingMobilePhotos
                    ? "Vérification..."
                    : "J'ai envoyé les photos depuis le téléphone"}
                </button>
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="mt-8 rounded-3xl bg-white p-6 shadow">
                <p className="font-semibold text-slate-700">
                  {selectedFiles.length} photo(s) sélectionnée(s)
                </p>

                <p className="mt-4 rounded-2xl bg-purple-50 px-4 py-3 font-semibold text-purple-700">
                  Matière détectée : {detectedSubjectName}
                </p>

                <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 font-semibold text-blue-700">
                  Chapitre détecté : {detectedChapterName}
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {imagePreviews.map((preview, index) => (
                    <img
                      key={preview}
                      src={preview}
                      alt={`Aperçu du cours ${index + 1}`}
                      className="mx-auto max-h-[320px] rounded-2xl border object-contain"
                    />
                  ))}
                </div>

                <button
                  onClick={handleAnalyzeCourse}
                  disabled={isLoading}
                  className="mt-8 rounded-2xl bg-slate-900 px-8 py-4 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {isLoading
                    ? "Analyse des photos en cours..."
                    : "Analyser les photos avec l'IA"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}