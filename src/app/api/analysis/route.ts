
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "analysis-files";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 10;
const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour

const ALLOWED_ANALYSES = [
  "business_analysis",
  "market_research",
  "competitor_analysis",
  "customer_sentiment_analysis",
  "ai_business_recommendations",
];

const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Verify authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "You must sign in before submitting an analysis." },
      { status: 401 }
    );
  }

  try {
    // 2. Verify n8n configuration
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      return NextResponse.json(
        { error: "The analysis service is not configured." },
        { status: 500 }
      );
    }

    // 3. Read submitted form
    const formData = await request.formData();

    const instructions = String(
      formData.get("instructions") || ""
    ).trim();

    const rawAnalyses = String(
      formData.get("analysis_types") || "[]"
    );

    let analysisTypes: string[];

    try {
      const parsed = JSON.parse(rawAnalyses);

      if (!Array.isArray(parsed)) {
        throw new Error("Invalid analysis types");
      }

      analysisTypes = [...new Set(parsed)];
    } catch {
      return NextResponse.json(
        { error: "Invalid analysis selection." },
        { status: 400 }
      );
    }

    if (
      analysisTypes.length === 0 ||
      analysisTypes.some(
        (type) => !ALLOWED_ANALYSES.includes(type)
      )
    ) {
      return NextResponse.json(
        { error: "Please select valid analysis types." },
        { status: 400 }
      );
    }

    if (!instructions || instructions.length > 10000) {
      return NextResponse.json(
        {
          error:
            "Instructions are required and must be under 10,000 characters.",
        },
        { status: 400 }
      );
    }

    // 4. Get actual account plan from Supabase
    const { data: accountPlan, error: planError } =
      await supabase
        .from("account_plans")
        .select("plan")
        .eq("user_id", user.id)
        .single();

    if (planError || !accountPlan) {
      return NextResponse.json(
        { error: "Could not verify your account plan." },
        { status: 500 }
      );
    }

    const plan =
      accountPlan.plan === "pro" ? "pro" : "standard";

    // 5. Validate uploaded files
    const uploadedFiles = formData
      .getAll("files")
      .filter(
        (item): item is File =>
          item instanceof File && item.size > 0
      );

    if (uploadedFiles.length > MAX_FILES) {
      return NextResponse.json(
        {
          error: `You can upload up to ${MAX_FILES} files per request.`,
        },
        { status: 400 }
      );
    }

    for (const file of uploadedFiles) {
      const lowerName = file.name.toLowerCase();

      const extension = ALLOWED_EXTENSIONS.find((ext) =>
        lowerName.endsWith(ext)
      );

      if (!extension) {
        return NextResponse.json(
          {
            error: `${file.name}: Only CSV, XLS and XLSX files are allowed.`,
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `${file.name}: Maximum file size is 20 MB.`,
          },
          { status: 400 }
        );
      }
    }

    // 6. Create analysis job
    const title = `Analysis - ${new Date()
      .toISOString()
      .slice(0, 10)}`;

    const { data: job, error: jobError } = await supabase
      .from("analysis_jobs")
      .insert({
        user_id: user.id,
        title,
        analysis_types: analysisTypes,
        instructions,
        plan_snapshot: plan,
        status: "pending",
      })
      .select("id")
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        {
          error:
            jobError?.message ||
            "Could not create analysis request.",
        },
        { status: 500 }
      );
    }

    const storagePaths: string[] = [];

    try {
      const fileRecords = [];

      // 7. Upload files to private Supabase Storage
      for (const file of uploadedFiles) {
        const safeName = file.name
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .slice(-120);

        const storagePath =
          `${user.id}/${job.id}/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file, {
            contentType:
              file.type || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            `Could not upload ${file.name}: ${uploadError.message}`
          );
        }

        storagePaths.push(storagePath);

        fileRecords.push({
          job_id: job.id,
          user_id: user.id,
          original_filename: file.name,
          storage_path: storagePath,
          mime_type:
            file.type || "application/octet-stream",
          size_bytes: file.size,
        });
      }

      // 8. Save file metadata in Supabase
      if (fileRecords.length > 0) {
        const { error: filesError } = await supabase
          .from("analysis_files")
          .insert(fileRecords);

        if (filesError) {
          throw new Error(filesError.message);
        }
      }

      // 9. Create temporary download URLs for n8n
      const filesForN8n = await Promise.all(
        fileRecords.map(async (file) => {
          const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(
              file.storage_path,
              SIGNED_URL_EXPIRY
            );

          if (error || !data?.signedUrl) {
            throw new Error(
              `Could not create download URL for ${file.original_filename}.`
            );
          }

          return {
            filename: file.original_filename,
            mime_type: file.mime_type,
            size_bytes: file.size_bytes,
            download_url: data.signedUrl,
          };
        })
      );

      // 10. Send analysis request to n8n
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-insight-secret": webhookSecret,
        },
        body: JSON.stringify({
  event: "analysis.requested",
  job_id: job.id,
  user_id: user.id,
  user_email: user.email,
  plan,
  analysis_types: analysisTypes,
  instructions,
  files: filesForN8n,
}),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });

      if (!webhookResponse.ok) {
        throw new Error(
          `The analysis service returned HTTP ${webhookResponse.status}.`
        );
      }

      // 11. Confirm submission to the website
      return NextResponse.json(
        {
          success: true,
          message: "Your analysis request was sent successfully.",
          job_id: job.id,
          plan,
          status: "pending",
          files_count: fileRecords.length,
        },
        { status: 202 }
      );
    } catch (processingError) {
      // 12. Roll back if upload or webhook submission fails
      if (storagePaths.length > 0) {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove(storagePaths);
      }

      await supabase
        .from("analysis_jobs")
        .delete()
        .eq("id", job.id)
        .eq("user_id", user.id);

      throw processingError;
    }
  } catch (error) {
    console.error("Analysis submission error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
