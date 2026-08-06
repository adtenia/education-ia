"use client";

import type { SubscriptionPlan } from "../lib/subscription-access";
import { subscriptionActivationMarker } from "../lib/subscription-marker";

type ResetSubscriptionAnimationButtonProps = {
  userId: string;
  plan: Exclude<SubscriptionPlan, "none">;
  planUnlockedAt: string;
};

export default function ResetSubscriptionAnimationButton({
  userId,
  plan,
  planUnlockedAt,
}: ResetSubscriptionAnimationButtonProps) {
  function resetAnimationMarker() {
    window.localStorage.removeItem(
      subscriptionActivationMarker(userId, plan, planUnlockedAt)
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
