"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../../utils/supabase/client";

const MAX_IMAGES = 5;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MobileUploadPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    alert("Photo sélectionnée : " + files.length);

    setErrorMessage("");
    setIsDone(false);

    if (files.length === 0) return;

    if (files.length > MAX_IMAGES) {
      setErrorMessage(`Tu peux envoyer maximum ${MAX_IMAGES} photos.`);
      return;
    }

    const onlyImages = files.every((file) => file.type.startsWith("image/"));

    if (!onlyImages) {
      setErrorMessage("Choisis uniquement des photos : JPG, JPEG ou PNG.");
      return;
    }

    setSelectedFiles(files);
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
  }

  async function handleSendPhotos() {
    alert("Bouton envoyer cliqué");

    if (selectedFiles.length === 0) {
      setErrorMessage("Choisis d'abord au moins une photo.");
      alert("Aucune photo sélectionnée");
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage("");
      setIsDone(false);

      alert("Session utilisée : " + sessionId);

      const supabase = createClient();

      alert("Conversion des photos en cours...");

      const images = await Promise.all(
        selectedFiles.map(async (file) => ({
          name: file.name,
          mimeType: file.type,
          base64: await fileToBase64(file),
        }))
      );

      alert("Photos converties : " + images.length);

      const { data, error } = await supabase
        .from("import_sessions")
        .update({
          images,
          status: "uploaded",
        })
        .eq("id", sessionId)
        .select("id, status, images")
        .maybeSingle();

      alert(
        "Réponse Supabase : " +
          JSON.stringify({
            data,
            error,
          })
      );

      if (error) {
        console.error(error);
        setErrorMessage("Erreur Supabase : " + error.message);
        setIsSending(false);
        return;
      }

      if (!data) {
        setErrorMessage(
          "Aucune session trouvée. Le QR Code n'est peut-être pas le bon."
        );
        setIsSending(false);
        return;
      }

      setIsDone(true);
      setIsSending(false);
    } catch (error) {
      console.error(error);
      alert("Erreur JavaScript : " + String(error));
      setErrorMessage("Erreur JavaScript : " + String(error));
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow">
        <p className="text-sm font-semibold text-purple-700">Education IA</p>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Envoyer les photos
        </h1>

        <p className="mt-3 text-slate-600">
          Cette page sert seulement à envoyer les photos vers l’ordinateur.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          Session QR :
          <span className="ml-1 break-all font-mono text-xs text-slate-500">
            {sessionId}
          </span>
        </div>

        <label className="mt-6 block cursor-pointer rounded-2xl bg-purple-600 px-6 py-4 text-center text-lg font-semibold text-white hover:bg-purple-700">
          Choisir des photos
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {errorMessage && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <p className="font-semibold text-slate-700">
              {selectedFiles.length} photo(s) sélectionnée(s)
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4">
              {imagePreviews.map((preview, index) => (
                <img
                  key={preview}
                  src={preview}
                  alt={`Photo ${index + 1}`}
                  className="max-h-[320px] w-full rounded-2xl border object-contain"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleSendPhotos}
              disabled={isSending}
              className="mt-6 w-full rounded-2xl bg-slate-900 px-6 py-4 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSending ? "Envoi en cours..." : "Envoyer vers l'ordinateur"}
            </button>
          </div>
        )}

        {isDone && (
          <div className="mt-6 rounded-2xl bg-green-50 p-4 font-semibold text-green-700">
            Photos envoyées ✅ Tu peux retourner sur l'ordinateur.
          </div>
        )}
      </div>
    </main>
  );
}