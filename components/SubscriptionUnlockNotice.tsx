"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import type { SubscriptionPlan } from "../lib/subscription-access";
import SubscriptionUnlockAnimation from "./SubscriptionUnlockAnimation";
import { subscriptionActivationMarker } from "../lib/subscription-marker";

type ActiveSubscriptionPlan = Exclude<SubscriptionPlan, "none">;

type SubscriptionStatus = {
  userId: string;
  plan: SubscriptionPlan;
  status: string;
  hasAccess: boolean;
  planUnlockedAt: string | null;
  stripeSubscriptionId?: string | null;
};

export default function SubscriptionUnlockNotice() {
  const pathname = usePathname();
  const [activePlan, setActivePlan] = useState<ActiveSubscriptionPlan | null>(null);
  const markerToSave = useRef<string | null>(null);

  const markAnimationAsPresented = useCallback(() => {
    if (markerToSave.current) {
      window.localStorage.setItem(markerToSave.current, "seen");
      markerToSave.current = null;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    const checkoutPending = window.sessionStorage.getItem("educationia-checkout-pending") === "standard";
    let remainingAttempts = checkoutPending ? 15 : 1;

    async function checkSubscription() {
      try {
        const response = await fetch("/api/subscription/status", {
          signal: controller.signal,
        });
        const subscription = response.ok
          ? ((await response.json()) as SubscriptionStatus)
          : null;

        if (
          !subscription?.hasAccess ||
          (subscription.plan !== "standard" &&
            subscription.plan !== "premium" &&
            subscription.plan !== "pro") ||
          !subscription.planUnlockedAt
        ) {
          remainingAttempts -= 1;
          if (remainingAttempts > 0) {
            pollTimer = setTimeout(() => void checkSubscription(), 2000);
          }
          return;
        }

        window.dispatchEvent(
          new CustomEvent("educationia:subscription-updated", { detail: subscription })
        );

        if (pathname === "/abonnement/succes") return;

        window.sessionStorage.removeItem("educationia-checkout-pending");
        const marker = subscriptionActivationMarker(
          subscription.userId,
          subscription.plan,
          subscription.planUnlockedAt
        );
        if (window.localStorage.getItem(marker)) return;

        markerToSave.current = marker;
        setActivePlan(subscription.plan);
        hideTimer = setTimeout(() => setActivePlan(null), 2500);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Vérification de l'activation impossible :", error);
        }
      }
    }

    void checkSubscription();

    return () => {
      controller.abort();
      if (hideTimer) clearTimeout(hideTimer);
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [pathname]);

  return (
    <AnimatePresence>
      {activePlan && (
        <SubscriptionUnlockAnimation
          plan={activePlan}
          onPresented={markAnimationAsPresented}
        />
      )}
    </AnimatePresence>
  );
}
