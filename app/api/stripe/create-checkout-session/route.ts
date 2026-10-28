import { getStripe } from "../../../../lib/stripe";
import { normalizeInternalReturnPath } from "../../../../lib/internal-return-path";
import { createClient } from "../../../../utils/supabase/server";

function getAppUrl() {
  const configuredUrl = process.env.APP_URL;

  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    return url.origin;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Vous devez être connecté pour choisir un abonnement." },
        { status: 401 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceIds = {
      standard: process.env.STRIPE_STANDARD_PRICE_ID,
      premium: process.env.STRIPE_PREMIUM_PRICE_ID,
      pro: process.env.STRIPE_PRO_PRICE_ID,
    } as const;
    const appUrl = getAppUrl();

    if (!secretKey) {
      console.error("Configuration Stripe incomplète.");
      return Response.json(
        { error: "Le paiement est temporairement indisponible." },
        { status: 500 }
      );
    }

    if (!appUrl) {
      console.error("La variable APP_URL est absente ou invalide.");
      return Response.json(
        { error: "Le paiement est temporairement indisponible." },
        { status: 500 }
      );
    }

    let requestBody: unknown = {};

    try {
      requestBody = await request.json();
    } catch {
      requestBody = {};
    }

    const returnTo = normalizeInternalReturnPath(
      requestBody && typeof requestBody === "object" && "returnTo" in requestBody
        ? requestBody.returnTo
        : undefined
    );
    const requestedPlan =
      requestBody && typeof requestBody === "object" && "plan" in requestBody
        ? requestBody.plan
        : undefined;

    if (requestedPlan !== "standard" && requestedPlan !== "premium" && requestedPlan !== "pro") {
      return Response.json({ error: "Formule non disponible." }, { status: 400 });
    }

    const priceId = priceIds[requestedPlan as keyof typeof priceIds];
    if (!priceId) {
      return Response.json({ error: "Le tarif de cette formule n'est pas encore configuré." }, { status: 503 });
    }

    const metadata = {
      user_id: user.id,
      plan: requestedPlan,
      returnTo,
    };

    const requestOrigin = new URL(request.url).origin;
    const checkoutOrigin = process.env.NODE_ENV === "development" && /^http:\/\/localhost:\d+$/.test(requestOrigin)
      ? requestOrigin
      : appUrl;

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      ...(user.email ? { customer_email: user.email } : {}),
      metadata,
      subscription_data: {
        metadata,
      },
      success_url: `${checkoutOrigin}/abonnement/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${checkoutOrigin}/pricing?checkout=cancelled`,
    });

    if (!session.url) {
      console.error("Stripe n'a retourné aucune URL Checkout.");
      return Response.json(
        { error: "Impossible d'ouvrir la page de paiement." },
        { status: 502 }
      );
    }

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Erreur lors de la création de la session Stripe Checkout :", error);
    return Response.json(
      { error: "Impossible de créer la session de paiement. Réessayez." },
      { status: 500 }
    );
  }
}
