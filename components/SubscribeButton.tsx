"use client";

import { useState } from "react";

type SubscribeButtonProps = {
  plan: "standard";
  returnTo?: string;
  text: string;
  className?: string;
};

export default function SubscribeButton({
  plan,
  returnTo,
  text,
  className = "",
}: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    setIsLoading(true);
    setError("");

    const originPath = returnTo || `${window.location.pathname}${window.location.search}`;

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, returnTo: originPath }),
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (response.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(originPath)}`;
        return;
      }

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Impossible de démarrer le paiement.");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Impossible de démarrer le paiement. Réessayez."
      );
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        aria-busy={isLoading}
        className={className}
      >
        {isLoading ? "Redirection…" : text}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-center text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
