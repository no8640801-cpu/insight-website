import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Clock3, MessageSquareQuote, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setReviewStatus } from "./actions";
export const instant = false;

type SearchParams = Promise<{ updated?: string; error?: string }>;

const analysisLabels: Record<string, string> = {
  business_analysis: "Business Analysis",
  market_research: "Market Research",
  competitor_analysis: "Competitor Analysis",
  customer_sentiment_analysis: "Customer Sentiment Analysis",
  ai_business_recommendations: "AI Business Recommendations",
  financial_statements: "Financial Statements",
  human_analyst: "Human Analyst",
  report_review: "Report Review",
  consultation: "Consultation",
  custom_reports: "Custom Reports",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || !isAdmin) redirect("/dashboard");

  const { data: reviews, error } = await supabase
    .from("customer_reviews")
    .select("id, user_id, job_id, analysis_types, rating, review_text, status, created_at, reviewed_at")
    .order("created_at", { ascending: false });

  const userIds = [...new Set((reviews ?? []).map((review) => review.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, company_name").in("id", userIds)
    : { data: [] as { id: string; full_name: string | null; company_name: string | null }[] };

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const allReviews = reviews ?? [];
  const pendingCount = allReviews.filter((review) => review.status === "pending").length;
  const approvedCount = allReviews.filter((review) => review.status === "approved").length;
  const rejectedCount = allReviews.filter((review) => review.status === "rejected").length;

  return (
    <main className="min-h-screen bg-[#11151B] px-4 py-8 text-[#F5F0E7] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[#A8A8A8] transition hover:text-[#C6A66B]">
          <ArrowLeft size={16} /> Back to Admin Dashboard
        </Link>

        <header className="rounded-2xl border border-white/10 bg-[#1B212A] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#C6A66B]/10 p-3 text-[#C6A66B]"><MessageSquareQuote size={24} /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C6A66B]">CUSTOMER FEEDBACK</p>
              <h1 className="mt-1 text-3xl font-semibold">Reviews Management</h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-[#A8A8A8]">Review customer feedback and approve only the reviews that should appear publicly on INSIGHT.</p>
        </header>

        {params.updated === "1" && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">Review status updated successfully.</div>}
        {params.error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">The review could not be updated. Please refresh and try again.</div>}

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Pending Approval", value: pendingCount, icon: Clock3 },
            { label: "Approved", value: approvedCount, icon: Check },
            { label: "Rejected", value: rejectedCount, icon: X },
          ].map((item) => {
            const Icon = item.icon;
            return <div key={item.label} className="rounded-2xl border border-white/10 bg-[#1B212A] p-5"><div className="flex items-center justify-between text-sm text-[#A8A8A8]"><span>{item.label}</span><Icon size={18} className="text-[#C6A66B]" /></div><p className="mt-3 text-3xl font-semibold">{item.value}</p></div>;
          })}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">All Customer Reviews</h2>
            <p className="mt-1 text-sm text-[#A8A8A8]">Newest submissions appear first.</p>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">Unable to load reviews. Check the customer_reviews table and its admin read policy.</div>
          ) : allReviews.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#1B212A] p-8 text-center text-sm text-[#A8A8A8]">No customer reviews have been submitted yet.</div>
          ) : (
            allReviews.map((review) => {
              const profile = profileById.get(review.user_id);
              const customerName = profile?.full_name || "INSIGHT Customer";
              const types = Array.isArray(review.analysis_types) ? review.analysis_types : [];
              return (
                <article key={review.id} className="rounded-2xl border border-white/10 bg-[#1B212A] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{customerName}</h3>
                      {profile?.company_name && <p className="mt-0.5 text-xs text-[#858585]">{profile.company_name}</p>}
                      <p className="mt-2 text-xs text-[#A8A8A8]">{types.map((type: string) => analysisLabels[type] || type.replaceAll("_", " ")).join(" · ") || "Analysis report"} · {formatDate(review.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[#C6A66B]" aria-label={`${review.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} className={index < review.rating ? "fill-[#C6A66B]" : "text-[#555555]"} />)}
                    </div>
                  </div>
                  <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#D1D1D1]">{review.review_text}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <span className={`rounded-full border px-3 py-1 text-xs ${review.status === "approved" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : review.status === "rejected" ? "border-red-500/20 bg-red-500/10 text-red-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400"}`}>{review.status}</span>
                    <div className="flex flex-wrap gap-2">
                      {review.status !== "approved" && (
                        <form action={setReviewStatus}>
                          <input type="hidden" name="review_id" value={review.id} />
                          <input type="hidden" name="status" value="approved" />
                          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"><Check size={14} /> Approve</button>
                        </form>
                      )}
                      {review.status !== "rejected" && (
                        <form action={setReviewStatus}>
                          <input type="hidden" name="review_id" value={review.id} />
                          <input type="hidden" name="status" value="rejected" />
                          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"><X size={14} /> Reject</button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
