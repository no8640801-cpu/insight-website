
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  BarChart3,
  BrainCircuit,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  FileStack,
  FileText,
  Globe2,
  Landmark,
  Loader2,
  Lock,
  Lightbulb,
  MessageSquareText,
  MessagesSquare,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const analysisOptions = [
  {
    id: "business_analysis",
    title: "Business Analysis",
    description: "Evaluate business performance, operations and growth.",
    icon: BarChart3,
  },
  {
    id: "market_research",
    title: "Market Research",
    description: "Understand your market, trends and opportunities.",
    icon: Globe2,
  },
  {
    id: "competitor_analysis",
    title: "Competitor Analysis",
    description: "Discover competitors, strengths and weaknesses.",
    icon: Users,
  },
  {
    id: "customer_sentiment_analysis",
    title: "Customer Sentiment Analysis",
    description: "Understand customer opinions and feedback.",
    icon: MessageSquareText,
  },
  {
    id: "ai_business_recommendations",
    title: "AI Business Recommendations",
    description: "Get actionable recommendations for your business.",
    icon: Lightbulb,
  },
  {
    id: "financial_statements",
    proOnly: true,
    title: "Financial Statements",
    description: "Review financial statements, profitability and financial health.",
    icon: Landmark,
  },
  {
    id: "human_analyst",
    proOnly: true,
    title: "Human Analyst",
    description: "Work with a human analyst who reviews your data and findings.",
    icon: UserCheck,
  },
  {
    id: "report_review",
    title: "Report Review",
    description: "Have your report reviewed for accuracy, quality and clarity.",
    icon: ClipboardCheck,
  },
  {
    id: "consultation",
    proOnly: true,
    title: "Consultation",
    description: "Get expert guidance and answers to your business questions.",
    icon: MessagesSquare,
  },
  {
    id: "custom_reports",
    title: "Custom Reports",
    description: "Receive reports tailored to your specific needs and format.",
    icon: FileStack,
  },
];

const PRO_ONLY_ANALYSES = analysisOptions
  .filter((option) => "proOnly" in option && option.proOnly)
  .map((option) => option.id);

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

