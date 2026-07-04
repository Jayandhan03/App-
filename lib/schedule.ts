/**
 * Timezone-aware "next run" computation, shared by the agent create/edit
 * API routes. Lets a user say "every day at 9am" (in their own timezone,
 * with DST handled correctly) instead of just a rough interval.
 */

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Fallback zones for browsers without Intl.supportedValuesOf("timeZone") (e.g. older Safari).
const COMMON_ZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "Africa/Cairo", "Africa/Johannesburg", "Asia/Dubai", "Asia/Kolkata", "Asia/Dhaka",
  "Asia/Bangkok", "Asia/Shanghai", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney",
  "Pacific/Auckland",
];

/** The browser's current IANA timezone, e.g. "Asia/Kolkata" — falls back to "UTC". */
export function detectTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}

/** Every IANA zone the runtime knows about, or a curated common-zone fallback. */
export function listTimezones(): string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone");
    return supported?.length ? supported : COMMON_ZONES;
  } catch { return COMMON_ZONES; }
}

export type ScheduleInput = {
  frequency: string;
  intervalMinutes: number;
  times: string[]; // "HH:MM", 24-hour, wall-clock in `timezone`
  weekday: number | null; // 0=Sun..6=Sat — only meaningful for "Weekly digest"
  timezone: string; // IANA zone, e.g. "Asia/Kolkata"
};

const WD_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Convert a wall-clock Y/M/D H:M in an IANA timezone to the correct UTC instant (DST-safe). */
function zonedWallTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string): Date {
  const utcGuess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(utcGuess)) if (p.type !== "literal") parts[p.type] = p.value;
  const hour24 = parts.hour === "24" ? 0 : Number(parts.hour);
  const asIfUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour24, Number(parts.minute), Number(parts.second));
  const driftMs = asIfUtc - utcGuess.getTime();
  return new Date(utcGuess.getTime() - driftMs);
}

/** Break a UTC instant into the Y/M/D and weekday it represents inside an IANA timezone. */
function zonedParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) if (p.type !== "literal") parts[p.type] = p.value;
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), weekdayShort: parts.weekday };
}

/**
 * Compute the next UTC instant this schedule should fire, given "now".
 * Real-time/Hourly are plain intervals; the clock-time cadences (Daily brief,
 * Twice daily, Weekly digest) walk forward day-by-day (in the agent's own
 * timezone) looking for the next upcoming time-of-day match.
 */
export function computeNextRunAt(schedule: ScheduleInput, now: Date = new Date()): Date {
  if (schedule.frequency === "Real-time" || schedule.frequency === "Hourly") {
    const minutes = Math.max(1, schedule.intervalMinutes || 60);
    return new Date(now.getTime() + minutes * 60_000);
  }

  const tz = schedule.timezone || "UTC";
  const times = schedule.times?.length ? schedule.times : ["09:00"];
  const candidates: Date[] = [];

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const probe = new Date(now.getTime() + dayOffset * 86_400_000);
    const { year, month, day, weekdayShort } = zonedParts(probe, tz);
    if (schedule.weekday != null && WD_INDEX[weekdayShort] !== schedule.weekday) continue;

    for (const t of times) {
      const [hh, mm] = t.split(":").map(Number);
      const candidate = zonedWallTimeToUtc(year, month, day, hh || 0, mm || 0, tz);
      if (candidate.getTime() > now.getTime()) candidates.push(candidate);
    }
  }

  if (!candidates.length) return new Date(now.getTime() + 24 * 60 * 60_000);
  return candidates.reduce((min, d) => (d < min ? d : min));
}

/**
 * Format a "HH:MM" wall-clock time as it actually reads in `timeZone` — e.g.
 * "8:00 AM GMT+5:30" — regardless of the browser's own current timezone.
 * (Previously this used `toLocaleTimeString(undefined, ...)`, which silently
 * formats in whatever zone the browser happens to be in, ignoring the
 * schedule's actual saved timezone — misleading once a user can pick a
 * timezone different from their current device's.)
 */
export function formatTimeInZone(t: string, timeZone: string, refDate: Date = new Date()): string {
  const [hh, mm] = t.split(":").map(Number);
  const { year, month, day } = zonedParts(refDate, timeZone);
  const instant = zonedWallTimeToUtc(year, month, day, hh || 0, mm || 0, timeZone);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone }).format(instant);
}

/** A short human label for an IANA zone, e.g. "Asia/Kolkata (GMT+5:30)". */
export function timezoneLabel(timeZone: string, refDate: Date = new Date()): string {
  let offset = "";
  try {
    offset = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(refDate)
      .find(p => p.type === "timeZoneName")?.value ?? "";
  } catch { /* leave offset blank if the zone is somehow invalid */ }
  return `${timeZone.replace(/_/g, " ")}${offset ? ` (${offset})` : ""}`;
}

/** "Today at 8:00 AM (in 3h 12m)" — a concrete, unambiguous next-delivery preview. */
export function describeNextRun(next: Date, timeZone: string, now: Date = new Date()): string {
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone }).format(next);
  const nextParts = zonedParts(next, timeZone);
  const todayParts = zonedParts(now, timeZone);
  const tomorrowParts = zonedParts(new Date(now.getTime() + 86_400_000), timeZone);

  const sameDay = (a: typeof nextParts, b: typeof nextParts) => a.year === b.year && a.month === b.month && a.day === b.day;
  const dayLabel = sameDay(nextParts, todayParts)
    ? "Today"
    : sameDay(nextParts, tomorrowParts)
      ? "Tomorrow"
      : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone }).format(next);

  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60_000));
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  const countdown = hrs > 0 ? `in ${hrs}h ${remMins}m` : `in ${remMins}m`;

  return `${dayLabel} at ${time} (${countdown})`;
}

/** A plain-English summary of when an agent will actually deliver, with the timezone spelled out. */
export function describeSchedule(schedule: ScheduleInput): string {
  if (schedule.frequency === "Real-time") return "You'll get a voice note as soon as something changes.";
  if (schedule.frequency === "Hourly") return "You'll get a voice note every hour.";

  const tz = schedule.timezone || "UTC";
  const fmt = (t: string) => formatTimeInZone(t, tz);

  if (schedule.frequency === "Weekly digest") {
    const day = schedule.weekday != null ? WEEKDAYS[schedule.weekday] : "Mon";
    return `You'll get a voice note every ${day} at ${fmt(schedule.times?.[0] ?? "09:00")}.`;
  }

  if (schedule.frequency === "Twice daily" && schedule.times?.length >= 2) {
    return `You'll get voice notes every day at ${fmt(schedule.times[0])} and ${fmt(schedule.times[1])}.`;
  }

  return `You'll get a voice note every day at ${fmt(schedule.times?.[0] ?? "09:00")}.`;
}
