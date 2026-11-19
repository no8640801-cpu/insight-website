
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const instant = false;
type AnalysisJob = {
  id: string;
  title: string | null;
  analysis_types: string[] | null;
  status: string;
  plan_snapshot: string | null;
  created_at: string;
  updated_at: string | null;
};

type AnalysisReport = {
  job_id: string;
  report_status: string;
};

function getStatus(status: string) {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        icon: CheckCircle2,
      };
    case "processing":
      return {
        label: "Processing",
        className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        icon: LoaderCircle,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
        icon: XCircle,
      };
    case "failed":
      return {
        label: "Failed",
        className: "bg-red-500/10 text-red-400 border-red-500/20",
        icon: XCircle,
      };
    default:
      return {
        label: "Pending",
        className: "bg-amber-500/10 text-[#C6A66B] border-[#C6A66B]/20",
        icon: Clock3,
      };
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

const SPECIAL_LABELS: Record<string, string> = {
  data_analysis: "Business Analysis",
  competitors_analysis_and_market_research:
    "Competitors Analysis & Market Research",
};

function formatAnalysisType(type: string) {
  if (SPECIAL_LABELS[type]) return SPECIAL_LABELS[type];

  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function AnalysisHistoryPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#11151B] p-8 text-[#F5F0E7]">
        <p>Please sign in to view your analysis history.</p>
        <Link href="/login" className="mt-4 inline-block text-[#C6A66B]">
          Go to Login
        </Link>
      </main>
    );
  }

  const { data: jobs, error } = await supabase
    .from("analysis_jobs")
    .select(
      "id, title, analysis_types, status, plan_snapshot, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const jobList = (jobs ?? []) as AnalysisJob[];

  const jobIds = jobList.map((job) => job.id);

  let reports: AnalysisReport[] = [];

  if (jobIds.length > 0) {
    const { data: reportData } = await supabase
      .from("analysis_reports")
      .select("job_id, report_status")
      .eq("user_id", user.id)
      .in("job_id", jobIds);

    reports = (reportData ?? []) as AnalysisReport[];
  }

  const reportMap = new Map(
    reports.map((report) => [report.job_id, report])
  );

  const total = jobList.length;
  const completed = jobList.filter(
    (job) => job.status === "completed"
  ).length;
  const inProgress = jobList.filter(
    (job) => ["pending", "processing"].includes(job.status)
  ).length;

  return (
    <main className="min-h-screen bg-[#11151B] px-4 py-8 text-[#F5F0E7] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm text-[#A8A8A8] transition hover:text-[#C6A66B]"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>

            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C6A66B]">
              Your Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Analysis History
            </h1>
            <p className="mt-2 text-sm text-[#A8A8A8]">
              View and manage all your business analysis requests.
            </p>
          </div>

          <Link
            href="/analysis/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C6A66B] px-5 py-3 text-sm font-semibold text-[#11151B] transition hover:bg-[#d8bb83]"
          >
            <BarChart3 size={18} />
            New Analysis
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Requests"
            value={total}
            icon={<FileText size={20} />}
          />
          <StatCard
            label="Completed"
            value={completed}
            icon={<CheckCircle2 size={20} />}
          />
          <StatCard
            label="In Progress"
            value={inProgress}
            icon={<Clock3 size={20} />}
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#1B212A]">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <h2 className="text-lg font-semibold">All Analysis Requests</h2>
              <p className="mt-1 text-sm text-[#A8A8A8]">
                Your complete analysis activity.
              </p>
            </div>
            <span className="text-sm text-[#A8A8A8]">
              {total} {total === 1 ? "request" : "requests"}
            </span>
          </div>

          {error ? (
            <div className="p-8 text-center text-red-400">
              Unable to load your analysis history. Please refresh the page.
            </div>
          ) : jobList.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="mb-4 rounded-2xl border border-[#C6A66B]/20 bg-[#C6A66B]/10 p-4 text-[#C6A66B]">
                <FileText size={30} />
              </div>
              <h3 className="text-lg font-semibold">No Analysis Yet</h3>
              <p className="mt-2 max-w-md text-sm text-[#A8A8A8]">
                Your analysis requests will appear here after you submit your
                first request.
              </p>
              <Link
                href="/analysis/new"
                className="mt-6 rounded-xl bg-[#C6A66B] px-5 py-3 text-sm font-semibold text-[#11151B] hover:bg-[#d8bb83]"
              >
                Create Your First Analysis
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {jobList.map((job) => {
                const status = getStatus(job.status);
                const StatusIcon = status.icon;
                const report = reportMap.get(job.id);
                const canViewReport =
                  job.status === "completed" && !!report;

                return (
                  <div
                    key={job.id}
                    className="flex flex-col gap-5 px-5 py-6 transition hover:bg-white/[0.02] sm:px-7 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="break-words text-base font-semibold">
                          {job.title || "Business Analysis Request"}
                        </h3>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}
                        >
                          <StatusIcon size={13} />
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#A8A8A8]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={14} />
                          {formatDate(job.created_at)}
                        </span>
                        <span>
                          {job.plan_snapshot === "pro" ? "Pro Plan" : "Standard Plan"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(job.analysis_types ?? []).map((type) => (
                          <span
                            key={type}
                            className="rounded-lg border border-white/10 bg-[#11151B] px-2.5 py-1 text-xs text-[#C8C8C8]"
                          >
                            {formatAnalysisType(type)}
                          </span>
                        ))}
                      </div>

                      {job.status === "completed" && !report && (
                        <p className="mt-3 text-xs text-amber-400">
                          Your analysis is completed. The report is being prepared.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canViewReport && (
                        <Link
                          href={`/dashboard/analysis/${job.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#C6A66B] px-4 py-2.5 text-sm font-semibold text-[#11151B] hover:bg-[#d8bb83]"
                        >
                          View Report
                          <ArrowRight size={16} />
                        </Link>
                      )}

                      {job.status === "pending" && (
                        
<form
  action={`/api/analysis/${job.id}/cancel`}
  method="POST"
>
  <button
    type="submit"
    className="rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
  >
    Cancel Request
  </button>
</form>

                      )}

                      {job.status === "processing" && (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-sm text-blue-400">
                          <LoaderCircle size={15} className="animate-spin" />
                          In Progress
                        </span>
                      )}

                      {job.status === "failed" && (
                        <span className="rounded-xl border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
                          Analysis Failed
                        </span>
                      )}

                      {job.status === "cancelled" && (
                        <span className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[#A8A8A8]">
                          Request Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1B212A] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#A8A8A8]">{label}</p>
        <span className="text-[#C6A66B]">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold">{value}</p>
    </div>
  );
}
