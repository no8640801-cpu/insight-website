
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = new URL("/dashboard/analysis", request.url);

  if (!user) {
    redirectTo.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(redirectTo, 303);
  }

  // Only a pending request belonging to this user can be cancelled.
  const { data, error } = await supabase
    .from("analysis_jobs")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectTo.searchParams.set("error", "cancel_failed");
    return NextResponse.redirect(redirectTo, 303);
  }

  redirectTo.searchParams.set("cancelled", "1");
  return NextResponse.redirect(redirectTo, 303);
}
