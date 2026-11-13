
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
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,

        options: {
          // Email confirmation redirect
          emailRedirectTo: `${window.location.origin}/auth/confirm`,

          // Additional user information
          data: {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      // If email confirmation is disabled
      // Supabase creates an active session
      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
      } else {
        // If email confirmation is enabled
        setSuccess(
          "Your account was created successfully! Please check your email and click the confirmation link to activate your account."
        );
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">

        {/* Logo */}
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

        {/* Heading */}
        <div className="auth-heading">
          <div className="eyebrow">
            CREATE YOUR ACCOUNT
          </div>

          <h1>Start Your Business Journey.</h1>

          <p>
            Create your account to unlock intelligent
            business analytics and insights.
          </p>
        </div>

        {/* Registration Form */}
        <form
          onSubmit={handleRegister}
          className="auth-form"
        >

          {/* Full Name */}
          <div className="form-field">
            <label htmlFor="fullName">
              Full Name
            </label>

            <input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
              required
              autoComplete="name"
            />
          </div>

          {/* Company Name */}
          <div className="form-field">
            <label htmlFor="companyName">
              Company Name
            </label>

            <input
              id="companyName"
              type="text"
              placeholder="Enter your company name"
              value={companyName}
              onChange={(e) =>
                setCompanyName(e.target.value)
              }
              required
              autoComplete="organization"
            />
          </div>

          {/* Email */}
          <div className="form-field">
            <label htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="form-field">
            <label htmlFor="password">
              Password
            </label>

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                minLength={8}
                autoComplete="new-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-field">
            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              required
              autoComplete="new-password"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="auth-message error-message">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="auth-message success-message">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="gold-button auth-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={17} />
              </>
            )}
          </button>

        </form>

        {/* Security */}
        <div className="auth-security">
          <ShieldCheck size={16} />
          Your business information is securely managed.
        </div>

        {/* Login Link */}
        <div className="auth-switch">
          Already have an account?{" "}
          <Link href="/login">
            Sign In
          </Link>
        </div>

        <Link href="/" className="auth-back">
          Back to Home
        </Link>

      </div>
    </main>
  );
}