export default function NewAnalysisPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [plan, setPlan] = useState<"standard" | "pro">("standard");
  const [loadingPlan, setLoadingPlan] = useState(true);

  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [submittedJobId, setSubmittedJobId] = useState("");

  useEffect(() => {
    async function loadPlan() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data } = await supabase
        .from("account_plans")
        .select("plan")
        .eq("user_id", user.id)
        .single();

      if (data?.plan === "pro") {
        setPlan("pro");
      }

      setLoadingPlan(false);
    }

    loadPlan();
  }, []);

  function toggleAnalysis(id: string) {
    if (PRO_ONLY_ANALYSES.includes(id) && plan !== "pro") return;

    setSelectedAnalyses((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function handleFiles(selectedFiles: FileList | null) {
    if (!selectedFiles) return;

    setError("");

    const incomingFiles = Array.from(selectedFiles);
    const validFiles: File[] = [];

    for (const file of incomingFiles) {
      const extension = file.name
        .toLowerCase()
        .slice(file.name.lastIndexOf("."));

      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setError(`${file.name}: Only CSV, XLS and XLSX files are allowed.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: File size must not exceed 20 MB.`);
        continue;
      }

      validFiles.push(file);
    }

    setFiles((current) => {
      const combined = [...current];

      for (const file of validFiles) {
        const alreadyAdded = combined.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        );

        if (!alreadyAdded) combined.push(file);
      }

      return combined;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  
  function handleReview() {
    setError("");
    setSuccess("");

    if (selectedAnalyses.length === 0) {
      setError("Please select at least one analysis type.");
      setShowReview(false);
      return;
    }

    if (!instructions.trim()) {
      setError("Please describe what you want us to analyze.");
      setShowReview(false);
      return;
    }

    setShowReview(true);
  }

  async function handleSubmit() {
    setError("");
    setSuccess("");

    if (selectedAnalyses.length === 0) {
      setError("Please select at least one analysis type.");
      return;
    }

    if (
      plan !== "pro" &&
      selectedAnalyses.some((id) => PRO_ONLY_ANALYSES.includes(id))
    ) {
      setError("Some selected analysis types are available on the Pro plan only.");
      return;
    }

    if (!instructions.trim()) {
      setError("Please describe what you want us to analyze.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append(
        "analysis_types",
        JSON.stringify(selectedAnalyses)
      );

      formData.append("instructions", instructions.trim());

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/analysis", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to submit your request."
        );
      }

      setSuccess(result.message);
      setSubmittedJobId(result.job_id);

      setSelectedAnalyses([]);
      setInstructions("");
      setFiles([]);
      setShowReview(false);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }


  const selectedNames = analysisOptions
    .filter((item) => selectedAnalyses.includes(item.id))
    .map((item) => item.title);

  return (
    <main className="analysis-page">
      <header className="analysis-topbar">
        <Link href="/dashboard" className="analysis-brand">
          <span className="analysis-brand-icon">
            <BarChart3 size={22} />
          </span>

          <span>
            <strong>INSIGHT.</strong>
            <small>BUSINESS INTELLIGENCE</small>
          </span>
        </Link>

        <Link href="/dashboard" className="analysis-back">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </header>

      <div className="analysis-content">
        <div className="analysis-intro">
          <div className="analysis-eyebrow">
            <Sparkles size={14} />
            INTELLIGENT BUSINESS ANALYSIS
          </div>

          <h1>
            Turn your data into
            <span> meaningful insights.</span>
          </h1>

          <p>
            Choose your analysis, upload your business data,
            and tell us what you want to discover.
          </p>
        </div>

        <section className="analysis-plan-bar">
          <div className="analysis-plan-info">
            <div className="analysis-plan-icon">
              {plan === "pro" ? (
                <Sparkles size={20} />
              ) : (
                <ShieldCheck size={20} />
              )}
            </div>

            <div>
              <span className="analysis-small-label">
                YOUR CURRENT PLAN
              </span>

              <strong>
                {loadingPlan
                  ? "Loading..."
                  : plan === "pro"
                    ? "Pro Package"
                    : "Standard Package"}
              </strong>
            </div>
          </div>

          {plan === "pro" ? (
            <span className="analysis-plan-status pro-status">
              <CheckCircle2 size={15} />
              Pro Active
            </span>
          ) : (
            <Link href="/dashboard" className="analysis-upgrade-link">
              Explore Pro <ArrowUp size={14} />
            </Link>
          )}
        </section>

        <section className="analysis-section">
          <div className="analysis-section-heading">
            <div>
              <span className="analysis-step">01 / ANALYSIS TYPE</span>
              <h2>What would you like to analyze?</h2>
              <p>Select one or more analysis services.</p>
            </div>

            <span className="analysis-selected-count">
              {selectedAnalyses.length} Selected
            </span>
          </div>

          <div className="analysis-options-grid">
            {analysisOptions.map((option) => {
              const Icon = option.icon;
              const selected = selectedAnalyses.includes(option.id);
              const locked =
                "proOnly" in option && option.proOnly && plan !== "pro";

              return (
                <button
                  type="button"
                  key={option.id}
                  className={`analysis-option ${selected ? "selected" : ""} ${locked ? "locked" : ""}`}
                  onClick={() => toggleAnalysis(option.id)}
                  disabled={locked}
                  aria-disabled={locked}
                >
                  <span className="analysis-option-icon">
                    <Icon size={21} />
                  </span>

                  <span className="analysis-option-copy">
                    <strong>
                      {option.title}
                      {"proOnly" in option && option.proOnly && (
                        <em className="analysis-pro-badge">
                          <Lock size={10} /> Pro
                        </em>
                      )}
                    </strong>
                    <small>{option.description}</small>
                  </span>

                  <span className="analysis-checkbox">
                    {selected && <Check size={15} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="analysis-section">
          <div className="analysis-section-heading">
            <div>
              <span className="analysis-step">02 / YOUR DATA</span>
              <h2>Upload your business files</h2>
              <p>Attach the files you want us to use in your analysis.</p>
            </div>
          </div>

          <button
            type="button"
            className="analysis-upload-area"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="analysis-upload-icon">
              <Paperclip size={22} />
            </span>

            <strong>Click to upload your files</strong>
            <span>CSV, XLS or XLSX · Maximum 20 MB per file</span>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </button>

          {files.length > 0 && (
            <div className="analysis-file-list">
              {files.map((file, index) => (
                <div className="analysis-file-item" key={`${file.name}-${index}`}>
                  <FileSpreadsheet size={20} />

                  <div className="analysis-file-info">
                    <strong>{file.name}</strong>
                    <small>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </small>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="analysis-section">
          <div className="analysis-section-heading">
            <div>
              <span className="analysis-step">03 / INSTRUCTIONS</span>
              <h2>Tell us what you need</h2>
              <p>
                Describe your goals, questions and any specific
                requirements for the analysis.
              </p>
            </div>
          </div>

          <div className="analysis-chat-box">
            <div className="analysis-chat-heading">
              <span className="analysis-chat-avatar">
                <BrainCircuit size={19} />
              </span>

              <div>
                <strong>Analysis Instructions</strong>
                <small>Give us as much context as possible.</small>
              </div>
            </div>

            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="For example: Analyze our sales performance over the last 12 months, identify our most profitable products, compare monthly trends, and suggest ways to increase revenue..."
              rows={6}
            />

            <div className="analysis-chat-footer">
              <span>
                <FileText size={14} />
                Your instructions will be attached to this request.
              </span>

              <span>{instructions.length} characters</span>
            </div>
          </div>
        </section>

        {error && (
          <div className="analysis-error">
            <X size={17} />
            {error}
          </div>
        )}
        {success && (
  <div className="analysis-success">
    <CheckCircle2 size={19} />

    <div>
      <strong>{success}</strong>

      <p>Your request ID: {submittedJobId}</p>

      <Link href="/dashboard">
        Go to Dashboard →
      </Link>
    </div>
  </div>
)}
        <div className="analysis-submit-area">
          <div>
            <strong>Your analysis request</strong>
            <span>
              {selectedAnalyses.length} analysis types · {files.length} files
            </span>
          </div>

          <button
            type="button"
            className="analysis-submit-button"
            onClick={handleReview}
            disabled={loadingPlan}
          >
            Review Request
            <ArrowUp size={18} />
          </button>
        </div>

        {showReview && (
          <div className="analysis-review-panel">
            <div className="analysis-review-heading">
              <div>
                <span className="analysis-step">REQUEST PREVIEW</span>
                <h2>Review your analysis</h2>
              </div>

              <button
                type="button"
                onClick={() => setShowReview(false)}
                aria-label="Close preview"
              >
                <X size={19} />
              </button>
            </div>

            <p><strong>Plan:</strong> {plan.toUpperCase()}</p>
            <p><strong>Analysis:</strong> {selectedNames.join(", ")}</p>
            <p><strong>Files:</strong> {files.length}</p>

            <div className="analysis-review-instructions">
              <strong>Your instructions</strong>
              <p>{instructions}</p>
            </div>

            
<div className="analysis-review-note">
  Your request is ready to be saved to your account.
</div>

<button
  type="button"
  className="analysis-submit-button analysis-confirm-button"
  onClick={handleSubmit}
  disabled={submitting}
>
  {submitting ? (
    <>
      <Loader2 size={17} className="animate-spin" />
      Submitting Request...
    </>
  ) : (
    <>
      Submit Analysis Request
      <ArrowUp size={18} />
    </>
  )}
</button>

          </div>
        )}
      </div>
    </main>
  );
}
