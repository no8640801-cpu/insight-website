import Link from "next/link";
import { Suspense } from "react";
import ApprovedReviews from "./components/approved-reviews";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  FileSpreadsheet,
  TrendingUp,
  Users,
  Wallet,
  Target,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
export const instant = false;
const analysisTypes = [
  {
    icon: TrendingUp,
    title: "Sales Analysis",
    description:
      "Discover sales trends, revenue performance, top-selling products, and hidden opportunities.",
  },
  {
    icon: Target,
    title: "Marketing Analysis",
    description:
      "Measure campaign performance, understand customer acquisition, and optimize marketing strategies.",
  },
  {
    icon: Wallet,
    title: "Financial Analysis",
    description:
      "Evaluate revenue, expenses, profitability, and cash flow to understand your financial health.",
  },
  {
    icon: Users,
    title: "Customer Analysis",
    description:
      "Understand customer behavior, retention, segmentation, and purchasing patterns.",
  },
  {
    icon: BarChart3,
    title: "Competitor Analysis",
    description:
      "Identify competitive advantages, market gaps, and opportunities to differentiate your business.",
  },
  {
    icon: BrainCircuit,
    title: "Business Intelligence",
    description:
      "Combine multiple data sources to generate a comprehensive view of your business performance.",
  },
];

const publicReviewAnalysisLabels: Record<string, string> = {
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
  data_analysis: "Business Analysis",
  competitors_analysis_and_market_research: "Competitors Analysis & Market Research",
  action_plan: "Action Plan",
};

const processSteps = [
  {
    number: "01",
    title: "Choose Your Analysis",
    description: "Select one or multiple analysis services based on your business goals.",
  },
  {
    number: "02",
    title: "Upload Your Data",
    description: "Submit your business documents and the required datasets securely.",
  },
  {
    number: "03",
    title: "Intelligent Analysis",
    description: "Our analysis engine processes your data and identifies important insights.",
  },
  {
    number: "04",
    title: "Get Your Report",
    description: "Receive visual reports, strategic insights, and actionable recommendations.",
  },
];

export default function Home() {
  

  return (
    <main>
      {/* Navigation */}
      <header className="site-container navbar">
        <Link href="/" className="logo">
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

        <nav className="nav-links">
          <Link href="#home">Home</Link>
          <Link href="#services">Services</Link>
          <Link href="#process">How It Works</Link>
          <Link href="#reviews">Reviews</Link>
        </nav>

        <Link href="/login" className="gold-button">
          Sign In <ArrowUpRight size={15} />
        </Link>
      </header>

      {/* Hero */}
      <section id="home" className="site-container hero">
        <div>
          <div className="eyebrow">
            <Sparkles size={14} style={{ display: "inline" }} />
            {" "}DATA-DRIVEN BUSINESS GROWTH
          </div>

          <h1 className="hero-title">
            Turn Your Data Into Your Next{" "}
            <span>Big Decision.</span>
          </h1>

          <p className="hero-description">
            Unlock the full potential of your business data.
            Discover hidden insights, identify growth opportunities,
            and make smarter decisions through intelligent business analysis.
          </p>

          <div className="hero-actions">
            <Link href="/register" className="gold-button">
              Start Your Analysis
              <ArrowRight size={16} />
            </Link>

            <Link href="#services" className="outline-button">
              Explore Services
            </Link>
          </div>

          <div className="hero-note">
            <ShieldCheck size={17} color="#c6a66b" />
            Secure Data Processing · Intelligent Insights · Actionable Results
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="hero-visual">
          <div className="visual-label">
            BUSINESS PERFORMANCE OVERVIEW
          </div>

          <div className="visual-stats">
            <div className="stat-box">
              <div className="stat-label">Revenue Growth</div>
              <div className="stat-value">+24.8%</div>
            </div>

            <div className="stat-box">
              <div className="stat-label">Business Insights</div>
              <div className="stat-value">128</div>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div className="visual-label">
              PERFORMANCE OVERVIEW
            </div>

            <div className="visual-chart">
              {[35, 48, 40, 65, 53, 80, 70, 95].map(
                (height, index) => (
                  <div
                    key={index}
                    className="chart-bar"
                    style={{ height: `${height}%` }}
                  />
                )
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 18,
              color: "#c6a66b",
              fontSize: 11,
            }}
          >
            <TrendingUp size={15} />
            Your business potential, clearly visualized.
          </div>
        </div>
      </section>

      {/* Analysis Services */}
      <section id="services" className="section">
        <div className="site-container">
          <div className="section-heading">
            <div className="eyebrow">OUR ANALYSIS SERVICES</div>

            <h2 className="section-title">
              Every Business Decision Starts With The Right Insight.
            </h2>

            <p className="section-description">
              Choose the analysis services that match your business
              objectives. Combine multiple analysis types in one
              request to get a more complete understanding of your business.
            </p>
          </div>

          <div className="analysis-grid">
            {analysisTypes.map((item) => {
              const Icon = item.icon;

              return (
                <article className="analysis-card" key={item.title}>
                  <div className="card-icon">
                    <Icon size={23} />
                  </div>

                  <h3>{item.title}</h3>

                  <p>{item.description}</p>

                  <Link href="/register" className="card-link">
                    Explore Analysis
                    <ArrowUpRight size={14} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="process" className="section process-section">
        <div className="site-container">
          <div className="section-heading">
            <div className="eyebrow">A SIMPLE PROCESS</div>

            <h2 className="section-title">
              From Raw Data To Strategic Decisions.
            </h2>

            <p className="section-description">
              A simple and structured process that transforms
              your business documents into meaningful intelligence.
            </p>
          </div>

          <div className="process-grid">
            {processSteps.map((step) => (
              <div className="process-item" key={step.number}>
                <div className="process-number">{step.number}</div>

                <h3>{step.title}</h3>

                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      {/* Approved Customer Reviews */}
<Suspense
  fallback={
    <section id="reviews" className="section">
      <div className="site-container text-center text-[#A8A8A8]">
        Loading customer reviews...
      </div>
    </section>
  }
>
  <ApprovedReviews />
</Suspense>

      {/* Call To Action */}
      <section className="site-container">
        <div className="cta-section">
          <div className="eyebrow">YOUR NEXT BUSINESS MOVE</div>

          <h2 className="section-title">
            Ready To Discover What Your Data Can Tell You?
          </h2>

          <p>
            Start analyzing your business data and turn
            complex information into clear opportunities for growth.
          </p>

          <Link href="/register" className="gold-button">
            Create Your Account
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="site-container footer-content">
          <div className="logo">
            <div className="logo-icon">
              <FileSpreadsheet size={20} />
            </div>

            <div>
              <div className="logo-name">INSIGHT.</div>
              <div className="logo-subtitle">
                BUSINESS INTELLIGENCE
              </div>
            </div>
          </div>

          <div>
            © 2026 INSIGHT. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
