"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarClock, Loader2 } from "lucide-react";

type Booking = {
  id: string;
  expert_name: string;
  service: string;
  start_at: string;
  status: string;
  event_id: string | null;
};

const HOUR_MS = 60 * 60 * 1000;

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MyBookings({
  bookings,
  serverNow,
}: {
  bookings: Booking[];
  serverNow: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(serverNow);

  // Keep the "cancellation closes 1 hour before" state fresh while the page is open
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const upcoming = bookings.filter(
    (b) => b.status === "booked" && new Date(b.start_at).getTime() > now
  );
  const history = bookings.filter((b) => !upcoming.includes(b));

  async function handleCancel(booking: Booking) {
    if (!window.confirm("Cancel this meeting?")) return;

    setBusyId(booking.id);
    setError("");

    try {
      const response = await fetch(
        `/api/experts/bookings/${booking.id}/cancel`,
        { method: "POST" }
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not cancel the booking.");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusyId("");
    }
  }

  if (bookings.length === 0) {
    return (
      <p className="expert-hint">
        You have no meetings yet. Choose an expert above to book one.
      </p>
    );
  }

  return (
    <div className="expert-bookings">
      {error && (
        <div className="plan-feedback error">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {upcoming.map((booking) => {
        const msLeft = new Date(booking.start_at).getTime() - now;
        const tooLate = msLeft < HOUR_MS;

        return (
          <div key={booking.id} className="expert-booking-row">
            <div className="expert-booking-info">
              <CalendarClock size={18} />
              <div>
                <strong>{booking.expert_name}</strong>
                <span>
                  {booking.service} · {formatWhen(booking.start_at)} (Cairo)
                </span>
              </div>
            </div>

            <div className="expert-booking-actions">
              {tooLate ? (
                <small>Cancellation closed (under 1 hour left)</small>
              ) : !booking.event_id ? (
                <small>Cancel from your confirmation email</small>
              ) : (
                <button
                  type="button"
                  className="expert-cancel-button"
                  disabled={busyId === booking.id}
                  onClick={() => handleCancel(booking)}
                >
                  {busyId === booking.id ? (
                    <Loader2 size={14} className="plan-spinner" />
                  ) : (
                    "Cancel"
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {history.length > 0 && (
        <>
          <h4 className="expert-history-title">Past &amp; cancelled</h4>
          {history.map((booking) => (
            <div key={booking.id} className="expert-booking-row muted">
              <div className="expert-booking-info">
                <CalendarClock size={18} />
                <div>
                  <strong>{booking.expert_name}</strong>
                  <span>
                    {booking.service} · {formatWhen(booking.start_at)}
                  </span>
                </div>
              </div>
              <div className="expert-booking-actions">
                <small>
                  {booking.status === "cancelled" ? "Cancelled" : "Completed"}
                </small>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
