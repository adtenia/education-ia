"use client";

import type { SubscriptionPlan } from "../lib/subscription-access";
import {
  SUBSCRIPTION_UNLOCK_PENDING_KEY,
  subscriptionActivationMarker,
} from "../lib/subscription-marker";

type ResetSubscriptionAnimationButtonProps = {
  userId: string;
  plan: Exclude<SubscriptionPlan, "none">;
  planUnlockedAt: string;
  subscriptionId: string | null;
};

export default function ResetSubscriptionAnimationButton({
  userId,
  plan,
  planUnlockedAt,
  subscriptionId,
}: ResetSubscriptionAnimationButtonProps) {
  function resetAnimationMarker() {
    window.localStorage.removeItem(
      subscriptionActivationMarker(userId, plan, planUnlockedAt, subscriptionId)
    );
    window.sessionStorage.setItem(
      SUBSCRIPTION_UNLOCK_PENDING_KEY,
      JSON.stringify({
        userId,
        plan,
        sessionId: `test_${Date.now()}`,
        subscriptionId,
        createdAt: new Date().toISOString(),
      })
    );
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={resetAnimationMarker}
      className="mt-3 text-xs font-semibold text-slate-400 underline decoration-dotted underline-offset-4 hover:text-slate-600"
    >
      Retester l&apos;animation d&apos;activation
    </button>
  );
}
