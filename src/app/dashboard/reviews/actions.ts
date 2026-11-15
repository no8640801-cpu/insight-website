"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitReview(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const jobId = String(formData.get("job_id") ?? "").trim();
  const rating = Number(formData.get("rating"));
  const reviewText = String(formData.get("review_text") ?? "").trim();

  if (!jobId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect("/dashboard/reviews?error=invalid");
  }

  if (reviewText.length < 10 || reviewText.length > 2000) {
    redirect("/dashboard/reviews?error=length");
  }

  // Confirm that this analysis belongs to the signed-in customer.
  const { data: job, error: jobError } = await supabase
    .from("analysis_jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (jobError || !job) {
    redirect("/dashboard/reviews?error=not-eligible");
  }

  // A finalized database record is not enough: make sure the PDF can
  // actually be signed for download before accepting the review.
  const { data: report, error: reportError } = await supabase
    .from("analysis_reports")
    .select("job_id, report_status, pdf_storage_path")
    .eq("job_id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    reportError ||
    !report ||
    report.report_status !== "finalized" ||
    !report.pdf_storage_path
  ) {
    redirect("/dashboard/reviews?error=not-eligible");
  }

  const { data: signedPdf, error: signedPdfError } = await supabase.storage
    .from("analysis-reports")
    .createSignedUrl(report.pdf_storage_path, 60);

  if (signedPdfError || !signedPdf?.signedUrl) {
    redirect("/dashboard/reviews?error=pdf-unavailable");
  }

  const { error: insertError } = await supabase
    .from("customer_reviews")
    .insert({
      job_id: jobId,
      rating,
      review_text: reviewText,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      redirect("/dashboard/reviews?error=already-reviewed");
    }

    console.error("Review submission failed:", insertError.message);
    redirect("/dashboard/reviews?error=submit-failed");
  }

  revalidatePath("/dashboard/reviews");
  revalidatePath(`/dashboard/analysis/${jobId}`);
  redirect("/dashboard/reviews?submitted=1");
}
