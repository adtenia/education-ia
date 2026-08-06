"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SubscriptionPlan } from "../lib/subscription-access";
import SubscriptionBadge from "./SubscriptionBadge";

type ActiveSubscriptionPlan = Exclude<SubscriptionPlan, "none">;

type SubscriptionStatus = {
  plan?: SubscriptionPlan;
  hasAccess?: boolean;
};

const HIDDEN_ROUTES = new Set(["/", "/login", "/register"]);

function activePlan(value: SubscriptionStatus | null): ActiveSubscriptionPlan | null {
  if (!value?.hasAccess) return null;
  return value.plan === "standard" || value.plan === "premium" || value.plan === "pro"
    ? value.plan
    : null;
}

export default function FloatingSubscriptionBadge() {
  const pathname = usePathname();
  const [plan, setPlan] = useState<ActiveSubscriptionPlan | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/subscription/status", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as SubscriptionStatus;
      })
      .then((subscription) => setPlan(activePlan(subscription)))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Chargement du badge d'abonnement impossible :", error);
        }
      });

    function handleSubscriptionUpdate(event: Event) {
      const subscription = (event as CustomEvent<SubscriptionStatus>).detail;
      setPlan(activePlan(subscription));
    }

    window.addEventListener("educationia:subscription-updated", handleSubscriptionUpdate);

    return () => {
      controller.abort();
      window.removeEventListener("educationia:subscription-updated", handleSubscriptionUpdate);
    };
  }, []);

  if (HIDDEN_ROUTES.has(pathname) || !plan) return null;

  return (
    <div className="print-hide pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-40 w-[min(17rem,calc(100vw-1.5rem))] max-[380px]:w-[min(15rem,calc(100vw-1.5rem))]">
      <SubscriptionBadge plan={plan} compact />
    </div>
  );
}
