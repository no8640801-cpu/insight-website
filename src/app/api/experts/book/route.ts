import { NextResponse } from "next/server";
import { SERVICES, getExpert } from "@/lib/experts";
import {
  BOOKING_WINDOW_DAYS,
  HOUR_MS,
  SLOT_TIMES,
  cairoWallToDate,
  isDateString,
  weekdayOf,
} from "@/lib/expert-time";
import {
  authorizeProUser,
  getBookingBase,
  notConfigured,
} from "@/lib/expert-api";

// n8n checks the calendar, creates the event and sends the emails
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await authorizeProUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const expert = getExpert(String(body.expert || ""));
  const date = body.date;
  const time = String(body.time || "");
  const service = String(body.service || "");

  if (!expert || !expert.bookable) {
    return NextResponse.json(
      { error: "This expert is not available for booking." },
      { status: 400 }
    );
  }

  if (
    !isDateString(date) ||
    !(SLOT_TIMES as readonly string[]).includes(time) ||
    !(SERVICES as readonly string[]).includes(service)
  ) {
    return NextResponse.json(
      { error: "Please choose a valid date, time and service." },
      { status: 400 }
    );
  }

  const weekday = weekdayOf(date);
  if (weekday === 5 || weekday === 6) {
    return NextResponse.json(
      { error: "Experts are not available on Fridays and Saturdays." },
      { status: 400 }
    );
  }

  const start = cairoWallToDate(date, time);
  const end = new Date(start.getTime() + HOUR_MS);
  const now = Date.now();

  if (start.getTime() < now + HOUR_MS) {
    return NextResponse.json(
      { error: "Meetings must be booked at least 1 hour in advance." },
      { status: 400 }
    );
  }

  if (start.getTime() > now + (BOOKING_WINDOW_DAYS + 1) * 24 * HOUR_MS) {
    return NextResponse.json(
      { error: `You can book up to ${BOOKING_WINDOW_DAYS} days ahead.` },
      { status: 400 }
    );
  }

  // Optional: link the meeting to one of the customer's own analyses
  let jobId: string | null = null;
  if (body.jobId && service === "Analysis Review") {
    const { data: job } = await supabase
      .from("analysis_jobs")
      .select("id")
      .eq("id", String(body.jobId))
      .eq("user_id", user.id)
      .maybeSingle();

    if (!job) {
      return NextResponse.json(
        { error: "The selected analysis was not found." },
        { status: 400 }
      );
    }
    jobId = job.id;
  }

  // The customer cannot be in two meetings at the same time
  const { data: overlapping } = await supabase
    .from("expert_bookings")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "booked")
    .lt("start_at", end.toISOString())
    .gt("end_at", start.toISOString())
    .limit(1);

  if (overlapping && overlapping.length > 0) {
    return NextResponse.json(
      { error: "You already have a meeting booked at this time." },
      { status: 409 }
    );
  }

  const base = getBookingBase();
  if (!base) return notConfigured();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const customerName =
    profile?.full_name || user.email?.split("@")[0] || "Customer";

  try {
    const response = await fetch(`${base}/webhook/expert-book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customerName,
        email: user.email,
        service,
        staff: expert.workflowName,
        date,
        time,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(40000),
    });

    if (!response.ok) {
      throw new Error(`Booking service returned HTTP ${response.status}.`);
    }

    const result: Record<string, unknown> = await response.json();

    if (result.status === "unavailable") {
      return NextResponse.json(
        {
          error:
            typeof result.message === "string"
              ? result.message
              : "This time is no longer available. Please choose another one.",
        },
        { status: 409 }
      );
    }

    if (result.status !== "booked") {
      return NextResponse.json(
        {
          error:
            typeof result.message === "string"
              ? result.message
              : "The booking could not be completed.",
        },
        { status: 400 }
      );
    }

    const eventId =
      typeof result.event_id === "string" && result.event_id.length > 0
        ? result.event_id
        : null;

    const { data: saved, error: saveError } = await supabase
      .from("expert_bookings")
      .insert({
        user_id: user.id,
        expert_slug: expert.slug,
        expert_name: expert.name,
        service,
        job_id: jobId,
        event_id: eventId,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: "booked",
      })
      .select("id")
      .single();

    if (saveError) {
      // The meeting exists in the calendar and the customer got the email
      console.error("Could not save expert booking:", saveError);
    }

    return NextResponse.json({
      booked: true,
      id: saved?.id ?? null,
      start_at: start.toISOString(),
      can_cancel_in_app: Boolean(eventId && saved),
    });
  } catch (error) {
    console.error("Expert booking error:", error);

    return NextResponse.json(
      { error: "We could not complete the booking. Please try again." },
      { status: 502 }
    );
  }
}
