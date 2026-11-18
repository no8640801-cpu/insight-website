import { NextResponse } from "next/server";
import { HOUR_MS } from "@/lib/expert-time";
import {
  authorizeProUser,
  getBookingBase,
  notConfigured,
} from "@/lib/expert-api";

export const maxDuration = 30;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeProUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id } = await params;

  const { data: booking } = await supabase
    .from("expert_bookings")
    .select("id, event_id, start_at, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (booking.status !== "booked") {
    return NextResponse.json(
      { error: "This booking is already cancelled." },
      { status: 409 }
    );
  }

  // Rule: cancellation is allowed until 1 hour before the meeting
  if (new Date(booking.start_at).getTime() - Date.now() < HOUR_MS) {
    return NextResponse.json(
      {
        error:
          "Cancellation is only available up to 1 hour before the meeting.",
      },
      { status: 400 }
    );
  }

  if (!booking.event_id) {
    return NextResponse.json(
      {
        error:
          "Please use the cancellation link in your confirmation email for this booking.",
      },
      { status: 400 }
    );
  }

  const base = getBookingBase();
  if (!base) return notConfigured();

  try {
    // The workflow deletes the calendar event and emails the customer + expert.
    // It enforces the 1-hour rule again on its side.
    const response = await fetch(
      `${base}/webhook/expert-cancel?format=json&id=${encodeURIComponent(booking.event_id)}`,
      { cache: "no-store", signal: AbortSignal.timeout(25000) }
    );

    if (!response.ok) {
      throw new Error(`Cancel workflow returned HTTP ${response.status}.`);
    }

    const result = await response.json();

    if (result?.status === "too_late") {
      return NextResponse.json(
        {
          error:
            "Cancellation is only available up to 1 hour before the meeting.",
        },
        { status: 400 }
      );
    }

    // Cancelled now, or the event no longer exists in the calendar
    if (result?.status !== "cancelled" && result?.status !== "not_found") {
      throw new Error("Unexpected response from the cancel workflow.");
    }

    await supabase
      .from("expert_bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", booking.id)
      .eq("user_id", user.id);

    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error("Expert booking cancel error:", error);

    return NextResponse.json(
      { error: "We could not cancel the booking. Please try again." },
      { status: 502 }
    );
  }
}
