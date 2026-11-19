import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PdfFile = {
  name?: string;
  lang?: string;
  filename?: string;
  storage_path: string;
};

type Report = {
  id: string;
  job_id: string;
  user_id: string;
  summary: string | null;
  report_content: unknown;
  pdf_storage_path: string | null;
  pdf_files: PdfFile[] | null;
  report_status: string;
  created_at: string;
  updated_at: string;
};

type Job = {
  id: string;
  title: string | null;
  analysis_types: string[] | null;
  status: string;
  plan_snapshot: string | null;
  created_at: string;
};

type DownloadablePdf = {
  name: string;
  filename: string;
  storage_path: string;
  url: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

const SPECIAL_LABELS: Record<string, string> = {
  data_analysis: "Business Analysis",
  competitors_analysis_and_market_research:
    "Competitors Analysis & Market Research",
};

function formatLabel(value: string) {
  if (SPECIAL_LABELS[value]) return SPECIAL_LABELS[value];

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getPdfName(file: PdfFile) {
  if (file.name) return file.name;

  if (file.lang === "ar") return "Arabic Report";
  if (file.lang === "en") return "English Report";

  if (file.filename) {
    return file.filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
  }

  return "Analysis Report";
}

function ContentRenderer({ value }: { value: unknown }): ReactNode {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return (
      <p className="whitespace-pre-wrap text-sm leading-7 text-[#D1D1D1]">
        {String(value)}
      </p>
    );
  }

  if (typeof value === "boolean") {
    return <p className="text-sm text-[#D1D1D1]">{value ? "Yes" : "No"}</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-[#A8A8A8]">No content available.</p>;
    }

    const isSimpleList = value.every(
      (item) =>
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
    );

    if (isSimpleList) {
      return (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-[#D1D1D1]">
          {value.map((item, index) => (
            <li key={index}>{String(item)}</li>
          ))}
        </ul>
      );
    }

    return (
      <div className="space-y-4">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-white/10 bg-[#11151B] p-4"
          >
            <ContentRenderer value={item} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      return <p className="text-sm text-[#A8A8A8]">No content available.</p>;
    }

    return (
      <div className="space-y-5">
        {entries.map(([key, item]) => (
          <section key={key} className="space-y-2">
            <h3 className="text-sm font-semibold text-[#C6A66B]">
              {formatLabel(key)}
            </h3>
            <ContentRenderer value={item} />
          </section>
        ))}
      </div>
    );
  }

  return null;
}

export default async function ReportDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#11151B] p-8 text-[#F5F0E7]">
        Please sign in to view this report.
        <Link href="/login" className="ml-2 text-[#C6A66B]">
          Login
        </Link>
      </main>
    );
  }

  const { data: job } = await supabase
    .from("analysis_jobs")
    .select("id, title, analysis_types, status, plan_snapshot, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!job) {
    notFound();
  }

  const { data: report, error: reportError } = await supabase
    .from("analysis_reports")
    .select(
      "id, job_id, user_id, summary, report_content, pdf_storage_path, pdf_files, report_status, created_at, updated_at"
    )
    .eq("job_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (reportError) {
    console.error("Error loading analysis report:", reportError);
    throw new Error("Unable to load the analysis report.");
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-[#11151B] px-4 py-10 text-[#F5F0E7] sm:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard/analysis"
            className="inline-flex items-center gap-2 text-sm text-[#A8A8A8] hover:text-[#C6A66B]"
          >
            <ArrowLeft size={16} />
            Back to Analysis History
          </Link>

          <div className="mt-8 rounded-2xl border border-white/10 bg-[#1B212A] p-8">
            <FileText className="mb-4 text-[#C6A66B]" size={34} />

            <h1 className="text-2xl font-semibold">
              {job.title || "Analysis Report"}
            </h1>

            {job.status === "completed" ? (
              <>
                <p className="mt-3 text-[#A8A8A8]">
                  Your analysis is completed. The report is being prepared and
                  will appear here once it is saved.
                </p>

                <span className="mt-5 inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
                  Report preparation
                </span>
              </>
            ) : (
              <>
                <p className="mt-3 text-[#A8A8A8]">
                  This analysis does not have a completed report yet.
                </p>

                <span className="mt-5 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400">
                  Status: {job.status}
                </span>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  const typedReport = report as Report;
  const typedJob = job as Job;

  // Read all PDFs from the new pdf_files column.
  const storedPdfFiles: PdfFile[] = Array.isArray(typedReport.pdf_files)
    ? typedReport.pdf_files.filter(
        (file): file is PdfFile =>
          typeof file === "object" &&
          file !== null &&
          typeof file.storage_path === "string" &&
          file.storage_path.length > 0
      )
    : [];

  // Backward compatibility with old reports containing one PDF only.
  const pdfFilesToLoad: PdfFile[] =
    storedPdfFiles.length > 0
      ? storedPdfFiles
      : typedReport.pdf_storage_path
        ? [
            {
              name: "Analysis Report",
              filename: "report.pdf",
              storage_path: typedReport.pdf_storage_path,
            },
          ]
        : [];

  // Generate a separate signed URL for every PDF.
  const signedPdfResults = await Promise.all(
    pdfFilesToLoad.map(async (file) => {
      const filename = file.filename || "report.pdf";

      const { data, error } = await supabase.storage
        .from("analysis-reports")
        .createSignedUrl(file.storage_path, 60 * 10, {
          download: filename,
        });

      if (error || !data?.signedUrl) {
        console.error(
          `Could not create signed URL for ${file.storage_path}:`,
          error
        );

        return null;
      }

      return {
        name: getPdfName(file),
        filename,
        storage_path: file.storage_path,
        url: data.signedUrl,
      };
    })
  );

  const downloadablePdfs: DownloadablePdf[] = signedPdfResults.filter(
    (file): file is DownloadablePdf => file !== null
  );

  const isFinalized = typedReport.report_status === "finalized";

  const { data: existingReview } = await supabase
    .from("customer_reviews")
    .select("id, status")
    .eq("job_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const canSubmitReview = Boolean(
    downloadablePdfs.length > 0 && isFinalized && !existingReview
  );

  return (
    <main className="min-h-screen bg-[#11151B] px-4 py-8 text-[#F5F0E7] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard/analysis"
            className="inline-flex items-center gap-2 text-sm text-[#A8A8A8] transition hover:text-[#C6A66B]"
          >
            <ArrowLeft size={16} />
            Back to Analysis History
          </Link>
        </div>

        {canSubmitReview ? (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#C6A66B]/20 bg-[#1B212A] p-5">
            <div>
              <h2 className="font-semibold text-[#F5F0E7]">
                How was your experience?
              </h2>

              <p className="mt-1 text-sm text-[#A8A8A8]">
                Your final PDF reports are available. Share your feedback about
                this analysis.
              </p>
            </div>

            <Link
              href={`/dashboard/reviews?job=${typedJob.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#C6A66B] px-5 py-3 text-sm font-semibold text-[#11151B] transition hover:bg-[#d8bb83]"
            >
              Write a Review
            </Link>
          </section>
        ) : existingReview ? (
          <section className="rounded-2xl border border-white/10 bg-[#1B212A] p-5">
            <p className="font-semibold text-[#F5F0E7]">Review submitted</p>

            <p className="mt-1 text-sm text-[#A8A8A8]">
              {existingReview.status === "approved"
                ? "Your review has been published. Thank you for your feedback."
                : existingReview.status === "rejected"
                  ? "Your review was not approved. You can contact support if you have questions."
                  : "Your review is waiting for admin approval."}
            </p>
          </section>
        ) : null}

        <header className="rounded-2xl border border-white/10 bg-[#1B212A] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
              Analysis Completed
            </span>

            <span className="rounded-full border border-[#C6A66B]/20 bg-[#C6A66B]/10 px-3 py-1 text-xs text-[#C6A66B]">
              {formatLabel(typedReport.report_status)}
            </span>
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-[#C6A66B]">
            INSIGHT Business Intelligence
          </p>

          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {typedJob.title || "Analysis Report"}
          </h1>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#A8A8A8]">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={15} />
              {formatDate(typedJob.created_at)}
            </span>

            <span>
              {typedJob.plan_snapshot === "pro" ? "Pro Plan" : "Standard Plan"}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(typedJob.analysis_types ?? []).map((type) => (
              <span
                key={type}
                className="rounded-lg border border-white/10 bg-[#11151B] px-3 py-1.5 text-xs text-[#D1D1D1]"
              >
                {formatLabel(type)}
              </span>
            ))}
          </div>
        </header>

        {/* PDF Downloads */}
        <section className="rounded-2xl border border-[#C6A66B]/20 bg-[#1B212A] p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-[#C6A66B]/10 p-2.5 text-[#C6A66B]">
              <FileText size={21} />
            </div>

            <div>
              <h2 className="text-xl font-semibold">Your PDF Reports</h2>
              <p className="mt-1 text-xs text-[#A8A8A8]">
                Download your available analysis reports separately.
              </p>
            </div>
          </div>

          {downloadablePdfs.length > 0 ? (
            <div className="space-y-3">
              {downloadablePdfs.map((pdf, index) => (
                <div
                  key={`${pdf.storage_path}-${index}`}
                  className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#11151B] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
                      <FileText size={23} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-[#F5F0E7]">
                        {pdf.name}
                      </h3>

                      <p className="mt-1 text-xs text-[#A8A8A8]">
                        PDF Document
                      </p>
                    </div>
                  </div>

                  {isFinalized ? (
                    <a
                      href={pdf.url}
                      download={pdf.filename}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C6A66B] px-5 py-3 text-sm font-semibold text-[#11151B] transition hover:bg-[#d8bb83]"
                    >
                      <Download size={17} />
                      Download PDF
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-[#A8A8A8]">
                      <ShieldCheck size={15} />
                      Not finalized yet
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-white/10 bg-[#11151B] p-4 text-sm text-[#A8A8A8]">
              No PDF files are available yet.
            </p>
          )}

          {!isFinalized && downloadablePdfs.length > 0 && (
            <p className="mt-4 text-xs text-[#A8A8A8]">
              Your PDF files are saved, but downloads will become available
              after the report is finalized.
            </p>
          )}
        </section>

        {typedReport.summary && (
          <section className="rounded-2xl border border-[#C6A66B]/20 bg-[#1B212A] p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-[#C6A66B]/10 p-2.5 text-[#C6A66B]">
                <ShieldCheck size={21} />
              </div>

              <h2 className="text-xl font-semibold">Executive Summary</h2>
            </div>

            <p className="whitespace-pre-wrap text-sm leading-8 text-[#D1D1D1]">
              {typedReport.summary}
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#1B212A] p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="rounded-xl bg-[#C6A66B]/10 p-2.5 text-[#C6A66B]">
              <FileText size={21} />
            </div>

            <div>
              <h2 className="text-xl font-semibold">Detailed Analysis</h2>
              <p className="mt-1 text-xs text-[#A8A8A8]">
                Full analysis results and recommendations
              </p>
            </div>
          </div>

          <ContentRenderer value={typedReport.report_content} />
        </section>

        {typedReport.report_status !== "finalized" && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="text-sm font-semibold text-amber-400">
              Your report is not finalized yet.
            </p>

            <p className="mt-2 text-sm leading-6 text-[#A8A8A8]">
              {typedReport.report_status === "awaiting_review"
                ? "Your report is waiting for expert review."
                : typedReport.report_status === "awaiting_customer_approval"
                  ? "Your report is waiting for your confirmation."
                  : "The final PDF will become available when the report is finalized."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
