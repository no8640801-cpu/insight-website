"use client";

import { useRouter } from "next/navigation";
import {
  Crown,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

type Props = {
  currentPlan: string;
  hasPendingRequest: boolean;
};

export default function PlanUpgradeCard({
  currentPlan,
  hasPendingRequest,
}: Props) {
  const router = useRouter();

  const isPro = currentPlan === "pro";

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
      ) : (
        <>
          {hasPendingRequest && (
            <div className="plan-state-message pending-message">
              <Clock size={17} />
              You have an earlier upgrade request waiting for admin approval.
              You can also upgrade instantly by paying online.
            </div>
          )}

          <button
            type="button"
            className="plan-upgrade-button"
            onClick={() => router.push("/upgrade")}
          >
            <Crown size={17} />
            Upgrade to Pro
          </button>
        </>
      )}
    </section>
  );
}
