import PlanUpgradeCard from "./PlanUpgradeCard";
import { connection } from "next/server";
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
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export const instant = false;

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const analysisLabels: Record<string, string> = {
  business_analysis: "Business Analysis",
  market_research: "Market Research",
  competitor_analysis: "Competitor Analysis",
  customer_sentiment_analysis: "Customer Sentiment Analysis",
  ai_business_recommendations: "AI Business Recommendations",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
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

  // Get the customer's current account plan
  const { data: planData } = await supabase
    .from("account_plans")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  const currentPlan = planData?.plan || "standard";

  // Check whether the customer already has a pending upgrade request
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

  // Calculate dashboard statistics
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

        <Link href="/analysis" className="sidebar-link">
          <BarChart3 size={17} />
          My Analyses
        </Link>

        <Link href="/analysis/new" className="sidebar-link">
          <Plus size={17} />
          New Analysis
        </Link>

        <div className="sidebar-bottom">
          <Link href="/dashboard" className="sidebar-link">
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

          <Link href="/analysis/new" className="gold-button">
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

            <Link href="/analysis" className="text-link">
              View All <ArrowUpRight size={15} />
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

              <Link href="/analysis/new" className="gold-button">
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
                    <strong>{job.title}</strong>

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
                    {job.status === "completed" ? (
                      <CheckCircle2 size={14} />
                    ) : job.status === "failed" ? (
                      <AlertCircle size={14} />
                    ) : (
                      <Clock size={14} />
                    )}

                    {statusLabels[job.status] || job.status}
                  </div>
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
              href="/analysis"
              className="quick-action-card"
            >
              <div className="card-icon">
                <FileText size={22} />
              </div>

              <div>
                <h4>Analysis History</h4>
                <p>Explore your previous reports.</p>
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
