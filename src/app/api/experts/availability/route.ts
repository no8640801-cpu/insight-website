import { NextResponse } from "next/server";
import { getExpert } from "@/lib/experts";
import { BOOKING_WINDOW_DAYS, cairoTodayISO } from "@/lib/expert-time";
import {
  authorizeProUser,
  getBookingBase,
  notConfigured,
} from "@/lib/expert-api";

export const maxDuration = 30;

type RawDay = {
  date?: unknown;
  status?: unknown;
  reason?: unknown;
  slots?: unknown;
};

export async function GET(request: Request) {
  const auth = await authorizeProUser();
  if (!auth.ok) return auth.response;

  const slug = new URL(request.url).searchParams.get("expert") || "";
  const expert = getExpert(slug);

  if (!expert) {
    return NextResponse.json({ error: "Expert not found." }, { status: 404 });
  }

  if (!expert.bookable) {
    return NextResponse.json(
      { error: "Booking for this expert is not open yet." },
      { status: 400 }
    );
  }

  const base = getBookingBase();
  if (!base) return notConfigured();

  try {
    const response = await fetch(`${base}/webhook/expert-availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff: expert.workflowName,
        from: cairoTodayISO(),
        days: BOOKING_WINDOW_DAYS,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      throw new Error(`Availability service returned HTTP ${response.status}.`);
    }

    const data = await response.json();
    const rawDays: RawDay[] = Array.isArray(data?.days) ? data.days : [];

    // Only forward what the calendar UI needs (never raw calendar events)
    const days = rawDays
      .filter((day) => typeof day.date === "string")
      .map((day) => ({
        date: day.date as string,
        status: typeof day.status === "string" ? day.status : "busy",
        reason: typeof day.reason === "string" ? day.reason : undefined,
        slots: Array.isArray(day.slots)
          ? (day.slots as { time?: unknown; available?: unknown }[])
              .filter((slot) => typeof slot.time === "string")
              .map((slot) => ({
                time: slot.time as string,
                available: slot.available === true,
              }))
          : [],
      }));

    return NextResponse.json({ days });
  } catch (error) {
    console.error("Expert availability error:", error);

    return NextResponse.json(
      { error: "Could not load the schedule. Please try again in a moment." },
      { status: 502 }
    );
  }
}
