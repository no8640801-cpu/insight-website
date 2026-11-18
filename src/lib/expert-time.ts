export const CAIRO_TZ = "Africa/Cairo";

/** Working hours in the n8n workflow: 09:00 - 15:00, one hour per meeting */
export const SLOT_TIMES = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
] as const;

export const HOUR_MS = 60 * 60 * 1000;
export const BOOKING_WINDOW_DAYS = 30;

export function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function cairoOffsetMs(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  const wallAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );

  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a Cairo wall-clock date + time (e.g. 2026-11-22 10:00) to a real instant */
export function cairoWallToDate(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm);

  let result = wallAsUtc;
  for (let i = 0; i < 2; i++) {
    result = wallAsUtc - cairoOffsetMs(new Date(result));
  }

  return new Date(result);
}

export function cairoTodayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 0 = Sunday ... 5 = Friday, 6 = Saturday */
export function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatCairoDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TZ,
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
