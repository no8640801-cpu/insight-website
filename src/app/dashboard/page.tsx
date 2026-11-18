import { connection } from "next/server";
import PlanUpgradeCard from "./PlanUpgradeCard";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  BarChart3,
  FileText,
  Plus,
  TrendingUp,
  Clock,
  ArrowUpRight,
  LogOut,
  Building2,
  LayoutDashboard,
  Settings,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  MessageSquareQuote,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export const instant = false;

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

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
  data_analysis: "Data Analysis",
  competitors_analysis_and_market_research: "Competitors Analysis & Market Research",
  action_plan: "Action Plan",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 size={14} />;

    case "failed":
      return <AlertCircle size={14} />;

    case "cancelled":
      return <XCircle size={14} />;

    default:
      return <Clock size={14} />;
  }
}

export default async function DashboardPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get customer profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.full_name || user.email?.split("@")[0] || "User";

  // Get current account plan
  const { data: planData } = await supabase
    .from("account_plans")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  const currentPlan = planData?.plan || "standard";

  // Check pending upgrade request
  const { data: pendingRequest } = await supabase
    .from("plan_upgrade_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  const hasPendingRequest = Boolean(pendingRequest);

  // Get all analysis requests belonging to this user
  const { data: analyses, error: analysesError } = await supabase
    .from("analysis_jobs")
    .select("id, title, analysis_types, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const analysisJobs = analyses || [];

  // Dashboard statistics
  const totalAnalyses = analysisJobs.length;

  const completedAnalyses = analysisJobs.filter(
    (job) => job.status === "completed"
  ).length;

  const processingAnalyses = analysisJobs.filter(
    (job) => job.status === "processing"
  ).length;

  const pendingAnalyses = analysisJobs.filter(
    (job) => job.status === "pending"
  ).length;

  const recentAnalyses = analysisJobs.slice(0, 5);

  return (
    <main className="dashboard-page">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <Link href="/" className="auth-logo">
          <div className="logo-icon">
            <BarChart3 size={23} />
          </div>

          <div>
            <div className="logo-name">INSIGHT.</div>
            <div className="logo-subtitle">
              BUSINESS INTELLIGENCE
            </div>
          </div>
        </Link>

        <div className="sidebar-label">MAIN MENU</div>

        <Link
          href="/dashboard"
          className="sidebar-link active"
        >
          <LayoutDashboard size={17} />
          Dashboard
        </Link>

        {/* Analysis History */}
        <Link
          href="/dashboard/analysis"
          className="sidebar-link"
        >
          <BarChart3 size={17} />
          My Analyses
        </Link>

        {/* New Analysis */}
        <Link
          href="/analysis/new"
          className="sidebar-link"
        >
          <Plus size={17} />
          New Analysis
        </Link>

        {/* Customer Reviews */}
        <Link
          href="/dashboard/reviews"
          className="sidebar-link"
        >
          <MessageSquareQuote size={17} />
          Reviews
        </Link>

        {/* Analysis Experts (Pro only) */}
        {currentPlan === "pro" && (
          <Link
            href="/dashboard/experts"
            className="sidebar-link"
          >
            <Users size={17} />
            Analysis Experts
          </Link>
        )}

        <div className="sidebar-bottom">
          <Link
            href="/dashboard"
            className="sidebar-link"
          >
            <Settings size={17} />
            Settings
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="sidebar-link logout-button"
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <div className="dashboard-breadcrumb">
              WORKSPACE / DASHBOARD
            </div>

            <h1>Dashboard</h1>
          </div>

          <div className="user-profile">
            <div className="user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="user-name">{displayName}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>
        </header>

        {/* Welcome Section */}
        <div className="welcome-section">
          <div>
            <div className="eyebrow">
              YOUR BUSINESS WORKSPACE
            </div>

            <h2>
              Welcome back, {displayName}.
            </h2>

            <p>
              Your business intelligence workspace is ready.
              Track your analysis requests and discover
              opportunities hidden in your data.
            </p>

            {profile?.company_name && (
              <div className="company-tag">
                <Building2 size={14} />
                {profile.company_name}
              </div>
            )}
          </div>

          <Link
            href="/analysis/new"
            className="gold-button"
          >
            <Plus size={17} />
            New Analysis
          </Link>
        </div>

        {/* Plan Upgrade */}
        <PlanUpgradeCard
          currentPlan={currentPlan}
          hasPendingRequest={hasPendingRequest}
        />

        {/* Statistics */}
        <div className="dashboard-stats">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-top">
              <span>Total Analyses</span>
              <FileText size={19} />
            </div>

            <h3>{totalAnalyses}</h3>
            <p>Your submitted analysis requests</p>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-top">
              <span>Completed Reports</span>
              <TrendingUp size={19} />
            </div>

            <h3>{completedAnalyses}</h3>
            <p>Reports ready to view</p>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-top">
              <span>Processing</span>
              <Clock size={19} />
            </div>

            <h3>{processingAnalyses}</h3>
            <p>Analyses currently in progress</p>
          </div>
        </div>

        {/* Pending Requests Summary */}
        {pendingAnalyses > 0 && (
          <div className="analysis-pending-notice">
            <Clock size={19} />

            <div>
              <strong>
                {pendingAnalyses} request
                {pendingAnalyses > 1 ? "s are" : " is"} waiting
                to be processed.
              </strong>

              <p>
                Your requests have been received successfully.
              </p>

              <Link
                href="/dashboard/analysis"
                className="text-link"
              >
                Manage Requests
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Recent Analyses */}
        <section className="dashboard-content-card">
          <div className="dashboard-card-heading">
            <div>
              <h3>Your Recent Analyses</h3>
              <p>Track your business analysis requests.</p>
            </div>

            <Link
              href="/dashboard/analysis"
              className="text-link"
            >
              View All
              <ArrowUpRight size={15} />
            </Link>
          </div>

          {analysesError ? (
            <div className="empty-state">
              <AlertCircle size={28} />

              <h3>Unable to Load Analyses</h3>

              <p>
                We could not retrieve your analysis requests.
                Please refresh the page and try again.
              </p>
            </div>
          ) : recentAnalyses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <BarChart3 size={30} />
              </div>

              <h3>No Analysis Yet</h3>

              <p>
                You haven&apos;t submitted any analysis requests.
                Start by selecting the analysis services
                that match your business needs.
              </p>

              <Link
                href="/analysis/new"
                className="gold-button"
              >
                Start Your First Analysis
                <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="dashboard-analysis-list">
              {recentAnalyses.map((job) => (
                <div
                  key={job.id}
                  className="dashboard-analysis-item"
                >
                  <div className="dashboard-analysis-icon">
                    <FileText size={21} />
                  </div>

                  <div className="dashboard-analysis-info">
                    {job.status === "completed" ? (
                      <Link
                        href={`/dashboard/analysis/${job.id}`}
                        className="font-semibold transition hover:text-[#C6A66B]"
                      >
                        {job.title || "Business Analysis"}
                      </Link>
                    ) : (
                      <strong>
                        {job.title || "Business Analysis"}
                      </strong>
                    )}

                    <p>
                      {(job.analysis_types || [])
                        .map(
                          (type: string) =>
                            analysisLabels[type] || type
                        )
                        .join(" · ")}
                    </p>

                    <small>
                      {formatDate(job.created_at)}
                    </small>
                  </div>

                  <div
                    className={`analysis-status status-${job.status}`}
                  >
                    {getStatusIcon(job.status)}

                    {statusLabels[job.status] || job.status}
                  </div>

                  {job.status === "completed" && (
                    <Link
                      href={`/dashboard/analysis/${job.id}`}
                      className="ml-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#C6A66B] transition hover:text-[#e1c58d]"
                    >
                      <Eye size={15} />
                      View Report
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h3>Quick Actions</h3>

          <div className="quick-action-grid">
            <Link
              href="/analysis/new"
              className="quick-action-card"
            >
              <div className="card-icon">
                <Plus size={22} />
              </div>

              <div>
                <h4>Create New Analysis</h4>
                <p>Start analyzing your business data.</p>
              </div>
            </Link>

            <Link
              href="/dashboard/analysis"
              className="quick-action-card"
            >
              <div className="card-icon">
                <FileText size={22} />
              </div>

              <div>
                <h4>Analysis History</h4>
                <p>Explore your previous analysis requests.</p>
              </div>
            </Link>
          </div>
        </section>

        <footer className="dashboard-footer">
          INSIGHT. BUSINESS INTELLIGENCE © 2026
        </footer>
      </section>
    </main>
  );
}
