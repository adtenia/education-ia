"use client";

import { useEffect, useState } from "react";

type SubscriptionStatus = {
  userId: string;
  plan: string;
  status: string;
  hasAccess: boolean;
  planUnlockedAt: string | null;
};

export default function SubscriptionUnlockNotice() {
  const [visible, setVisible] = useState(false);

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
          subscription.plan !== "standard" ||
          !subscription.planUnlockedAt
        ) {
          remainingAttempts -= 1;
          if (remainingAttempts > 0) {
            pollTimer = setTimeout(() => void checkSubscription(), 2000);
          }
          return;
        }

        window.sessionStorage.removeItem("educationia-checkout-pending");
        window.dispatchEvent(
          new CustomEvent("educationia:subscription-updated", { detail: subscription })
        );
        const marker = `educationia-plan-unlocked:${subscription.userId}:${subscription.planUnlockedAt}`;
        if (window.localStorage.getItem(marker)) return;

        window.localStorage.setItem(marker, "seen");
        setVisible(true);
        hideTimer = setTimeout(() => setVisible(false), 4500);
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
  }, []);

  if (!visible) return null;

  return (
    <aside className="fixed inset-x-4 top-5 z-[100] mx-auto max-w-md rounded-2xl border border-sky-200 bg-sky-50/95 p-5 text-sky-950 shadow-xl shadow-sky-200/40 backdrop-blur-xl">
      <p className="text-lg font-black">Standard est maintenant actif</p>
      <p className="mt-1 text-sm font-medium text-sky-800">
        Tes outils EducationIA sont débloqués.
      </p>
    </aside>
  );
}
