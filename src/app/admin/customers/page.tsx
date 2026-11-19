
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Crown,
  Mail,
  RefreshCw,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "./customers.css";

type Customer = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  plan: "standard" | "pro";
  created_at: string | null;
};

type PlanFilter = "all" | "pro" | "standard";

export default function AdminCustomersPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PlanFilter>("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: adminCheck, error: adminError } =
      await supabase.rpc("is_admin");

    if (adminError || !adminCheck) {
      router.replace("/dashboard");
      return;
    }

    const { data, error: listError } = await supabase.rpc(
      "admin_list_customers"
    );

    if (listError) {
      setError(
        listError.message.includes("admin_list_customers")
          ? "Customer Management is not set up in the database yet. Run the customer-management.sql file in the Supabase SQL Editor, then refresh."
          : listError.message
      );
      setLoading(false);
      return;
    }

    setCustomers(
      ((data ?? []) as Customer[]).map((customer) => ({
        ...customer,
        plan: customer.plan === "pro" ? "pro" : "standard",
      }))
    );

    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  async function handleCancelPro(customer: Customer) {
    const name = customer.full_name || customer.email || "this customer";

    const confirmed = window.confirm(
      `Cancel the Pro subscription for ${name}? They will return to the Standard plan.`
    );

    if (!confirmed) return;

    setCancellingId(customer.id);
    setError("");
    setSuccess("");

    const { error: cancelError } = await supabase.rpc(
      "admin_cancel_pro_plan",
      { p_user_id: customer.id }
    );

    if (cancelError) {
      setError(
        cancelError.message.includes("admin_cancel_pro_plan")
          ? "The cancel function is not set up in the database yet. Run the customer-management.sql file in the Supabase SQL Editor."
          : cancelError.message
      );
      setCancellingId(null);
      return;
    }

    setCustomers((current) =>
      current.map((item) =>
        item.id === customer.id
          ? { ...item, plan: "standard" }
          : item
      )
    );

    setSuccess(`${name} is now on the Standard plan.`);
    setCancellingId(null);
  }

  function formatDate(date: string | null) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const proCount = customers.filter(
    (customer) => customer.plan === "pro"
  ).length;

  const standardCount = customers.length - proCount;

  const visibleCustomers = customers.filter((customer) => {
    if (filter !== "all" && customer.plan !== filter) {
      return false;
    }

    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      customer.full_name,
      customer.company_name,
      customer.email,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });

  const filters: {
    key: PlanFilter;
    label: string;
    count: number;
  }[] = [
    { key: "all", label: "All", count: customers.length },
    { key: "pro", label: "Pro", count: proCount },
    {
      key: "standard",
      label: "Standard",
      count: standardCount,
    },
  ];

  return (
    <main className="admin-page customers-page">
      <div className="admin-container">

        {/* Page Header */}
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
              <Users size={14} />
              CUSTOMER MANAGEMENT
            </div>

            <h1>Customers</h1>

            <p>
              View all customer accounts and manage their subscription plans.
            </p>
          </div>

          <button
            className="upgrades-refresh"
            onClick={loadCustomers}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "customers-spinning" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="customers-summary">
          <div className="upgrades-summary">
            <div className="upgrades-summary-icon">
              <Users size={20} />
            </div>

            <div>
              <span>Total Customers</span>
              <strong>{customers.length}</strong>
            </div>
          </div>

          <div className="upgrades-summary">
            <div className="upgrades-summary-icon">
              <Crown size={20} />
            </div>

            <div>
              <span>Pro Accounts</span>
              <strong>{proCount}</strong>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="upgrades-alert error">
            {error}
          </div>
        )}

        {success && (
          <div className="upgrades-alert success">
            {success}
          </div>
        )}

        {/* Customers Section */}
        <section className="upgrades-section">

          <div className="customers-section-heading">
            <div>
              <h2>All Customers</h2>
              <p>
                Manage customer accounts and subscription status.
              </p>
            </div>

            <span className="customers-total-badge">
              {customers.length} Accounts
            </span>
          </div>

          {/* Search and Filters */}
          <div className="customers-toolbar">
            <div className="customers-search">
              <Search size={17} />

              <input
                type="search"
                placeholder="Search by name, company or email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="customers-filters">
              {filters.map((item) => (
                <button
                  key={item.key}
                  className={
                    filter === item.key ? "active" : ""
                  }
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                  <span>{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Customer List */}
          {loading ? (
            <div className="upgrades-empty">
              <RefreshCw size={27} className="customers-spinning" />
              <h3>Loading Customers</h3>
              <p>Please wait while customer data is being loaded.</p>
            </div>
          ) : visibleCustomers.length === 0 ? (
            <div className="upgrades-empty">
              <Users size={32} />
              <h3>No Customers Found</h3>
              <p>
                {customers.length === 0
                  ? "Registered customers will appear here."
                  : "Try a different search or filter."}
              </p>
            </div>
          ) : (
            <div className="upgrades-list">
              {visibleCustomers.map((customer) => (
                <article
                  className="customer-row"
                  key={customer.id}
                >
                  <div className="customer-row-main">
                    <div className="customer-row-icon">
                      <User size={21} />
                    </div>

                    <div className="customer-row-info">
                      <h3>
                        {customer.full_name || "Unnamed customer"}
                      </h3>

                      {customer.email && (
                        <span>
                          <Mail size={14} />
                          {customer.email}
                        </span>
                      )}

                      {customer.company_name && (
                        <span>
                          <Building2 size={14} />
                          {customer.company_name}
                        </span>
                      )}

                      <span className="customers-joined">
                        Joined: {formatDate(customer.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="customer-row-actions">
                    <span
                      className={`customer-plan ${customer.plan}`}
                    >
                      {customer.plan === "pro" && (
                        <Crown size={13} />
                      )}
                      {customer.plan}
                    </span>

                    {customer.plan === "pro" && (
                      <button
                        className="customer-cancel-pro"
                        onClick={() => handleCancelPro(customer)}
                        disabled={cancellingId !== null}
                      >
                        <X size={15} />

                        {cancellingId === customer.id
                          ? "Cancelling..."
                          : "Cancel Pro"}
                      </button>
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
