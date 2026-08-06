import { getSubscriptionAccess } from "../../../../lib/subscription-access";

export async function GET() {
  const subscription = await getSubscriptionAccess();

  if (!subscription.authenticated) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  return Response.json({
    userId: subscription.userId,
    plan: subscription.plan,
    status: subscription.status,
    hasAccess: subscription.hasAccess,
    planUnlockedAt: subscription.planUnlockedAt,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    testMode:
      process.env.NODE_ENV === "development" ||
      Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")),
  });
}
