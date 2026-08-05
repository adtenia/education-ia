import type { Metadata } from "next";
import SuccessRedirect from "./SuccessRedirect";

export const metadata: Metadata = {
  title: "Paiement réussi",
};

type SubscriptionSuccessPageProps = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

export default async function SubscriptionSuccessPage({
  searchParams,
}: SubscriptionSuccessPageProps) {
  const { session_id: rawSessionId } = await searchParams;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

  return <SuccessRedirect sessionId={sessionId} />;
}
