
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// n8n workflow: WF_Payments_Stripe_Supabase_Secure
const CHECKOUT_WEBHOOK_URL =
  process.env.N8N_CHECKOUT_WEBHOOK_URL?.trim() ||
  "https://depiproject.app.n8n.cloud/webhook/create-checkout";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get the signed-in user from the server session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Please sign in before upgrading your plan." },
      { status: 401 }
    );
  }

  // Do not charge accounts that are already Pro
  const { data: accountPlan } = await supabase
    .from("account_plans")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountPlan?.plan === "pro") {
    return NextResponse.json(
      { error: "Your account is already on the Pro plan." },
      { status: 409 }
    );
  }

  try {
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET?.trim();

    // These URLs bring the customer back to the upgrade page
    const successUrl = new URL("/upgrade?payment=success", request.url).toString();
    const cancelUrl = new URL("/upgrade?payment=canceled", request.url).toString();

    const response = await fetch(CHECKOUT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { "x-insight-secret": webhookSecret } : {}),
      },
      body: JSON.stringify({
        user_id: user.id,
        user_email: user.email,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`Payment service returned HTTP ${response.status}.`);
    }

    const data = await response.json();
    const checkoutUrl: unknown = data?.checkout_url;

    if (
      typeof checkoutUrl !== "string" ||
      !checkoutUrl.startsWith("https://checkout.stripe.com/")
    ) {
      throw new Error("The payment service did not return a valid checkout link.");
    }

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (error) {
    console.error("Checkout creation error:", error);

    return NextResponse.json(
      {
        error:
          "We could not start the payment. Please try again in a moment.",
      },
      { status: 502 }
    );
  }
}
