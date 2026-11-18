import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowRight, BarChart3, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EXPERTS, getInitials } from "@/lib/experts";
import MyBookings from "./MyBookings";

export const instant = false;

export default async function ExpertsPage() {
  await connection();

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

  // Analysis Experts are a Pro feature
  if (planData?.plan !== "pro") redirect("/upgrade");

  const { data: bookings } = await supabase
    .from("expert_bookings")
    .select("id, expert_name, service, start_at, status, event_id")
    .eq("user_id", user.id)
    .order("start_at", { ascending: false })
    .limit(30);

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

      <div className="analysis-content">
        <div className="analysis-intro">
          <span className="analysis-eyebrow">PRO · ANALYSIS EXPERTS</span>
          <h1>Consult our experts</h1>
          <p>
            Pick an expert, check their schedule and book a one-hour meeting
            to review your analysis or get advice.
          </p>
        </div>

        <div className="experts-grid">
          {EXPERTS.map((expert) => {
            const card = (
              <>
                <div className="expert-avatar">{getInitials(expert.name)}</div>
                <h3>{expert.name}</h3>
                <p className="expert-title">{expert.title}</p>
                {expert.organization && (
                  <p className="expert-org">{expert.organization}</p>
                )}
                <div className="expert-tags">
                  {expert.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <span className="expert-card-cta">
                  {expert.bookable ? (
                    <>
                      View schedule <ArrowRight size={14} />
                    </>
                  ) : (
                    "Booking opens soon"
                  )}
                </span>
              </>
            );

            return expert.bookable ? (
              <Link
                key={expert.slug}
                href={`/dashboard/experts/${expert.slug}`}
                className="expert-card"
              >
                {card}
              </Link>
            ) : (
              <div key={expert.slug} className="expert-card disabled">
                {card}
              </div>
            );
          })}
        </div>

        <section className="expert-section">
          <h2>
            <Users size={18} /> My Bookings
          </h2>
          <MyBookings bookings={bookings ?? []} serverNow={Date.now()} />
        </section>
      </div>
    </main>
  );
}
