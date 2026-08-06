"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SubscriptionPlan } from "../lib/subscription-access";
import {
  checkoutAnimationMarker,
  readPendingSubscriptionUnlock,
  SUBSCRIPTION_UNLOCK_PENDING_KEY,
} from "../lib/subscription-marker";
import SubscriptionUnlockAnimation from "./SubscriptionUnlockAnimation";

type ActiveSubscriptionPlan = Exclude<SubscriptionPlan, "none">;

type SubscriptionStatus = {
  userId?: string;
  plan?: SubscriptionPlan;
  subscription_status?: string;
  stripe_subscription_id?: string | null;
};

const POLLING_INTERVAL_MS = 750;

function isActivePlan(plan: unknown): plan is ActiveSubscriptionPlan {
  return plan === "standard" || plan === "premium" || plan === "pro";
}

export default function SubscriptionUnlockNotice() {
  const [activePlan, setActivePlan] = useState<ActiveSubscriptionPlan | null>(null);
  const [activationPending, setActivationPending] = useState(false);
  const markerToSave = useRef<string | null>(null);

  const markAnimationAsPresented = useCallback(() => {
    window.sessionStorage.removeItem(SUBSCRIPTION_UNLOCK_PENDING_KEY);
    if (markerToSave.current) {
      window.localStorage.setItem(markerToSave.current, "seen");
      markerToSave.current = null;
    }
  }, []);

  useEffect(() => {
    if (!activePlan) return;
    const timer = setTimeout(() => setActivePlan(null), 2500);
    return () => clearTimeout(timer);
  }, [activePlan]);

  useEffect(() => {
    const pending = readPendingSubscriptionUnlock();
    if (!pending || !isActivePlan(pending.plan)) return;
    const activation = pending;
    const activationPlan = pending.plan;
    const animationMarker = checkoutAnimationMarker(
      activation.userId,
      activation.sessionId
    );
    const animationAlreadySeen = Boolean(window.localStorage.getItem(animationMarker));

    const controller = new AbortController();
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    setActivationPending(true);
    if (animationAlreadySeen) {
      window.sessionStorage.removeItem(SUBSCRIPTION_UNLOCK_PENDING_KEY);
    } else {
      markerToSave.current = animationMarker;
      setActivePlan(activationPlan);
    }

    async function checkSubscription() {
      if (stopped || controller.signal.aborted) return;

      try {
        const response = await fetch("/api/subscription/status", {
          cache: "no-store",
          signal: controller.signal,
        });
        const subscription = response.ok
          ? ((await response.json()) as SubscriptionStatus)
          : null;
        const confirmed =
          subscription?.userId === activation.userId &&
          subscription.plan === activation.plan &&
          (subscription.subscription_status === "active" ||
            subscription.subscription_status === "trialing") &&
          (!activation.subscriptionId ||
            subscription.stripe_subscription_id === activation.subscriptionId);

        if (confirmed) {
          stopped = true;
          setActivationPending(false);
          window.dispatchEvent(
            new CustomEvent("educationia:subscription-updated", { detail: subscription })
          );
          return;
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("[subscription-unlock] vérification temporairement impossible", {
            message: error instanceof Error ? error.message : "Erreur inconnue",
          });
        }
      }

      if (!stopped && !controller.signal.aborted) {
        pollTimer = setTimeout(() => void checkSubscription(), POLLING_INTERVAL_MS);
      }
    }

    void checkSubscription();

    return () => {
      stopped = true;
      controller.abort();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, []);

  return (
    <>
      {activationPending && !activePlan && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-5 right-5 z-[110] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-sky-200 bg-white/95 px-5 py-3 text-sm font-bold text-slate-700 shadow-xl shadow-sky-100/70 backdrop-blur"
        >
          Ton abonnement est en cours d&apos;activation.
        </div>
      )}

      <AnimatePresence>
        {activePlan && (
          <SubscriptionUnlockAnimation
            plan={activePlan}
            onPresented={markAnimationAsPresented}
          />
        )}
      </AnimatePresence>
    </>
  );
}
