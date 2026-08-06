"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_RETURN_PATH,
  normalizeInternalReturnPath,
} from "../../../lib/internal-return-path";

type SuccessRedirectProps = {
  sessionId?: string;
};

type CheckoutSessionResponse = {
  status?: string | null;
  payment_status?: string;
  subscription_id?: string | null;
  metadata?: {
    returnTo?: string;
    plan?: string | null;
  };
  error?: string;
};

type SubscriptionStatusResponse = {
  plan?: string;
  status?: string;
  hasAccess?: boolean;
  stripeSubscriptionId?: string | null;
};

export default function SuccessRedirect({ sessionId }: SuccessRedirectProps) {
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("La session de paiement est manquante.");
      return;
    }

    const controller = new AbortController();
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    function waitBeforeRetry() {
      return new Promise<void>((resolve) => {
        pollTimer = setTimeout(resolve, 750);
      });
    }

    async function verifyCheckoutSession() {
      try {
        const response = await fetch(
          `/api/stripe/checkout-session?session_id=${encodeURIComponent(sessionId!)}`,
          { signal: controller.signal }
        );
        const data = (await response.json()) as CheckoutSessionResponse;

        if (!response.ok || data.status !== "complete" || !data.subscription_id) {
          throw new Error(data.error || "Le paiement n'a pas pu être confirmé.");
        }

        const returnTo = normalizeInternalReturnPath(data.metadata?.returnTo);
        let webhookConfirmed = false;

        for (let attempt = 0; attempt < 20 && !controller.signal.aborted; attempt++) {
          const statusResponse = await fetch("/api/subscription/status", {
            cache: "no-store",
            signal: controller.signal,
          });
          const subscription = statusResponse.ok
            ? ((await statusResponse.json()) as SubscriptionStatusResponse)
            : null;

          webhookConfirmed = Boolean(
            subscription?.hasAccess &&
              (subscription.status === "active" || subscription.status === "trialing") &&
              subscription.stripeSubscriptionId === data.subscription_id
          );

          if (webhookConfirmed) break;
          await waitBeforeRetry();
        }

        if (!webhookConfirmed) {
          throw new Error(
            "Le paiement est accepté, mais l'activation prend plus de temps que prévu. Recharge cette page dans quelques instants."
          );
        }

        window.sessionStorage.setItem(
          "educationia-checkout-pending",
          data.metadata?.plan || "standard"
        );
        redirectTimer = setTimeout(() => {
          window.location.replace(returnTo);
        }, 350);
      } catch (verificationError) {
        if (verificationError instanceof DOMException && verificationError.name === "AbortError") {
          return;
        }

        setError(
          verificationError instanceof Error
            ? verificationError.message
            : "Le paiement n'a pas pu être confirmé."
        );
      }
    }

    void verifyCheckoutSession();

    return () => {
      controller.abort();
      if (redirectTimer) clearTimeout(redirectTimer);
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [sessionId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-16">
      <section className="w-full max-w-xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl shadow-emerald-100/50 sm:p-12">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
          Paiement accepté
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {error ? "Activation en attente." : "Paiement accepté"}
        </h1>
        {!error && (
          <p className="mt-4 text-base font-medium text-slate-600">
            Confirmation de ton abonnement en cours…
          </p>
        )}
        {error && (
          <>
            <p role="alert" className="mt-4 text-sm leading-6 text-red-700">
              {error}
            </p>
            <Link
              href={DEFAULT_RETURN_PATH}
              className="mt-8 inline-flex rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              Retour au tableau de bord
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
