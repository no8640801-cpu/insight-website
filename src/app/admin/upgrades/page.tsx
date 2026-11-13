
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  X,
  RefreshCw,
  Crown,
  Clock,
  Building2,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type UpgradeRequest = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requested_at: string;
  admin_notes: string | null;
  customer_name: string;
  company_name: string | null;
};

export default function AdminUpgradesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: adminCheck, error: adminError } = await supabase.rpc(
      "is_admin"
    );

    if (adminError || !adminCheck) {
      router.replace("/dashboard");
      return;
    }

    const { data: requestData, error: requestError } = await supabase
      .from("plan_upgrade_requests")
      .select("id, user_id, status, requested_at, admin_notes")
      .order("requested_at", { ascending: false });

    if (requestError) {
      setError(requestError.message);
      setLoading(false);
      return;
    }

    const userIds = [
      ...new Set((requestData ?? []).map((request) => request.user_id)),
    ];

    let profiles: {
      id: string;
      full_name: string | null;
      company_name: string | null;
    }[] = [];

    if (userIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, company_name")
        .in("id", userIds);

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      profiles = profileData ?? [];
    }

    const formattedRequests: UpgradeRequest[] = (requestData ?? []).map(
      (request) => {
        const profile = profiles.find(
          (item) => item.id === request.user_id
        );

        return {
          ...request,
          customer_name: profile?.full_name || "Unnamed customer",
          company_name: profile?.company_name || null,
        };
      }
    );

    setRequests(formattedRequests);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleReview(
    requestId: string,
    decision: "approved" | "rejected"
  ) {
    const action = decision === "approved" ? "approve" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this Pro upgrade request?`
    );

    if (!confirmed) return;

    setReviewingId(requestId);
    setError("");
    setSuccess("");

    const { error: reviewError } = await supabase.rpc(
      "review_plan_upgrade_request",
      {
        p_request_id: requestId,
        p_decision: decision,
        p_admin_notes: null,
      }
    );

    if (reviewError) {
      setError(reviewError.message);
      setReviewingId(null);
      return;
    }

    setSuccess(
      decision === "approved"
        ? "Request approved. The customer is now on the Pro plan."
        : "Upgrade request rejected."
    );

    await loadRequests();
    setReviewingId(null);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  return (
    <main className="admin-page">
      <div className="admin-container">
        <div className="upgrades-header">
          <div>
            <button
              className="upgrades-back"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <div className="admin-eyebrow">
              <Crown size={14} />
              PLAN MANAGEMENT
            </div>

            <h1>Pro Upgrade Requests</h1>

            <p>
              Review customer requests and manage their account plan upgrades.
            </p>
          </div>

          <button
            className="upgrades-refresh"
            onClick={loadRequests}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div className="upgrades-summary">
          <div className="upgrades-summary-icon">
            <Clock size={20} />
          </div>
          <div>
            <span>Pending Requests</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        {error && <div className="upgrades-alert error">{error}</div>}
        {success && <div className="upgrades-alert success">{success}</div>}

        <section className="upgrades-section">
          <div className="upgrades-section-heading">
            <h2>All Upgrade Requests</h2>
            <span>{requests.length} total requests</span>
          </div>

          {loading ? (
            <div className="upgrades-empty">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="upgrades-empty">
              <Crown size={30} />
              <h3>No upgrade requests yet</h3>
              <p>New customer requests will appear here.</p>
            </div>
          ) : (
            <div className="upgrades-list">
              {requests.map((request) => (
                <article className="upgrade-card" key={request.id}>
                  <div className="upgrade-card-main">
                    <div className="upgrade-customer-icon">
                      <User size={20} />
                    </div>

                    <div className="upgrade-customer-info">
                      <h3>{request.customer_name}</h3>

                      {request.company_name && (
                        <span className="upgrade-company">
                          <Building2 size={13} />
                          {request.company_name}
                        </span>
                      )}

                      <span className="upgrade-user-id">
                        Account ID: {request.user_id}
                      </span>

                      <span className="upgrade-date">
                        Requested: {formatDate(request.requested_at)}
                      </span>
                    </div>
                  </div>

                  <div className="upgrade-card-actions">
                    <span
                      className={`upgrade-status ${request.status}`}
                    >
                      {request.status}
                    </span>

                    {request.status === "pending" && (
                      <div className="upgrade-buttons">
                        <button
                          className="upgrade-approve"
                          onClick={() =>
                            handleReview(request.id, "approved")
                          }
                          disabled={reviewingId !== null}
                        >
                          <Check size={15} />
                          {reviewingId === request.id
                            ? "Processing..."
                            : "Approve"}
                        </button>

                        <button
                          className="upgrade-reject"
                          onClick={() =>
                            handleReview(request.id, "rejected")
                          }
                          disabled={reviewingId !== null}
                        >
                          <X size={15} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
