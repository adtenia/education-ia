"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-violet-500 bg-white px-4 py-3 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-50 sm:px-5"
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}
