"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Lock } from "lucide-react";

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.checkout_url) {
        throw new Error(data.error || "Could not start the payment.");
      }

      // Send the customer to Stripe's secure payment page
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="plan-upgrade-button upgrade-pay-button"
        onClick={handlePay}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 size={17} className="plan-spinner" />
            Redirecting to secure payment...
          </>
        ) : (
          <>
            <Lock size={16} />
            Continue to Secure Payment
          </>
        )}
      </button>

      {error && (
        <div className="plan-feedback error">
          <AlertCircle size={15} />
          {error}
        </div>
      )}
    </>
  );
}
