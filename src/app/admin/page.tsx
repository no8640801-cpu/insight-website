
import { redirect } from "next/navigation";
import {
  BarChart3,
  Users,
  FileText,
  Clock3,
  Crown,
  ArrowUpRight,
  Activity,
  ShieldCheck,
  MessageSquareQuote,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

const analysisLabels: Record<string, string> = {
  data_analysis: "Business Analysis",
  competitors_analysis_and_market_research:
    "Competitors Analysis & Market Research",
  action_plan: "Action Plan",
};

export default async function AdminDashboardPage() {

  const supabase = await createClient();

  // 1. Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Check admin permissions
  const { data: isAdmin, error: adminError } =
    await supabase.rpc("is_admin");

  if (adminError || !isAdmin) {
    redirect("/dashboard");
  }

  // 3. Get dashboard statistics
  const [
    customersResult,
    analysesResult,
    pendingResult,
    proResult,
    recentAnalysesResult,
    pendingReviewsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("analysis_jobs")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("plan_upgrade_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("account_plans")
      .select("user_id", { count: "exact", head: true })
      .eq("plan", "pro"),

    supabase
      .from("analysis_jobs")
      .select("id, title, analysis_types, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("customer_reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const stats = [
    {
      title: "Total Customers",
      value: customersResult.count ?? 0,
      icon: Users,
      description: "Registered accounts",
    },
    {
      title: "Analysis Requests",
      value: analysesResult.count ?? 0,
      icon: FileText,
      description: "All submitted requests",
    },
    {
      title: "Pending Pro Requests",
      value: pendingResult.count ?? 0,
      icon: Clock3,
      description: "Waiting for your review",
    },
    {
      title: "Pro Accounts",
      value: proResult.count ?? 0,
      icon: Crown,
      description: "Active Pro customers",
    },
    {
      title: "Pending Reviews",
      value: pendingReviewsResult.count ?? 0,
      icon: MessageSquareQuote,
      description: "Waiting for your approval",
    },
  ];

  const recentAnalyses = recentAnalysesResult.data ?? [];

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function statusClass(status: string) {
    switch (status) {
      case "completed":
        return "admin-status completed";
      case "processing":
        return "admin-status processing";
      case "failed":
        return "admin-status failed";
      default:
        return "admin-status pending";
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-container">

        {/* Header */}
        <header className="admin-header">
          <div>
            <div className="admin-eyebrow">
              <ShieldCheck size={15} />
              ADMINISTRATION
            </div>

            <h1>Admin Dashboard</h1>

            <p>
              Monitor your platform, manage customers, and review
              business analysis requests.
            </p>
          </div>

          <div className="admin-user">
            <div className="admin-avatar">
              <ShieldCheck size={20} />
            </div>

            <div>
              <strong>Administrator</strong>
              <span>{user.email}</span>
            </div>
          </div>
        </header>

        {/* Overview */}
        <section className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span className="admin-eyebrow">PLATFORM OVERVIEW</span>
              <h2>Overview</h2>
            </div>

            <span className="admin-live">
              <span />
              Live Data
            </span>
          </div>

          <div className="admin-stats-grid">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div className="admin-stat-card" key={stat.title}>
                  <div className="admin-stat-top">
                    <span>{stat.title}</span>
                    <div className="admin-stat-icon">
                      <Icon size={21} />
                    </div>
                  </div>

                  <strong className="admin-stat-value">
                    {stat.value.toLocaleString()}
                  </strong>

                  <span className="admin-stat-description">
                    {stat.description}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Requests */}
        <section className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span className="admin-eyebrow">CUSTOMER ACTIVITY</span>
              <h2>Recent Analysis Requests</h2>
            </div>
          </div>

          <div className="admin-table-wrapper">
            {recentAnalyses.length === 0 ? (
              <div className="admin-empty">
                <BarChart3 size={32} />
                <h3>No analysis requests yet</h3>
                <p>
                  Customer requests will appear here once submitted.
                </p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Analysis Types</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {recentAnalyses.map((analysis) => (
                    <tr key={analysis.id}>
                      <td>
                        <div className="admin-request-title">
                          <FileText size={17} />
                          <span>{analysis.title}</span>
                        </div>
                      </td>

                      <td>
                        <div className="admin-analysis-types">
                          {analysis.analysis_types
                            ?.map((type: string) => analysisLabels[type] || type.replaceAll("_", " "))
                            .join(", ") || "—"}
                        </div>
                      </td>

                      <td>
                        <span className={statusClass(analysis.status)}>
                          {analysis.status}
                        </span>
                      </td>

                      <td>{formatDate(analysis.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Quick Access */}
        <section className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span className="admin-eyebrow">MANAGEMENT</span>
              <h2>Quick Access</h2>
            </div>
          </div>

          <div className="admin-quick-grid">
            <div className="admin-quick-card">
              <div className="admin-quick-icon">
                <Users size={22} />
              </div>

              <h3>Customer Management</h3>
              <p>
                View customer accounts and manage their subscription plans.
              </p>

              <a href="/admin/customers" className="admin-quick-link">
                Manage Customers →
              </a>
            </div>

            
<div className="admin-quick-card">
  <div className="admin-quick-icon">
    <Crown size={22} />
  </div>

  <h3>Pro Upgrade Requests</h3>

  <p>
    Review customer requests to upgrade their accounts to Pro.
  </p>

  <a href="/admin/upgrades" className="admin-quick-link">
    Manage Upgrade Requests →
  </a>
</div>


            <div className="admin-quick-card">
              <div className="admin-quick-icon">
                <MessageSquareQuote size={22} />
              </div>

              <h3>Reviews Management</h3>
              <p>
                Approve or reject customer reviews before they appear publicly.
              </p>
              <a href="/admin/reviews" className="admin-quick-link">
                Manage Reviews →
              </a>
            </div>

            <div className="admin-quick-card">
              <div className="admin-quick-icon">
                <Activity size={22} />
              </div>

              <h3>Analysis Management</h3>
              <p>
                Monitor submitted requests and track their processing status.
              </p>

              <span className="admin-coming-soon">
                Coming in next step
              </span>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
