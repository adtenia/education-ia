export function subscriptionActivationMarker(
  userId: string,
  plan: string,
  planUnlockedAt: string,
  subscriptionId?: string | null
) {
  return `educationia-plan-unlocked:${userId}:${plan}:${planUnlockedAt}:${subscriptionId || "no-subscription-id"}`;
}

export function checkoutAnimationMarker(userId: string, sessionId: string) {
  return `educationia-checkout-animation:${userId}:${sessionId}`;
}

export const SUBSCRIPTION_UNLOCK_PENDING_KEY =
  "educationia_subscription_activation_pending";

export type PendingSubscriptionUnlock = {
  userId: string;
  plan: string;
  sessionId: string;
  subscriptionId: string | null;
  createdAt: string;
};

export function readPendingSubscriptionUnlock(): PendingSubscriptionUnlock | null {
  const value = window.sessionStorage.getItem(SUBSCRIPTION_UNLOCK_PENDING_KEY);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<PendingSubscriptionUnlock>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.plan !== "string" ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.createdAt !== "string" ||
      !parsed.userId ||
      !parsed.plan ||
      !parsed.sessionId ||
      !parsed.createdAt
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      plan: parsed.plan,
      sessionId: parsed.sessionId,
      subscriptionId:
        typeof parsed.subscriptionId === "string" ? parsed.subscriptionId : null,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}
