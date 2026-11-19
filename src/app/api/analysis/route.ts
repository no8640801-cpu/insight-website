
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "analysis-files";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 10;
const SIGNED_URL_EXPIRY = 60 * 60;

const ALLOWED_ANALYSES = [
  "data_analysis",
  "competitors_analysis_and_market_research",
  "action_plan",
];

const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

type WebhookGroup = {
  url: string;
  analysisTypes: string[];
};

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

  let webhookDispatchStarted = false;

  try {
    // 2. Read submitted form
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
        (type) =>
          typeof type !== "string" ||
          !ALLOWED_ANALYSES.includes(type)
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

    // 3. Map each analysis type to its own n8n webhook
    const webhookMap: Record<string, string | undefined> = {
      data_analysis:
        process.env.N8N_WEBHOOK_BUSINESS_ANALYSIS_URL?.trim(),

      competitors_analysis_and_market_research:
        process.env.N8N_WEBHOOK_MARKET_RESEARCH_URL?.trim(),

      action_plan:
        process.env.N8N_WEBHOOK_ACTION_PLAN_URL?.trim(),
    };

    const webhookSecret =
      process.env.N8N_WEBHOOK_SECRET?.trim();

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "The analysis service secret is not configured." },
        { status: 500 }
      );
    }

    // Group selected analysis types by webhook URL.
    // Business Analysis and Action Plan currently share one URL,
    // so they will be sent together to that webhook.
    const webhookGroupsMap = new Map<string, string[]>();

    for (const analysisType of analysisTypes) {
      const webhookUrl = webhookMap[analysisType];

      if (!webhookUrl) {
        return NextResponse.json(
          {
            error: `The webhook for ${analysisType} is not configured.`,
          },
          { status: 500 }
        );
      }

      const existingTypes =
        webhookGroupsMap.get(webhookUrl) || [];

      existingTypes.push(analysisType);
      webhookGroupsMap.set(webhookUrl, existingTypes);
    }

    const webhookGroups: WebhookGroup[] = Array.from(
      webhookGroupsMap.entries()
    ).map(([url, types]) => ({
      url,
      analysisTypes: types,
    }));

    console.log("INSIGHT Analysis Routing:", {
      selectedTypes: analysisTypes,
      webhookGroupsCount: webhookGroups.length,
    });

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

    // 6. Create one analysis job for the customer's request
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

      // 10. Send the request to the correct n8n webhook(s)
      webhookDispatchStarted = true;

      const webhookResults = await Promise.allSettled(
        webhookGroups.map(async (group) => {
          const response = await fetch(group.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-insight-secret": webhookSecret,
            },
            body: JSON.stringify({
              event: "analysis.requested",

              // Shared job ID for all selected analysis types
              job_id: job.id,
              user_id: user.id,
              user_email: user.email,
              plan,

              // Only the types assigned to this webhook
              analysis_types: group.analysisTypes,

              // Also provide a single type when only one is assigned
              analysis_type:
                group.analysisTypes.length === 1
                  ? group.analysisTypes[0]
                  : null,

              instructions,
              files: filesForN8n,
            }),
            cache: "no-store",
            signal: AbortSignal.timeout(20000),
          });

          if (!response.ok) {
            throw new Error(
              `Webhook returned HTTP ${response.status} for: ${group.analysisTypes.join(", ")}`
            );
          }

          return {
            analysis_types: group.analysisTypes,
            success: true,
          };
        })
      );

      const failedWebhooks = webhookResults
        .filter(
          (
            result
          ): result is PromiseRejectedResult =>
            result.status === "rejected"
        )
        .map((result) =>
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown webhook error"
        );

      if (failedWebhooks.length > 0) {
        console.error("Some analysis webhooks failed:", {
          job_id: job.id,
          errors: failedWebhooks,
        });

        // Keep the job and uploaded files for troubleshooting.
        // Another webhook may already have accepted this job.
        return NextResponse.json(
          {
            success: false,
            partial_failure: true,
            job_id: job.id,
            error:
              "Some analysis workflows could not be started. Your request has been saved for review.",
          },
          { status: 502 }
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
          webhooks_count: webhookGroups.length,
        },
        { status: 202 }
      );
    } catch (processingError) {
      // Roll back uploads and job only if webhook dispatch has not started.
      // Once dispatch starts, another workflow may already have accepted the job.
      if (!webhookDispatchStarted) {
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
      }

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
