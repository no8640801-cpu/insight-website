
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  currentPlan: string;
  hasPendingRequest: boolean;
};

export default function PlanUpgradeCard({
  currentPlan,
  hasPendingRequest,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [pending, setPending] = useState(hasPendingRequest);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isPro = currentPlan === "pro";

  async function handleUpgradeRequest() {
    setLoading(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Your session has expired. Please sign in again.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("plan_upgrade_requests")
      .insert({
        user_id: user.id,
        status: "pending",
      });

    if (insertError) {
      if (insertError.code === "23505") {
        setPending(true);
        setError("");
        setSuccess("You already have a pending upgrade request.");
      } else {
        setError(insertError.message);
      }

      setLoading(false);
      return;
    }

    setPending(true);
    setSuccess(
      "Your Pro upgrade request has been submitted successfully."
    );
    setLoading(false);
    router.refresh();
  }

  return (
    <section className="plan-upgrade-card">
      <div className="plan-upgrade-top">
        <div>
          <div className="plan-upgrade-eyebrow">
            YOUR SUBSCRIPTION
          </div>
          <h3>Your Current Plan</h3>
        </div>

        <span className={`plan-badge ${isPro ? "pro" : "standard"}`}>
          {isPro ? "PRO" : "STANDARD"}
        </span>
      </div>

      <div className="plan-upgrade-body">
        <div className="plan-upgrade-icon">
          <Crown size={24} />
        </div>

        <div>
          <h4>{isPro ? "Pro Plan" : "Standard Plan"}</h4>
          <p>
            {isPro
              ? "Your account has access to Pro plan features."
              : "You can upgrade your account to unlock additional services."}
          </p>
        </div>
      </div>

      {!isPro && (
        <div className="plan-pro-features">
          <h4>
            <Sparkles size={16} />
            Upgrade to Pro
          </h4>

          <ul>
            <li>Human expert review of your analysis</li>
            <li>Direct consultation with a relevant expert</li>
            <li>Review and confirmation before final PDF reports</li>
            <li>Priority processing</li>
          </ul>
        </div>
      )}

      {isPro ? (
        <div className="plan-state-message pro-message">
          <CheckCircle2 size={17} />
          You are already on the Pro plan.
        </div>
      ) : pending ? (
        <div className="plan-state-message pending-message">
          <Clock size={17} />
          Your Pro upgrade request is pending admin approval.
        </div>
      ) : (
        <button
          type="button"
          className="plan-upgrade-button"
          onClick={handleUpgradeRequest}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={17} className="plan-spinner" />
              Submitting Request...
            </>
          ) : (
            <>
              <Crown size={17} />
              Request Pro Upgrade
            </>
          )}
        </button>
      )}

      {success && (
        <div className="plan-feedback success">
          <CheckCircle2 size={15} />
          {success}
        </div>
      )}

      {error && (
        <div className="plan-feedback error">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {!isPro && (
        <p className="plan-upgrade-note">
          You can continue using your Standard plan while your request
          is being reviewed.
        </p>
      )}
    </section>
  );
}
