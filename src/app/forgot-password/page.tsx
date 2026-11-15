
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/confirm?next=/update-password`,
        });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
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

        <div className="auth-heading">
          <div className="eyebrow">ACCOUNT RECOVERY</div>
          <h1>Forgot Password?</h1>
          <p>
            Enter your email address and we will send you a link
            to reset your password.
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="auth-message">
              <MailCheck size={20} className="inline mr-2" />
              If an account exists with this email, a password
              reset link has been sent. Please check your inbox.
            </div>

            <Link
              href="/login"
              className="gold-button auth-submit"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="auth-message error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="gold-button auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        )}

        <div className="auth-switch">
          <Link
            href="/login"
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft size={15} />
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
