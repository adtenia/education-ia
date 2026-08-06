import { createClient } from "../../../../utils/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.info("[subscription-status] utilisateur non authentifié");
    return Response.json(
      { error: "Authentification requise." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("plan, subscription_status, plan_unlocked_at, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[subscription-status] lecture Supabase impossible :", error.message);
    return Response.json(
      { error: "Impossible de vérifier l'abonnement." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  const plan = data?.plan || "none";
  const subscriptionStatus = data?.subscription_status || "inactive";
  const hasAccess =
    plan !== "none" &&
    (subscriptionStatus === "active" || subscriptionStatus === "trialing");

  console.info("[subscription-status] état lu", {
    plan,
    subscriptionStatus,
    hasAccess,
    hasPlanUnlockedAt: Boolean(data?.plan_unlocked_at),
    hasStripeSubscriptionId: Boolean(data?.stripe_subscription_id),
  });

  return Response.json(
    {
      userId: user.id,
      plan,
      subscription_status: subscriptionStatus,
      plan_unlocked_at: data?.plan_unlocked_at || null,
      stripe_subscription_id: data?.stripe_subscription_id || null,

      // Alias conservés pour les composants existants.
      status: subscriptionStatus,
      hasAccess,
      planUnlockedAt: data?.plan_unlocked_at || null,
      stripeSubscriptionId: data?.stripe_subscription_id || null,
      testMode:
        process.env.NODE_ENV === "development" ||
        Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")),
    },
    { headers: NO_STORE_HEADERS }
  );
}
