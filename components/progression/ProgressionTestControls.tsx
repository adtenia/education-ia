"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function ProgressionTestControls() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 px-4 py-3 text-sm"><span className="font-bold text-violet-700">Mode test progression</span><button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="rounded-xl bg-white px-4 py-2 font-black text-violet-700 shadow-sm transition hover:bg-violet-100 disabled:opacity-60">{pending ? "Actualisation…" : "Actualiser les données"}</button></div>;
}
