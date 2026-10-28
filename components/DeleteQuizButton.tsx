"use client";

import { useState } from "react";

export default function DeleteQuizButton({ action }: { action: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  return (
    <form action={async () => { setPending(true); try { await action(); } finally { setPending(false); } }}>
      <button type="submit" disabled={pending}
        onClick={(event) => {
          if (!window.confirm("Supprimer définitivement ce quiz et ses questions ? Cette action est irréversible.")) event.preventDefault();
        }}
        className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">
        {pending ? "Suppression…" : "Supprimer"}
      </button>
    </form>
  );
}
