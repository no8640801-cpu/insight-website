INSIGHT Customer Reviews implementation

Copy these files into the matching paths in your existing project, replacing the matching files where they already exist. New files are under src/app/dashboard/reviews and src/app/admin/reviews.

The implementation expects the customer_reviews table created by the SQL previously supplied in this conversation, including: job_id, user_id, analysis_types (jsonb), rating, review_text, status, reviewed_by, reviewed_at, created_at. It also expects the existing is_admin() Supabase function, analysis_jobs, analysis_reports, and the analysis-reports Storage bucket.

After copying, run:
  npm run dev

Then test with a customer account that owns a completed analysis whose analysis_reports row has report_status=finalized and a valid pdf_storage_path in the analysis-reports bucket. The customer should be able to submit one review for that job. The review should remain pending until an admin approves it at /admin/reviews. Only approved reviews appear on the public homepage.

TypeScript validation completed successfully with: node node_modules/typescript/bin/tsc --noEmit
A production build could not be completed in this environment because Next.js attempted to download its Linux SWC binary and network access was unavailable.
