"use client";

import { useEffect } from "react";
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
  user_id?: string;
  plan?: string;
  session_id?: string;
  subscription_id?: string | null;
  returnTo?: string;
  error?: string;
};

const SESSION_VALIDATION_TIMEOUT_MS = 6_000;
const VALIDATION_REQUEST_PREFIX = "educationia_checkout_validation_request:";

export default function SuccessRedirect({ sessionId }: SuccessRedirectProps) {
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const validationTimer = setTimeout(
      () => controller.abort(),
      SESSION_VALIDATION_TIMEOUT_MS
    );

    async function validateAndRedirect() {
      let returnTo = DEFAULT_RETURN_PATH;

      try {
        if (!sessionId) throw new Error("Session Checkout manquante.");
        const requestStorageKey = `${VALIDATION_REQUEST_PREFIX}${sessionId}`;
        const requestId =
          window.sessionStorage.getItem(requestStorageKey) || crypto.randomUUID();
        window.sessionStorage.setItem(requestStorageKey, requestId);

        const response = await fetch("/api/stripe/checkout-session", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, request_id: requestId }),
          signal: controller.signal,
        });
        const checkout = (await response.json()) as CheckoutSessionResponse;

        if (
          !response.ok ||
          checkout.status !== "complete" ||
          !checkout.user_id ||
          checkout.plan !== "standard" ||
          checkout.session_id !== sessionId ||
          !checkout.subscription_id
        ) {
          throw new Error(checkout.error || "Session Checkout invalide.");
        }

        returnTo = normalizeInternalReturnPath(checkout.returnTo);
        window.sessionStorage.setItem(
          SUBSCRIPTION_UNLOCK_PENDING_KEY,
          JSON.stringify({
            userId: checkout.user_id,
            plan: checkout.plan,
            sessionId: checkout.session_id,
            subscriptionId: checkout.subscription_id,
            createdAt: new Date().toISOString(),
          })
        );
        window.sessionStorage.removeItem(requestStorageKey);
      } catch (error) {
        if (mounted) {
          console.error("[subscription-success] validation de la session impossible", {
            message: error instanceof Error ? error.message : "Erreur inconnue",
          });
        }
      } finally {
        clearTimeout(validationTimer);
        if (mounted) window.location.replace(returnTo);
      }
    }

    void validateAndRedirect();

    return () => {
      mounted = false;
      controller.abort();
      clearTimeout(validationTimer);
    };
  }, [sessionId]);

  return <main className="min-h-screen bg-white" aria-label="Redirection sécurisée" />;
}
