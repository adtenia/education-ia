import { normalizeInternalReturnPath } from "../../../../lib/internal-return-path";
import { getStripe } from "../../../../lib/stripe";
import { createClient } from "../../../../utils/supabase/server";
import { createAdminClient } from "../../../../utils/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};
const ANIMATION_USED_BY_KEY = "educationia_animation_used_by";
const ANIMATION_USED_AT_KEY = "educationia_animation_used_at";
const ANIMATION_REQUEST_ID_KEY = "educationia_animation_request_id";

function json(data: object, status = 200) {
  return Response.json(data, { status, headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return json({ error: "Authentification requise." }, 401);

  let sessionId: unknown;
  let requestId: unknown;
  try {
    ({ session_id: sessionId, request_id: requestId } = (await request.json()) as {
      session_id?: unknown;
      request_id?: unknown;
    });
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }

  if (
    typeof sessionId !== "string" ||
    !sessionId.startsWith("cs_") ||
    sessionId.length > 255
  ) {
    return json({ error: "Session Checkout invalide." }, 400);
  }

  if (
    typeof requestId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(requestId)
  ) {
    return json({ error: "Identifiant de vérification invalide." }, 400);
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id || null;

    const plan = session.metadata?.plan;
    const priceIds: Record<string, string | undefined> = {
      standard: process.env.STRIPE_STANDARD_PRICE_ID,
      premium: process.env.STRIPE_PREMIUM_PRICE_ID,
      pro: process.env.STRIPE_PRO_PRICE_ID,
    };
    if (
      session.metadata?.user_id !== user.id ||
      !plan ||
      !(plan in priceIds)
    ) {
      return json({ error: "Session Checkout introuvable." }, 404);
    }

    if (
      session.status !== "complete" ||
      session.mode !== "subscription" ||
      !subscriptionId ||
      (session.payment_status !== "paid" &&
        session.payment_status !== "no_payment_required")
    ) {
      return json({ error: "Le paiement n'est pas confirmé." }, 409);
    }

    const expectedPriceId = priceIds[plan];
    if (!expectedPriceId) {
      return json({ error: "Tarif Stripe non configuré pour cette formule." }, 503);
    }

    const animationUsedBy = session.metadata?.[ANIMATION_USED_BY_KEY];
    const previousRequestId = session.metadata?.[ANIMATION_REQUEST_ID_KEY];
    if (
      animationUsedBy &&
      (animationUsedBy !== user.id || previousRequestId !== requestId)
    ) {
      return json({ error: "Cette activation a déjà été affichée." }, 409);
    }

    const [subscription, lineItems] = await Promise.all([
      stripe.subscriptions.retrieve(subscriptionId),
      stripe.checkout.sessions.listLineItems(sessionId, { limit: 10 }),
    ]);
    const expectedLineItems = lineItems.data.filter((lineItem) => {
      const priceId =
        typeof lineItem.price === "string" ? lineItem.price : lineItem.price?.id;
      return priceId === expectedPriceId && lineItem.quantity === 1;
    });

    if (subscription.id !== subscriptionId || expectedLineItems.length !== 1) {
      return json({ error: "Le tarif acheté ne correspond pas à la formule sélectionnée." }, 409);
    }

    // A verified Checkout must activate the purchased plan even when testing
    // on localhost, where the deployed Stripe webhook cannot reach this server.
    // The database RPC also guards against older subscription events.
    const matchingSubscriptionPrice = subscription.items.data.some(
      (item) => item.price.id === expectedPriceId
    );
    if (!matchingSubscriptionPrice || !["active", "trialing"].includes(subscription.status)) {
      return json({ error: "L'abonnement Stripe n'est pas encore actif." }, 409);
    }

    const currentPeriodEnd = Math.max(
      ...subscription.items.data.map((item) => item.current_period_end)
    );
    const admin = createAdminClient();
    const { error: syncError } = await admin.rpc("sync_stripe_subscription", {
      p_user_id: user.id,
      p_plan: plan,
      p_subscription_status: subscription.status,
      p_stripe_customer_id: typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id || null,
      p_stripe_subscription_id: subscription.id,
      p_current_period_end: Number.isFinite(currentPeriodEnd)
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      p_cancel_at_period_end: subscription.cancel_at_period_end,
      p_access_allowed: true,
      p_event_created_at: Math.floor(Date.now() / 1000),
      p_replace_subscription: true,
    });
    if (syncError) {
      console.error("[checkout-session] RPC activation Supabase impossible", syncError.message);
    }

    // Confirm the stored tier, not merely that the RPC returned no error.
    // A verified, paid Stripe checkout is authoritative for this user.
    const { data: stored, error: readError } = await admin
      .from("user_subscriptions")
      .select("plan, subscription_status, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) {
      console.error("[checkout-session] lecture abonnement impossible", readError.message);
      return json({ error: "Paiement confirmé, synchronisation de l'abonnement impossible." }, 503);
    }
    if (
      stored?.plan !== plan ||
      stored?.stripe_subscription_id !== subscription.id ||
      !["active", "trialing"].includes(stored?.subscription_status || "")
    ) {
      // Recover when the older RPC refuses to replace a previous subscription.
      // Never trust a client-supplied tier: all values came from Stripe.
      const { error: writeError } = await admin
        .from("user_subscriptions")
        .upsert({
          user_id: user.id,
          plan,
          subscription_status: subscription.status,
          stripe_customer_id: typeof subscription.customer === "string"
            ? subscription.customer : subscription.customer?.id || null,
          stripe_subscription_id: subscription.id,
          current_period_end: Number.isFinite(currentPeriodEnd)
            ? new Date(currentPeriodEnd * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }, { onConflict: "user_id" });
      if (writeError) {
        console.error("[checkout-session] remplacement abonnement impossible", writeError.message);
        return json({ error: "Paiement confirmé, mise à jour de l'abonnement impossible." }, 503);
      }
    }

    if (!animationUsedBy) {
      await stripe.checkout.sessions.update(sessionId, {
        metadata: {
          [ANIMATION_USED_BY_KEY]: user.id,
          [ANIMATION_USED_AT_KEY]: new Date().toISOString(),
          [ANIMATION_REQUEST_ID_KEY]: requestId,
        },
      });
    }

    return json({
      status: session.status,
      user_id: user.id,
      plan,
      session_id: session.id,
      subscription_id: subscriptionId,
      returnTo: normalizeInternalReturnPath(session.metadata?.returnTo),
    });
  } catch (error) {
    console.error("[checkout-session] vérification Stripe impossible", {
      message: error instanceof Error ? error.message : "Erreur inconnue",
    });
    return json({ error: "Impossible de vérifier la session de paiement." }, 500);
  }
}
