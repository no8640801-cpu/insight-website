import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CheckoutButton from "./CheckoutButton";

export const instant = false;

type SearchParams = Promise<{ payment?: string }>;

const proFeatures = [
  "Book one-hour meetings with finance, data and fraud experts",
  "Human expert review of your analysis",
  "Direct consultation with a relevant expert",
  "Review and confirmation before final PDF reports",
  "Priority processing",
];

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const { payment } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: planData } = await supabase
    .from("account_plans")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  const isPro = planData?.plan === "pro";

  // Already Pro and not just back from paying: nothing to buy here
  if (isPro && payment !== "success") redirect("/dashboard");

  return (
    <main className="analysis-page">
      <header className="analysis-topbar">
        <Link href="/dashboard" className="analysis-brand">
          <span className="analysis-brand-icon">
            <BarChart3 size={22} />
          </span>
          <span>
            <strong>INSIGHT.</strong>
            <small>BUSINESS INTELLIGENCE</small>
          </span>
        </Link>

        <Link href="/dashboard" className="analysis-back">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </header>

      <div className="upgrade-content">
        {payment === "success" && (
          <div className="upgrade-banner success">
            <CheckCircle2 size={19} />
            <div>
              <strong>Payment received. Thank you!</strong>
              <p>
                {isPro
                  ? "Your account is now on the Pro plan."
                  : "Your account is being upgraded to Pro. This usually takes a few seconds, so refresh your dashboard shortly."}
              </p>
              <Link href="/dashboard">Go to Dashboard →</Link>
            </div>
          </div>
        )}

        {payment === "canceled" && (
          <div className="upgrade-banner warning">
            <AlertCircle size={19} />
            <div>
              <strong>Payment canceled</strong>
              <p>No charge was made. You can try again whenever you are ready.</p>
            </div>
          </div>
        )}

        {!isPro && (
          <section className="upgrade-card">
            <div className="upgrade-card-header">
              <span className="upgrade-card-icon">
                <Crown size={26} />
              </span>
              <div>
                <span className="analysis-step">UPGRADE YOUR PLAN</span>
                <h1>INSIGHT Pro</h1>
                <p>Unlock expert-led analysis and premium services.</p>
              </div>
            </div>

            <ul className="upgrade-feature-list">
              {proFeatures.map((feature) => (
                <li key={feature}>
                  <CheckCircle2 size={16} />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="upgrade-summary">
              <div>
                <span>Account</span>
                <strong>{user.email}</strong>
              </div>
              <div>
                <span>Plan</span>
                <strong>Standard → Pro</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>Shown on the secure payment page</strong>
              </div>
            </div>

            <CheckoutButton />

            <p className="upgrade-secure-note">
              <ShieldCheck size={14} />
              Payments are processed securely by Stripe. We never see or store
              your card details.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
