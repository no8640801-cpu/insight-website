
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      // Check whether the signed-in user is an admin
      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_admin");

      if (adminError) {
        setError("Unable to verify account permissions. Please try again.");
        await supabase.auth.signOut();
        return;
      }

      // Redirect according to account role
      if (isAdmin) {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }

      router.refresh();

    } catch {
      setError("Unable to sign in. Please try again.");
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
          <div className="eyebrow">WELCOME BACK</div>
          <h1>Welcome Back.</h1>
          <p>
            Sign in to access your business intelligence dashboard.
          </p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
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

          <div className="form-field">
            <label htmlFor="password">Password</label>

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
                      <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-[#C6A66B] transition hover:text-[#e1c58d]"
            >
              Forgot Password?
            </Link>
          </div>
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
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        <div className="auth-switch">
          Don&apos;t have an account?{" "}
          <Link href="/register">Create Account</Link>
        </div>

        <Link href="/" className="auth-back">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
