import { normalizeInternalReturnPath } from "../../../../lib/internal-return-path";
import { getStripe } from "../../../../lib/stripe";
import { createClient } from "../../../../utils/supabase/server";

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

  const expectedPriceId = process.env.STRIPE_STANDARD_PRICE_ID;
  if (!expectedPriceId) {
    console.error("[checkout-session] STRIPE_STANDARD_PRICE_ID est absente.");
    return json({ error: "Configuration Stripe incomplète." }, 500);
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id || null;

    if (
      session.metadata?.user_id !== user.id ||
      session.metadata?.plan !== "standard"
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
      return json({ error: "Le tarif acheté ne correspond pas au plan Standard." }, 409);
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
      plan: "standard",
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
