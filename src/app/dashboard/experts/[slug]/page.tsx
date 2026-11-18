import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getExpert, getInitials } from "@/lib/experts";
import ExpertBooking from "../ExpertBooking";

export const instant = false;

export default async function ExpertSchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;

  const expert = getExpert(slug);
  if (!expert || !expert.bookable) notFound();

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

  if (planData?.plan !== "pro") redirect("/upgrade");

  // Completed analyses the customer can attach to an "Analysis Review" meeting
  const { data: jobs } = await supabase
    .from("analysis_jobs")
    .select("id, title")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(20);

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

        <Link href="/dashboard/experts" className="analysis-back">
          <ArrowLeft size={16} />
          All Experts
        </Link>
      </header>

      <div className="analysis-content">
        <div className="expert-profile">
          <div className="expert-avatar large">{getInitials(expert.name)}</div>
          <div>
            <span className="analysis-eyebrow">BOOK A MEETING</span>
            <h1>{expert.name}</h1>
            <p className="expert-title">
              {expert.title}
              {expert.organization ? ` · ${expert.organization}` : ""}
            </p>
            <div className="expert-tags">
              {expert.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <ExpertBooking
          expertSlug={expert.slug}
          expertName={expert.name}
          jobs={jobs ?? []}
        />
      </div>
    </main>
  );
}
