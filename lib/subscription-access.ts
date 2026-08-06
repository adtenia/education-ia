import "server-only";
import { createClient } from "../utils/supabase/server";

export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

export type SubscriptionPlan = "none" | "standard" | "premium" | "pro";

export type SubscriptionAccess = {
  userId: string | null;
  authenticated: boolean;
  hasAccess: boolean;
  plan: SubscriptionPlan;
  status: string;
  planUnlockedAt: string | null;
};

export async function getSubscriptionAccess(): Promise<SubscriptionAccess> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      authenticated: false,
      hasAccess: false,
      plan: "none",
      status: "inactive",
      planUnlockedAt: null,
    };
  }

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("plan, subscription_status, plan_unlocked_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) console.error("Lecture de l'abonnement impossible :", error);

  const plan = (data?.plan || "none") as SubscriptionPlan;
  const status = data?.subscription_status || "inactive";
  const hasAccess =
    plan !== "none" && ACTIVE_SUBSCRIPTION_STATUSES.includes(status as "active" | "trialing");

  return {
    userId: user.id,
    authenticated: true,
    hasAccess,
    plan,
    status,
    planUnlockedAt: data?.plan_unlocked_at || null,
  };
}

export function subscriptionRequiredResponse() {
  return Response.json(
    {
      success: false,
      code: "SUBSCRIPTION_REQUIRED",
      error: "Un abonnement est nécessaire pour utiliser cette fonctionnalité.",
    },
    { status: 403 }
  );
}
