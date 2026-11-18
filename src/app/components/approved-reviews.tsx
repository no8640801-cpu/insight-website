import { createClient } from "@/lib/supabase/server";
import { Star } from "lucide-react";

const publicReviewAnalysisLabels: Record<string, string> = {
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

export default async function ApprovedReviews() {
  const supabase = await createClient();

  const { data: approvedReviews } = await supabase
    .from("customer_reviews")
    .select("id, user_id, analysis_types, rating, review_text, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(6);

  if (!approvedReviews || approvedReviews.length === 0) {
    return null;
  }

  const reviewUserIds = [
    ...new Set(approvedReviews.map((review) => review.user_id)),
  ];

  const { data: reviewProfiles } = reviewUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", reviewUserIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const reviewProfileById = new Map(
    (reviewProfiles ?? []).map((profile) => [profile.id, profile])
  );

  const averageRating =
    approvedReviews.reduce((total, review) => total + review.rating, 0) /
    approvedReviews.length;

  return (
    <section id="reviews" className="section">
      <div className="site-container">
        <div className="section-heading">
          <div className="eyebrow">CUSTOMER EXPERIENCES</div>

          <h2 className="section-title">What Our Clients Say.</h2>

          <p className="section-description">
            Feedback from customers who have received their INSIGHT analysis
            reports.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-sm text-[#D1D1D1]">
          <span className="text-2xl font-semibold text-[#F5F0E7]">
            {averageRating.toFixed(1)}
          </span>

          <span
            className="flex items-center gap-1 text-[#C6A66B]"
            aria-label={`${averageRating.toFixed(1)} out of 5 stars`}
          >
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                size={18}
                className={
                  index < Math.round(averageRating)
                    ? "fill-[#C6A66B]"
                    : "text-[#555555]"
                }
              />
            ))}
          </span>

          <span className="text-[#A8A8A8]">
            Based on {approvedReviews.length} approved{" "}
            {approvedReviews.length === 1 ? "review" : "reviews"}
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {approvedReviews.map((review) => {
            const profile = reviewProfileById.get(review.user_id);

            const types = Array.isArray(review.analysis_types)
              ? review.analysis_types
              : [];

            const typeLabels = types.map(
              (type: string) =>
                publicReviewAnalysisLabels[type] || type.replaceAll("_", " ")
            );

            return (
              <article
                key={review.id}
                className="rounded-2xl border border-white/10 bg-[#1B212A] p-6"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#C6A66B]">
                    {typeLabels.join(" · ") || "INSIGHT Analysis"}
                  </span>
                </div>

                <div
                  className="mb-4 flex items-center gap-1 text-[#C6A66B]"
                  aria-label={`${review.rating} out of 5 stars`}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      size={15}
                      className={
                        index < review.rating
                          ? "fill-[#C6A66B]"
                          : "text-[#555555]"
                      }
                    />
                  ))}
                </div>

                <p className="min-h-28 whitespace-pre-wrap text-sm leading-7 text-[#D1D1D1]">
                  “{review.review_text}”
                </p>

                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold text-[#F5F0E7]">
                    {profile?.full_name || "INSIGHT Customer"}
                  </p>

                  <p className="mt-1 text-xs text-[#858585]">
                    INSIGHT Client
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}