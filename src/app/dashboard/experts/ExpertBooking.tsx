"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import { SERVICES } from "@/lib/experts";

type Slot = { time: string; available: boolean };
type DayStatus = "free" | "partial" | "busy" | "off" | "closed";
type Day = { date: string; status: DayStatus; reason?: string; slots: Slot[] };

type Props = {
  expertSlug: string;
  expertName: string;
  jobs: { id: string; title: string | null }[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

const STATUS_LABEL: Record<DayStatus, string> = {
  free: "Free",
  partial: "Few slots",
  busy: "Busy",
  off: "Off",
  closed: "Closed",
};

export default function ExpertBooking({ expertSlug, expertName, jobs }: Props) {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [month, setMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const [service, setService] = useState<string>(SERVICES[0]);
  const [jobId, setJobId] = useState("");

  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [bookedAt, setBookedAt] = useState<{
    date: string;
    time: string;
    inApp: boolean;
  } | null>(null);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch(
        `/api/experts/availability?expert=${encodeURIComponent(expertSlug)}`,
        { cache: "no-store" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load the schedule.");
      }

      const loaded: Day[] = data.days;
      setDays(loaded);
      setMonth((current) => current || loaded[0]?.date.slice(0, 7) || "");
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not load the schedule."
      );
    } finally {
      setLoading(false);
    }
  }, [expertSlug]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const dayMap = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days]
  );
  const months = useMemo(
    () => Array.from(new Set(days.map((day) => day.date.slice(0, 7)))),
    [days]
  );
  const monthIndex = months.indexOf(month);

  const cells = useMemo(() => {
    if (!month) return [];
    const [y, m] = month.split("-").map(Number);
    const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const result: (string | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= total; d++) {
      result.push(`${month}-${String(d).padStart(2, "0")}`);
    }
    return result;
  }, [month]);

  const selectedDay = selectedDate ? dayMap.get(selectedDate) : undefined;

  function pickDay(date: string) {
    setSelectedDate(date);
    setSelectedTime("");
    setBookError("");
    setBookedAt(null);
  }

  async function handleBook() {
    if (!selectedDate || !selectedTime) return;

    setBooking(true);
    setBookError("");

    try {
      const response = await fetch("/api/experts/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expert: expertSlug,
          date: selectedDate,
          time: selectedTime,
          service,
          jobId: service === "Analysis Review" && jobId ? jobId : undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setBookError(data.error || "The booking could not be completed.");
        // The slot may have been taken meanwhile: refresh the calendar
        if (response.status === 409) {
          setSelectedTime("");
          loadAvailability();
        }
        return;
      }

      setBookedAt({
        date: selectedDate,
        time: selectedTime,
        inApp: Boolean(data.can_cancel_in_app),
      });
      setSelectedTime("");
      loadAvailability();
    } catch {
      setBookError("Something went wrong. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  if (loading && days.length === 0) {
    return (
      <div className="expert-loading">
        <Loader2 size={20} className="plan-spinner" />
        Loading {expertName}&apos;s schedule...
      </div>
    );
  }

  if (loadError && days.length === 0) {
    return (
      <div className="plan-feedback error">
        <AlertCircle size={15} />
        {loadError}
      </div>
    );
  }

  return (
    <div className="expert-booking">
      {bookedAt && (
        <div className="upgrade-banner success">
          <CalendarCheck size={19} />
          <div>
            <strong>Your meeting is booked!</strong>
            <p>
              {formatLongDate(bookedAt.date)} at {formatTime(bookedAt.time)}{" "}
              (Cairo time) with {expertName}. A confirmation email is on its
              way. You can cancel up to 1 hour before the meeting
              {bookedAt.inApp
                ? " from the My Bookings section."
                : " using the link in that email."}
            </p>
            <Link href="/dashboard/experts">View My Bookings →</Link>
          </div>
        </div>
      )}

      <div className="expert-calendar-wrap">
        <div className="expert-calendar">
          <div className="expert-calendar-head">
            <button
              type="button"
              onClick={() => setMonth(months[monthIndex - 1])}
              disabled={monthIndex <= 0}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <strong>{month && monthLabel(month)}</strong>
            <button
              type="button"
              onClick={() => setMonth(months[monthIndex + 1])}
              disabled={monthIndex < 0 || monthIndex >= months.length - 1}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="expert-calendar-grid">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="expert-weekday">
                {weekday}
              </span>
            ))}

            {cells.map((date, index) => {
              if (!date) return <span key={`e${index}`} />;

              const day = dayMap.get(date);
              const status: DayStatus | "none" = day?.status ?? "none";
              const selectable = status === "free" || status === "partial";

              return (
                <button
                  key={date}
                  type="button"
                  disabled={!selectable}
                  onClick={() => pickDay(date)}
                  title={
                    day
                      ? `${STATUS_LABEL[day.status]}${day.reason ? ` — ${day.reason}` : ""}`
                      : ""
                  }
                  className={`expert-day ${status} ${
                    selectedDate === date ? "selected" : ""
                  }`}
                >
                  <span>{Number(date.slice(8))}</span>
                  {day && <small>{STATUS_LABEL[day.status]}</small>}
                </button>
              );
            })}
          </div>

          <div className="expert-legend">
            <span className="free">Free</span>
            <span className="partial">Few slots</span>
            <span className="busy">Busy</span>
            <span className="off">Off / holiday</span>
          </div>
        </div>

        <div className="expert-slots-panel">
          {!selectedDay ? (
            <p className="expert-hint">
              Select a free day on the calendar to see {expertName}&apos;s
              available times.
            </p>
          ) : (
            <>
              <h3>{formatLongDate(selectedDay.date)}</h3>
              <p className="expert-hint">
                <Clock size={13} /> 1-hour meetings · Cairo time
              </p>

              <div className="expert-slots">
                {selectedDay.slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => {
                      setSelectedTime(slot.time);
                      setBookError("");
                      setBookedAt(null);
                    }}
                    className={`expert-slot ${
                      selectedTime === slot.time ? "selected" : ""
                    }`}
                  >
                    {formatTime(slot.time)}
                    {!slot.available && <small>Busy</small>}
                  </button>
                ))}
              </div>

              {selectedTime && (
                <div className="expert-confirm">
                  <label>
                    Service
                    <select
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                    >
                      {SERVICES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  {service === "Analysis Review" && jobs.length > 0 && (
                    <label>
                      Analysis to review (optional)
                      <select
                        value={jobId}
                        onChange={(e) => setJobId(e.target.value)}
                      >
                        <option value="">— None —</option>
                        {jobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.title || "Untitled analysis"}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <button
                    type="button"
                    className="plan-upgrade-button upgrade-pay-button"
                    onClick={handleBook}
                    disabled={booking}
                  >
                    {booking ? (
                      <>
                        <Loader2 size={17} className="plan-spinner" />
                        Booking your meeting...
                      </>
                    ) : (
                      <>
                        <CalendarCheck size={16} />
                        Confirm {formatTime(selectedTime)}
                      </>
                    )}
                  </button>

                  <p className="expert-hint">
                    You can cancel up to 1 hour before the meeting.
                  </p>
                </div>
              )}

              {bookError && (
                <div className="plan-feedback error">
                  <AlertCircle size={15} />
                  {bookError}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
