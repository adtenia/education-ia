export function subscriptionActivationMarker(
  userId: string,
  plan: string,
  planUnlockedAt: string
) {
  return `educationia-plan-unlocked:${userId}:${plan}:${planUnlockedAt}`;
}
