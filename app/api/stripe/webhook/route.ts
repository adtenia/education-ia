import type Stripe from "stripe";
import { getStripe } from "../../../../lib/stripe";
import { createAdminClient } from "../../../../utils/supabase/admin";

const ACCESS_STATUSES = new Set(["active", "trialing"]);

function objectId(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id || null;
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription;
  return typeof subscription === "string" ? subscription : subscription?.id || null;
}

function currentPeriodEnd(subscription: Stripe.Subscription) {
  const timestamps = subscription.items.data.map((item) => item.current_period_end);
  const timestamp = timestamps.length > 0 ? Math.max(...timestamps) : null;
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  eventCreatedAt: number,
  statusOverride?: string,
  replaceSubscription = false
) {
  const expectedPriceId = process.env.STRIPE_STANDARD_PRICE_ID;
  const userId = subscription.metadata.user_id;
  const plan = subscription.metadata.plan;
  const hasStandardPrice = Boolean(
    expectedPriceId && subscription.items.data.some((item) => item.price.id === expectedPriceId)
  );

  if (!userId || plan !== "standard" || !hasStandardPrice) {
    console.error("Abonnement Stripe ignoré : utilisateur, plan ou Price ID invalide.");
    return;
  }

  const status = statusOverride || subscription.status;
  const accessAllowed = hasStandardPrice && ACCESS_STATUSES.has(status);
  const admin = createAdminClient();
  const { error } = await admin.rpc("sync_stripe_subscription", {
    p_user_id: userId,
    p_plan: "standard",
    p_subscription_status: status,
    p_stripe_customer_id: objectId(subscription.customer),
    p_stripe_subscription_id: subscription.id,
    p_current_period_end: currentPeriodEnd(subscription),
    p_cancel_at_period_end: subscription.cancel_at_period_end,
    p_access_allowed: accessAllowed,
    p_event_created_at: eventCreatedAt,
    p_replace_subscription: replaceSubscription,
  });

  if (error) throw error;
}

async function retrieveSubscription(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
}

export async function GET() {
  return Response.json(
    { error: "Méthode non autorisée. Utilisez POST pour les webhooks Stripe." },
    {
      status: 405,
      headers: { Allow: "POST" },
    }
  );
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return Response.json({ error: "Signature Stripe absente." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Signature webhook Stripe invalide :", error);
    return Response.json({ error: "Signature Stripe invalide." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const subscriptionId = objectId(session.subscription);

        if (subscriptionId && session.metadata?.user_id && session.metadata.plan === "standard") {
          const subscription = await retrieveSubscription(subscriptionId);
          await syncSubscription(subscription, event.created, undefined, true);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const eventSubscription = event.data.object;
        const subscription = await retrieveSubscription(eventSubscription.id);
        await syncSubscription(
          subscription,
          event.created,
          event.type === "customer.subscription.deleted" ? "canceled" : undefined
        );
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = subscriptionIdFromInvoice(invoice);

        if (subscriptionId) {
          const subscription = await retrieveSubscription(subscriptionId);
          await syncSubscription(
            subscription,
            event.created,
            event.type === "invoice.payment_failed" ? "past_due" : undefined
          );
        }
        break;
      }

      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error(`Échec du traitement webhook Stripe ${event.id} :`, error);
    return Response.json({ error: "Traitement du webhook impossible." }, { status: 500 });
  }
}
