import { normalizeInternalReturnPath } from "../../../../lib/internal-return-path";
import { getStripe } from "../../../../lib/stripe";
import { createClient } from "../../../../utils/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");

  if (!sessionId || !sessionId.startsWith("cs_") || sessionId.length > 255) {
    return Response.json({ error: "Session Checkout invalide." }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.metadata?.user_id !== user.id) {
      return Response.json({ error: "Session Checkout introuvable." }, { status: 404 });
    }

    const checkoutCompleted =
      session.status === "complete" &&
      (session.payment_status === "paid" ||
        session.payment_status === "no_payment_required" ||
        Boolean(session.subscription));

    if (!checkoutCompleted) {
      return Response.json({ error: "Le paiement n'est pas confirmé." }, { status: 409 });
    }

    return Response.json({
      status: session.status,
      payment_status: session.payment_status,
      subscription_id:
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id || null,
      metadata: {
        returnTo: normalizeInternalReturnPath(session.metadata?.returnTo),
        plan: session.metadata?.plan || null,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de la session Stripe Checkout :", error);
    return Response.json(
      { error: "Impossible de vérifier la session de paiement." },
      { status: 500 }
    );
  }
}
