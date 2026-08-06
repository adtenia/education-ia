"use client";

import Link from "next/link";

type SubscriptionRequiredDialogProps = {
  open: boolean;
  onClose?: () => void;
};

export default function SubscriptionRequiredDialog({
  open,
  onClose,
}: SubscriptionRequiredDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="subscription-dialog-title">
      <div className="w-full max-w-md rounded-3xl border border-violet-100 bg-white p-7 shadow-2xl">
        <h2 id="subscription-dialog-title" className="text-2xl font-black text-slate-950">
          Un abonnement est nécessaire pour utiliser cette fonctionnalité.
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          Choisis la formule Standard pour débloquer les outils EducationIA.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/pricing" className="rounded-2xl bg-violet-600 px-5 py-3 text-center font-black text-white transition hover:bg-violet-700">
            Choisir mon abonnement
          </Link>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700 transition hover:bg-slate-200">
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
