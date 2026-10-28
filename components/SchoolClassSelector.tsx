"use client";

import { useState } from "react";
import { createClient } from "../utils/supabase/client";

export const SCHOOL_CLASSES = [
  "6e", "5e", "4e", "3e",
  "Seconde", "Première", "Terminale",
] as const;

export default function SchoolClassSelector({ initialClass }: { initialClass: string | null }) {
  const [selected, setSelected] = useState(initialClass || "");
  const [saved, setSaved] = useState(initialClass || "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveClass() {
    if (!SCHOOL_CLASSES.some((item) => item === selected)) {
      setError("Choisis une classe dans la liste.");
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: { school_class: selected },
      });
      if (updateError) throw updateError;
      setSaved(selected);
      setMessage("Ta classe a bien été enregistrée. Les prochains quiz utiliseront ce niveau.");
    } catch {
      setError("Impossible d'enregistrer ta classe pour le moment. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl bg-violet-50 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-violet-700">Classe actuelle</p>
        <p className="mt-1 text-xl font-black text-slate-900">{saved || "Non renseignée"}</p>
      </div>
      <div>
        <label htmlFor="school-class" className="mb-2 block text-sm font-bold text-slate-700">Choisir ma classe</label>
        <select
          id="school-class"
          value={selected}
          onChange={(event) => { setSelected(event.target.value); setMessage(""); setError(""); }}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 focus:border-violet-500 focus:outline-2 focus:outline-violet-200"
        >
          <option value="">Sélectionner une classe</option>
          <optgroup label="Collège">
            {SCHOOL_CLASSES.slice(0, 4).map((value) => <option key={value} value={value}>{value}</option>)}
          </optgroup>
          <optgroup label="Lycée">
            {SCHOOL_CLASSES.slice(4).map((value) => <option key={value} value={value}>{value}</option>)}
          </optgroup>
        </select>
      </div>
      <button
        type="button"
        disabled={pending || !selected || selected === saved}
        onClick={saveClass}
        className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer ma classe"}
      </button>
      {message && <p role="status" className="text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
      <p className="text-xs leading-5 text-slate-500">La classe sert à adapter la difficulté des prochains quiz. Les questions doivent toujours rester fidèles au cours importé. Tu peux changer de classe à tout moment.</p>
    </div>
  );
}
