import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AuthOk = {
  ok: true;
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string | null };
};
type AuthFail = { ok: false; response: NextResponse };

/** Only signed-in Pro accounts may use the experts feature */
export async function authorizeProUser(): Promise<AuthOk | AuthFail> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      ),
    };
  }

  const { data: accountPlan } = await supabase
    .from("account_plans")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountPlan?.plan !== "pro") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Analysis Experts are available on the Pro plan only." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, supabase, user };
}

/**
 * Base URL of the n8n instance that hosts the INSIGHT workflows.
 * Uses N8N_BOOKING_BASE_URL when set, otherwise the same n8n instance as the
 * analysis webhook (N8N_WEBHOOK_URL), so no extra configuration is needed.
 */
export function getBookingBase() {
  const explicit = process.env.N8N_BOOKING_BASE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;

  const analysisUrl = process.env.N8N_WEBHOOK_URL?.trim();
  if (analysisUrl) {
    try {
      return new URL(analysisUrl).origin;
    } catch {
      return null;
    }
  }

  return null;
}

export function notConfigured() {
  return NextResponse.json(
    { error: "Booking is not configured yet. Please contact support." },
    { status: 500 }
  );
}
