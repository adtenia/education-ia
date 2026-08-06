export function subscriptionActivationMarker(
  userId: string,
  plan: string,
  planUnlockedAt: string
) {
  return `educationia-plan-unlocked:${userId}:${plan}:${planUnlockedAt}`;
}

export const SUBSCRIPTION_UNLOCK_PENDING_KEY = "subscription_unlock_pending";

export type PendingSubscriptionUnlock = {
  userId: string;
  plan: string;
  unlockedAt: string;
};

export function readPendingSubscriptionUnlock(): PendingSubscriptionUnlock | null {
  const value = window.sessionStorage.getItem(SUBSCRIPTION_UNLOCK_PENDING_KEY);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<PendingSubscriptionUnlock>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.plan !== "string" ||
      typeof parsed.unlockedAt !== "string" ||
      !parsed.userId ||
      !parsed.plan ||
      !parsed.unlockedAt
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      plan: parsed.plan,
      unlockedAt: parsed.unlockedAt,
    };
  } catch {
    return null;
  }
}
