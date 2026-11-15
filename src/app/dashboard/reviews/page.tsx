import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageSquareQuote, Star, Clock3, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "./ReviewForm";
export const instant = false;
type SearchParams = Promise<{ job?: string; submitted?: string; error?: string }>;

const analysisLabels: Record<string, string> = {
  business_analysis: "Business Analysis",
  market_research: "Market Research",
  competitor_analysis: "Competitor Analysis",
  customer_sentiment_analysis: "Customer Sentiment Analysis",
  ai_business_recommendations: "AI Business Recommendations",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusPresentation(status: string) {
  if (status === "approved") return { label: "Published", icon: CheckCircle2, className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" };
  if (status === "rejected") return { label: "Not approved", icon: XCircle, className: "border-red-500/20 bg-red-500/10 text-red-400" };
  return { label: "Pending approval", icon: Clock3, className: "border-amber-500/20 bg-amber-500/10 text-amber-400" };
}

export default async function CustomerReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: jobs, error: jobsError } = await supabase
    .from("analysis_jobs")
    .select("id, title, analysis_types, status")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  const jobIds = (jobs ?? []).map((job) => job.id);
  let eligibleJobs: { id: string; title: string | null; analysis_types: string[] | null }[] = [];

  if (jobIds.length > 0) {
    const { data: reports } = await supabase
      .from("analysis_reports")
      .select("job_id, report_status, pdf_storage_path")
      .eq("user_id", user.id)
      .in("job_id", jobIds)
      .eq("report_status", "finalized");

    const reportByJob = new Map((reports ?? []).map((report) => [report.job_id, report]));

    for (const job of jobs ?? []) {
      const report = reportByJob.get(job.id);
      if (!report?.pdf_storage_path) continue;

      const { data: signedPdf, error } = await supabase.storage
        .from("analysis-reports")
        .createSignedUrl(report.pdf_storage_path, 60);

      if (!error && signedPdf?.signedUrl) {
        eligibleJobs.push({
          id: job.id,
          title: job.title,
          analysis_types: job.analysis_types,
        });
      }
    }
  }

  const { data: reviews, error: reviewsError } = await supabase
    .from("customer_reviews")
    .select("id, job_id, analysis_types, rating, review_text, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const reviewedJobIds = new Set((reviews ?? []).map((review) => review.job_id));
  const jobsAvailableForReview = eligibleJobs.filter((job) => !reviewedJobIds.has(job.id));
  const selectedJobId = jobsAvailableForReview.some((job) => job.id === params.job) ? params.job : undefined;
  const errorMessages: Record<string, string> = {
    invalid: "Please select a report and a valid star rating.",
    length: "Your review must contain between 10 and 2,000 characters.",
    "not-eligible": "This report is not eligible for a review yet. Make sure its final report belongs to your account.",
    "pdf-unavailable": "The PDF is not currently available for download. Please try again later.",
    "already-reviewed": "You have already submitted a review for this report.",
    "submit-failed": "We could not submit your review. Please try again.",
  };

  return (
    <main className="min-h-screen bg-[#11151B] px-4 py-8 text-[#F5F0E7] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[#A8A8A8] transition hover:text-[#C6A66B]">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <header className="rounded-2xl border border-white/10 bg-[#1B212A] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#C6A66B]/10 p-3 text-[#C6A66B]"><MessageSquareQuote size={24} /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C6A66B]">CUSTOMER EXPERIENCE</p>
              <h1 className="mt-1 text-3xl font-semibold">Reviews</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#A8A8A8]">
            Share your experience after receiving your finalized PDF report. Your review will be checked by our admin team before it appears publicly.
          </p>
        </header>

        {params.submitted === "1" && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            Your review has been submitted successfully and is waiting for admin approval.
          </div>
        )}
        {params.error && errorMessages[params.error] && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{errorMessages[params.error]}</div>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#1B212A] p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Write a Review</h2>
            <p className="mt-1 text-sm text-[#A8A8A8]">Only reports with a finalized, downloadable PDF are eligible.</p>
          </div>

          {jobsAvailableForReview.length > 0 ? (
            <ReviewForm jobs={jobsAvailableForReview} selectedJobId={selectedJobId} />
          ) : jobsError ? (
            <p className="text-sm text-red-300">We could not load your completed reports. Please refresh the page.</p>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#11151B] p-5 text-sm leading-7 text-[#A8A8A8]">
              You do not have any eligible reports to review right now. Once a finalized PDF report is available in your account, you can share your feedback here.
              <div className="mt-3"><Link href="/dashboard/analysis" className="font-semibold text-[#C6A66B] hover:text-[#e1c58d]">View my analyses</Link></div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1B212A] p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">My Reviews</h2>
              <p className="mt-1 text-sm text-[#A8A8A8]">Track the approval status of your submitted reviews.</p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#A8A8A8]">{reviews?.length ?? 0} submitted</span>
          </div>

          {reviewsError ? (
            <p className="text-sm text-red-300">Unable to load your reviews right now.</p>
          ) : !reviews?.length ? (
            <p className="rounded-xl border border-white/10 bg-[#11151B] p-5 text-sm text-[#A8A8A8]">You have not submitted any reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const status = statusPresentation(review.status);
                const StatusIcon = status.icon;
                const types = Array.isArray(review.analysis_types) ? review.analysis_types : [];
                return (
                  <article key={review.id} className="rounded-xl border border-white/10 bg-[#11151B] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1 text-[#C6A66B]">
                          {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} className={index < review.rating ? "fill-[#C6A66B]" : "text-[#555555]"} />)}
                        </div>
                        <p className="mt-2 text-xs text-[#A8A8A8]">{types.map((type: string) => analysisLabels[type] || type.replaceAll("_", " ")).join(" · ") || "Analysis report"} · {formatDate(review.created_at)}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${status.className}`}><StatusIcon size={13} />{status.label}</span>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#D1D1D1]">{review.review_text}</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
