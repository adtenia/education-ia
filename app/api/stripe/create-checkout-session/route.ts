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
    const standardPriceId = process.env.STRIPE_STANDARD_PRICE_ID;
    const appUrl = getAppUrl();

    if (!secretKey || !standardPriceId) {
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

    if (requestedPlan !== undefined && requestedPlan !== "standard") {
      return Response.json({ error: "Formule non disponible." }, { status: 400 });
    }

    const metadata = {
      user_id: user.id,
      plan: "standard",
      returnTo,
    };

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: standardPriceId,
          quantity: 1,
        },
      ],
      ...(user.email ? { customer_email: user.email } : {}),
      metadata,
      subscription_data: {
        metadata,
      },
      success_url: `${appUrl}/abonnement/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
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
