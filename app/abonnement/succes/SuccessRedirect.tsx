"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DEFAULT_RETURN_PATH,
  normalizeInternalReturnPath,
} from "../../../lib/internal-return-path";
import { SUBSCRIPTION_UNLOCK_PENDING_KEY } from "../../../lib/subscription-marker";

type SuccessRedirectProps = {
  sessionId?: string;
};

type CheckoutSessionResponse = {
  status?: string | null;
  payment_status?: string;
  metadata?: {
    returnTo?: string;
    plan?: string | null;
  };
  error?: string;
};

type SubscriptionStatusResponse = {
  userId?: string;
  plan?: string;
  subscription_status?: string;
  plan_unlocked_at?: string | null;
  stripe_subscription_id?: string | null;
  error?: string;
};

type PageState = "checking" | "timeout" | "error";

const POLLING_INTERVAL_MS = 850;
const MAX_WAIT_MS = 15_000;

export default function SuccessRedirect({ sessionId }: SuccessRedirectProps) {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("checking");
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setError("La session de paiement est manquante.");
      setPageState("error");
      return;
    }

    const controller = new AbortController();
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    async function startPolling() {
      setPageState("checking");
      setError("");

      try {
        const checkoutResponse = await fetch(
          `/api/stripe/checkout-session?session_id=${encodeURIComponent(sessionId!)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const checkout = (await checkoutResponse.json()) as CheckoutSessionResponse;

        if (!checkoutResponse.ok || checkout.status !== "complete") {
          throw new Error(checkout.error || "Le paiement n'a pas pu être vérifié.");
        }

        const returnTo = normalizeInternalReturnPath(checkout.metadata?.returnTo);
        const deadline = Date.now() + MAX_WAIT_MS;
        let attempt = 0;

        async function checkSubscription() {
          if (stopped || controller.signal.aborted) return;
          attempt += 1;

          try {
            const statusResponse = await fetch(
              `/api/subscription/status?attempt=${attempt}&timestamp=${Date.now()}`,
              {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" },
                signal: controller.signal,
              }
            );
            const subscription = (await statusResponse.json()) as SubscriptionStatusResponse;
            const active =
              statusResponse.ok &&
              Boolean(subscription.userId) &&
              subscription.plan !== undefined &&
              subscription.plan !== "none" &&
              Boolean(subscription.plan_unlocked_at) &&
              (subscription.subscription_status === "active" ||
                subscription.subscription_status === "trialing");

            console.info("[subscription-success] vérification", {
              attempt,
              httpStatus: statusResponse.status,
              plan: subscription.plan || "none",
              subscriptionStatus: subscription.subscription_status || "unknown",
              hasPlanUnlockedAt: Boolean(subscription.plan_unlocked_at),
              hasStripeSubscriptionId: Boolean(subscription.stripe_subscription_id),
              active,
            });

            if (active) {
              stopped = true;
              window.sessionStorage.setItem(
                SUBSCRIPTION_UNLOCK_PENDING_KEY,
                JSON.stringify({
                  userId: subscription.userId,
                  plan: subscription.plan || checkout.metadata?.plan || "standard",
                  unlockedAt: subscription.plan_unlocked_at,
                })
              );
              router.replace(returnTo);
              return;
            }
          } catch (pollError) {
            if (pollError instanceof DOMException && pollError.name === "AbortError") return;
            console.warn("[subscription-success] erreur réseau temporaire", {
              attempt,
              message: pollError instanceof Error ? pollError.message : "Erreur inconnue",
            });
          }

          if (stopped || controller.signal.aborted) return;

          if (Date.now() >= deadline) {
            stopped = true;
            setPageState("timeout");
            return;
          }

          pollTimer = setTimeout(() => void checkSubscription(), POLLING_INTERVAL_MS);
        }

        await checkSubscription();
      } catch (verificationError) {
        if (verificationError instanceof DOMException && verificationError.name === "AbortError") {
          return;
        }

        console.error("[subscription-success] vérification Checkout impossible", {
          message:
            verificationError instanceof Error
              ? verificationError.message
              : "Erreur inconnue",
        });
        setError(
          verificationError instanceof Error
            ? verificationError.message
            : "Le paiement n'a pas pu être vérifié."
        );
        setPageState("error");
      }
    }

    void startPolling();

    return () => {
      stopped = true;
      controller.abort();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [retryKey, router, sessionId]);

  function retry() {
    setRetryKey((current) => current + 1);
  }

  const waitingTooLong = pageState === "timeout";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-16">
      <section className="w-full max-w-xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl shadow-emerald-100/50 sm:p-12">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
          Paiement accepté
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {waitingTooLong
            ? "Le paiement a été accepté, mais la confirmation prend plus de temps que prévu."
            : pageState === "error"
              ? "Vérification du paiement impossible."
              : "Confirmation de ton abonnement en cours…"}
        </h1>

        {pageState === "checking" && (
          <p className="mt-4 text-base font-medium text-slate-600">
            Cette page se met à jour automatiquement.
          </p>
        )}

        {pageState === "error" && error && (
          <p role="alert" className="mt-4 text-sm leading-6 text-red-700">
            {error}
          </p>
        )}

        {pageState !== "checking" && (
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={retry}
              className="rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              Réessayer
            </button>
            <Link
              href={DEFAULT_RETURN_PATH}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Retourner à l&apos;accueil
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
