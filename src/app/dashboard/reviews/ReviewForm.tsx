"use client";

import { useState } from "react";
import { Star, Send } from "lucide-react";
import { submitReview } from "./actions";

type EligibleJob = {
  id: string;
  title: string | null;
  analysis_types: string[] | null;
};

const labels: Record<string, string> = {
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
  data_analysis: "Business Analysis",
  competitors_analysis_and_market_research: "Competitors Analysis & Market Research",
  action_plan: "Action Plan",
};

export default function ReviewForm({
  jobs,
  selectedJobId,
}: {
  jobs: EligibleJob[];
  selectedJobId?: string;
}) {
  const [rating, setRating] = useState(0);

  return (
    <form action={submitReview} className="space-y-5">
      <div>
        <label
          htmlFor="job_id"
          className="mb-2 block text-sm font-medium text-[#F5F0E7]"
        >
          Analysis Report
        </label>
        <select
          id="job_id"
          name="job_id"
          required
          defaultValue={selectedJobId ?? ""}
          className="w-full rounded-xl border border-white/10 bg-[#11151B] px-4 py-3 text-sm text-[#F5F0E7] outline-none focus:border-[#C6A66B]"
        >
          <option value="" disabled>
            Select a report you received
          </option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title || "Analysis Report"} — {(job.analysis_types ?? [])
                .map((type) => labels[type] || type.replaceAll("_", " "))
                .join(", ")}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-3 block text-sm font-medium text-[#F5F0E7]">
          Your Rating
        </legend>
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="cursor-pointer">
              <input
                className="sr-only"
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                required
              />
              <Star
                size={30}
                strokeWidth={1.7}
                className={
                  value <= rating
                    ? "fill-[#C6A66B] text-[#C6A66B]"
                    : "text-[#777777] hover:text-[#C6A66B]"
                }
              />
              <span className="sr-only">{value} {value === 1 ? "star" : "stars"}</span>
            </label>
          ))}
          <span className="ml-2 text-sm text-[#A8A8A8]">
            {rating ? `${rating} out of 5` : "Select a rating"}
          </span>
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="review_text"
          className="mb-2 block text-sm font-medium text-[#F5F0E7]"
        >
          Your Review
        </label>
        <textarea
          id="review_text"
          name="review_text"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Tell us about the quality of your report and your experience with INSIGHT..."
          className="w-full resize-y rounded-xl border border-white/10 bg-[#11151B] px-4 py-3 text-sm leading-6 text-[#F5F0E7] outline-none placeholder:text-[#777777] focus:border-[#C6A66B]"
        />
        <p className="mt-2 text-xs text-[#858585]">
          Write between 10 and 2,000 characters. Your review will be published only after admin approval.
        </p>
      </div>

      <button
        type="submit"
        disabled={rating === 0}
        className="inline-flex items-center gap-2 rounded-xl bg-[#C6A66B] px-5 py-3 text-sm font-semibold text-[#11151B] transition hover:bg-[#d8bb83] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Send size={16} />
        Submit for Approval
      </button>
    </form>
  );
}
